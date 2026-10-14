import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import import_seller_feed as feed

class FeedTests(unittest.TestCase):
    def setUp(self):
        self.row={'seller_sku':'example','brand':'Example Brand','fragrance':'Example Scent',
                  'concentration':'Eau de Parfum','size_ml':'100','image_url':'https://cdn.shopify.com/example.jpg',
                  'product_url':'https://perfumebox.com/products/example'}

    def test_permission_required_before_any_download(self):
        with tempfile.TemporaryDirectory() as directory:
            p=Path(directory)/'permission.json';p.write_text(json.dumps({'seller':'perfumebox','granted':False}))
            with patch.object(feed,'download') as downloader, self.assertRaises(ValueError):
                feed.stage('nonexistent.csv','perfumebox',p,Path(directory)/'out')
            downloader.assert_not_called()

    def test_identity_pending_and_stable_across_sellers(self):
        a=feed.product(self.row,'perfumebox');b=feed.product({**self.row,'seller_sku':'other'},'perfumebox')
        self.assertEqual(a['id'],b['id']);self.assertFalse(a['identityConfirmed'])

    def test_wrong_host_and_missing_variant_rejected(self):
        for fields in [{'size_ml':'0'},{'concentration':''},{'image_url':'https://localhost/image.jpg'},
                       {'product_url':'https://unrelated.example/product'}]:
            with self.assertRaises(ValueError):feed.product({**self.row,**fields},'perfumebox')

    def test_permission_scope_and_supplier_must_match(self):
        with tempfile.TemporaryDirectory() as directory:
            p=Path(directory)/'p.json'
            for doc in [{'seller':'perfumebox','granted':True,'scope':'shopping','evidence':'A real licensed agreement reference'},
                        {'seller':'fragrancenet','granted':True,'scope':'catalog-images','evidence':'A real licensed agreement reference'}]:
                p.write_text(json.dumps(doc))
                with self.assertRaises(ValueError):feed.permission(p,'perfumebox')

if __name__=='__main__':unittest.main()
