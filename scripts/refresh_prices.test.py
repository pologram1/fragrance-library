import importlib.util,sys,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('prices',Path(__file__).with_name('refresh_prices.py'));prices=importlib.util.module_from_spec(spec);spec.loader.exec_module(prices)
class PriceImportTests(unittest.TestCase):
 def setUp(self):
  self.f={'sourceUrl':'https://perfumebox.com/products/exact?variant=123','sizeMl':100,'concentration':'Eau de Parfum'}
  self.p={'title':'Example Eau de Parfum','handle':'exact','variants':[{'id':123,'title':'3.4 oz','price':'74.95','available':True}]}
 def test_exact_variant_and_real_sale_price(self):
  self.p['variants'][0]['compare_at_price']='140.00'
  o=prices.build_offer(self.f,self.p,'perfumebox.com');self.assertEqual(o['price'],74.95);self.assertTrue(o['stock']);self.assertIn('variant=123',o['url'])
 def test_size_tester_concentration_mismatch_are_rejected(self):
  for title in ['1.7 oz','3.4 oz Tester','3.4 oz EDT']:
   self.p['variants'][0]['title']=title;self.assertIsNone(prices.build_offer(self.f,self.p,'perfumebox.com'))
 def test_no_guess_for_unknown_size_or_multiple_unlinked_variants(self):
  self.p['variants'][0]['title']='Default Title';self.assertIsNone(prices.build_offer(self.f,self.p,'perfumebox.com'))
  self.p['variants'].append(dict(self.p['variants'][0],id=124));self.f['sourceUrl']='https://perfumebox.com/products/exact';self.assertIsNone(prices.build_offer(self.f,self.p,'perfumebox.com'))
 def test_out_of_stock_is_preserved_not_invented(self):
  self.p['variants'][0]['available']=False;self.assertFalse(prices.build_offer(self.f,self.p,'perfumebox.com')['stock'])
if __name__=='__main__':unittest.main()
