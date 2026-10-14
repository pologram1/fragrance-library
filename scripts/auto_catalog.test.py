"""Free automation must never send paid requests or publish unreviewed images."""
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import auto_catalog as auto

class AutomationTests(unittest.TestCase):
    def fixture(self, root):
        (root/'data').mkdir()
        (root/'data/catalog.json').write_text(json.dumps({'fragrances':[{
            'id':'obf-1234','image':'https://images.openbeautyfacts.org/front.400.jpg',
            'sourceUrl':'https://world.openbeautyfacts.org/product/1234'}]}))
        (root/'data/photos.json').write_text('{"photos":{}}')
        (root/'data/photo-review-log.json').write_text('{"candidates":[]}')

    def test_valid_photo_remains_pending_even_with_key(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory)
            self.fixture(root)
            assessment={'candidates':[{'sha256':'a'*64,'width':500,'height':600,
                                      'hardFailures':[], 'warnings':[], 'verdict':'pending'}]}
            with patch.object(auto,'ROOT',root), patch.dict(auto.os.environ,{'OPENAI_API_KEY':'unused-test-value'}), \
                 patch.object(auto,'download') as download, patch.object(auto.photos,'assess',return_value=assessment), \
                 patch.object(auto.photos,'publish') as publish, patch.object(auto,'urlopen') as network:
                result=auto.run(10,False)
                self.assertEqual(result['reviewMode'],'manual_visual_approval')
                self.assertEqual(result['aiRequests'],0)
                self.assertEqual(result['published'],0)
                self.assertEqual(download.call_count,1)
                network.assert_not_called()
                publish.assert_not_called()
                log=json.loads((root/'data/photo-review-log.json').read_text())
                self.assertEqual(log['candidates'][0]['status'],'pending_visual_review')

    def test_bad_resolution_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory)
            self.fixture(root)
            with patch.object(auto,'ROOT',root), patch.object(auto,'download'), \
                 patch.object(auto.photos,'assess',return_value={'candidates':[{'hardFailures':['Low resolution']}]}):
                auto.run(10,False)
                log=json.loads((root/'data/photo-review-log.json').read_text())
                self.assertEqual(log['candidates'][0]['status'],'rejected')

    def test_zero_limit_does_not_download(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory)
            self.fixture(root)
            with patch.object(auto,'ROOT',root), patch.object(auto,'download') as download:
                auto.run(0,False)
                download.assert_not_called()

    def test_download_rejects_non_catalog_hosts(self):
        with self.assertRaises(ValueError):
            auto.download('https://api.openai.com/v1/responses','unused','images.openbeautyfacts.org',100)

if __name__=='__main__':
    unittest.main()
