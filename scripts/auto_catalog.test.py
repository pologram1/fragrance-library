"""Regression tests for automated approval, refusals and bounded offline runs."""
import copy
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import auto_catalog as auto

class AutomationTests(unittest.TestCase):
    def setUp(self):
        self.record = dict(brand='Test', name='Test perfume', concentration='Eau de Parfum', sizeMl=100)
        self.review = dict(verdict='approved', confidence=.99, checks={k: True for k in auto.CHECKS},
                           identityConfirmed=True, concentration='Eau de Parfum', sizeMl=100,
                           watermark=False, identityEvidence='Visible bottle label: Test perfume, EDP, 100 mL.', notes='All criteria passed.')

    def test_safe_approval(self):
        self.assertTrue(auto.approval(self.review, self.record))

    def test_mismatch_and_uncertainty_fail_closed(self):
        for changes in [dict(sizeMl=50), dict(concentration='Parfum'), dict(confidence=.97),
                        dict(confidence=2), dict(sizeMl=True), dict(watermark=True),
                        dict(identityConfirmed=False), dict(identityEvidence=''), dict(verdict='review')]:
            with self.subTest(changes=changes):
                self.assertFalse(auto.approval({**self.review, **changes}, self.record))
        for key in auto.CHECKS:
            review = copy.deepcopy(self.review)
            review['checks'][key] = False
            self.assertFalse(auto.approval(review, self.record))

    def test_refusal_incomplete_and_malformed_never_approve(self):
        for response in [dict(status='incomplete'), dict(status='completed', output=[{'content':[{'type':'refusal'}]}]),
                         dict(status='completed', output=[{'content':[{'type':'output_text', 'text':'{}'}]}])]:
            with self.assertRaises(ValueError):
                auto.extract_review(response)

    def test_valid_response(self):
        response = {'status':'completed','output':[{'content':[{'type':'output_text','text':json.dumps(self.review)}]}]}
        self.assertEqual(auto.extract_review(response), self.review)

    def test_zero_limit_missing_key_never_calls_api_or_publishes(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root/'data').mkdir()
            (root/'data/catalog.json').write_text(json.dumps({'fragrances':[{'id':'obf-1234','image':'https://images.openbeautyfacts.org/a.jpg'}]}))
            (root/'data/photos.json').write_text('{"photos":{}}')
            (root/'data/photo-review-log.json').write_text('{"candidates":[]}')
            with patch.object(auto,'ROOT',root), patch.dict(auto.os.environ,{'OPENAI_API_KEY':''}), \
                 patch.object(auto,'review_image') as reviewer, patch.object(auto.photos,'publish') as publisher:
                result=auto.run(0,False)
                self.assertEqual(result['aiStatus'],'waiting_for_OPENAI_API_KEY')
                reviewer.assert_not_called()
                publisher.assert_not_called()

if __name__ == '__main__':
    unittest.main()
