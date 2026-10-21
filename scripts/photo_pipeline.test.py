"""Regression checks for approval, provenance, identity and asset integrity."""
import copy
import importlib.util
import json
import shutil
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('pipeline', HERE / 'photo_pipeline.py')
pipeline = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pipeline)


class PhotoPipelineTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        (self.root / 'data').mkdir()
        for name in ['photos.json', 'catalog.json']:
            shutil.copyfile(pipeline.ROOT / 'data' / name, self.root / 'data' / name)
        asset = 'assets/fragrances/afnan-9pm-night-out.png'
        (self.root / asset).parent.mkdir(parents=True)
        shutil.copyfile(pipeline.ROOT / asset, self.root / asset)
        self.source = self.root / 'candidate.png'
        shutil.copyfile(pipeline.ROOT / asset, self.source)
        self.report = pipeline.assess([self.source])
        item = self.report['candidates'][0]
        item.update(verdict='approved', checks={key: True for key in pipeline.POLICY['requiredVisualChecks']},
            product=dict(id='studio-afnan-9pm-night-out', brand='Afnan', name='9 PM Night Out',
                         concentration='Extrait de Parfum', sizeMl=100, identityConfirmed=True),
            source='Test fixture', usagePermission='Project reference', reviewedBy='Test reviewer',
            reviewNotes='Visual review fixture')

    def tearDown(self):
        self.temp.cleanup()

    def test_assessment_never_approves(self):
        item = pipeline.assess([self.source])['candidates'][0]
        self.assertEqual(item['verdict'], 'pending')
        self.assertEqual((item['width'], item['height']), (375, 500))
        self.assertTrue(all(value is False for value in item['checks'].values()))

    def test_publish_preserves_original_and_records_audit(self):
        before = pipeline.digest(self.source)
        pipeline.publish(self.report, root=self.root)
        manifest = json.loads((self.root / 'data/photos.json').read_text())
        photo = manifest['photos']['studio-afnan-9pm-night-out']
        self.assertEqual(pipeline.digest(self.root / photo['url']), before)
        self.assertEqual(photo['review']['sourceSha256'], before)
        self.assertEqual(photo['review']['reviewedBy'], 'Test reviewer')

    def test_reject_changed_file(self):
        with self.source.open('ab') as stream:
            stream.write(b'changed-after-review')
        with self.assertRaisesRegex(ValueError, 'changed after review'):
            pipeline.publish(self.report, root=self.root)

    def test_remote_publish_preserves_review_and_does_not_copy(self):
        item = self.report['candidates'][0]
        item['candidateImageUrl'] = 'https://cdn.shopify.com/s/files/product.png?v=123'
        pipeline.publish(self.report, root=self.root, remote=True)
        photo = json.loads((self.root / 'data/photos.json').read_text())['photos'][item['product']['id']]
        self.assertEqual(photo['url'], item['candidateImageUrl'])
        self.assertEqual(photo['review']['sourceSha256'], pipeline.digest(self.source))

    def test_remote_publish_rejects_untrusted_host(self):
        self.report['candidates'][0]['candidateImageUrl'] = 'https://example.com/product.png'
        with self.assertRaisesRegex(ValueError, 'supplier HTTPS'):
            pipeline.publish(self.report, root=self.root, remote=True)

    def test_reject_wrong_product(self):
        self.report['candidates'][0]['product']['name'] = '9 AM Dive'
        with self.assertRaisesRegex(ValueError, 'identity does not match'):
            pipeline.publish(self.report, root=self.root)

    def test_reject_wrong_variant(self):
        self.report['candidates'][0]['product']['concentration'] = 'Eau de Toilette'
        with self.assertRaisesRegex(ValueError, 'Concentration does not match'):
            pipeline.publish(self.report, root=self.root)

    def test_missing_visual_approval_blocks_publish(self):
        self.report['candidates'][0]['checks']['labelReadable'] = False
        with self.assertRaisesRegex(ValueError, 'Every visual criterion'):
            pipeline.publish(self.report, root=self.root)

    def test_missing_permission_blocks_publish(self):
        self.report['candidates'][0]['usagePermission'] = None
        with self.assertRaisesRegex(ValueError, 'usage permission'):
            pipeline.publish(self.report, root=self.root)

    def test_editorial_requires_distinct_composition_review(self):
        item = self.report['candidates'][0]
        item.update(composition='brand-editorial', sourceKind='official-brand')
        item['checks']['cleanBackground'] = False
        item['checks']['backgroundSuitable'] = True
        with self.assertRaisesRegex(ValueError, 'explicit official-brand'):
            pipeline.publish(self.report, root=self.root)
        item['editorialCompositionConfirmed'] = True
        pipeline.publish(self.report, root=self.root)
        photo = json.loads((self.root / 'data/photos.json').read_text())['photos'][item['product']['id']]
        self.assertFalse(photo['checks']['cleanBackground'])
        self.assertEqual(photo['composition'], 'brand-editorial')
        self.assertTrue(photo['review']['editorialCompositionConfirmed'])

    def test_editorial_still_requires_background_suitability(self):
        item = self.report['candidates'][0]
        item.update(composition='brand-editorial', sourceKind='official-brand', editorialCompositionConfirmed=True)
        with self.assertRaisesRegex(ValueError, 'Every visual criterion'):
            pipeline.publish(self.report, root=self.root)

    def test_duplicate_batch_is_atomic(self):
        before = (self.root / 'data/photos.json').read_bytes()
        self.report['candidates'].append(copy.deepcopy(self.report['candidates'][0]))
        with self.assertRaisesRegex(ValueError, 'duplicate product'):
            pipeline.publish(self.report, root=self.root)
        self.assertEqual((self.root / 'data/photos.json').read_bytes(), before)


if __name__ == '__main__':
    unittest.main()
