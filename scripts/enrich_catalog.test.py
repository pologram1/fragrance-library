import unittest
import enrich_catalog as e
class Enrichment(unittest.TestCase):
 def test_notes_reject_prose_and_guesses(self):
  self.assertEqual(e.notes('<p>Top Notes: Bergamot, Pink pepper</p><p>Heart Notes: Rose, Jasmine</p>'),{'top':['Bergamot','Pink pepper'],'heart':['Rose','Jasmine']})
  self.assertEqual(e.notes('<p>Base Notes: The base might feature some musk, amber</p>'),{})
 def test_variants_do_not_mix_testers_sizes_sets_or_oils(self):
  p={'title':'Example Amber Eau de Parfum','vendor':'Example','handle':'amber','variants':[{'id':1,'title':'100ml','price':'70','available':True},{'id':2,'title':'50ml Tester','price':'40','available':True},{'id':3,'title':'Gift Set','price':'80','available':True}],'images':[]}
  rows=list(e.variants(p,'perfumebox.com'));self.assertEqual(len(rows),1);self.assertEqual(rows[0][0]['sizeMl'],100);self.assertEqual(rows[0][1]['price'],70);self.assertIn('variant=1',rows[0][1]['url'])
 def test_identity_matches_only_the_same_capacity_and_concentration(self):
  a={'brand':'Dior','name':'Sauvage','concentration':'Eau de Parfum','sizeMl':100}
  self.assertEqual(e.identity(a),e.identity({**a,'brand':'Christian Dior'}))
  self.assertNotEqual(e.identity(a),e.identity({**a,'sizeMl':60}))
  self.assertNotEqual(e.identity(a),e.identity({**a,'concentration':'Eau de Toilette'}))
if __name__=='__main__':unittest.main()
