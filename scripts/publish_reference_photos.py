"""Publish the two source originals visually checked on 2026-10-22; hashes are fixed."""
import hashlib,json
from PIL import Image
import review_enrichment_photos as review
from enrich_catalog import ROOT,CACHE

def main():
 records=json.loads((ROOT/'data/retailer-catalog.json').read_text())['fragrances'];rows=[]
 sources=[('Creed','Aventus','aventus-source.jpg','ca21936e47b5545ad54ff041e81905d9121897d33ca7f121fcc1d138ece6f26e','Jomashop','https://www.jomashop.com/creed-fragrances-cavmes33b-3-3oz.html','https://cdn2.jomashop.com/media/catalog/product/cache/b3e31d40bbb1abcc90b26106659d5d3f/c/r/creed-aventus-creed-edp-spray-33-oz-100-ml-m-3508441001114.jpg?width=800&height=800'),('Dior','Sauvage','sauvage-source.jpg','5e8261c3d215284bb7050d35907c7bf5b01c528ee44e0f315068aec714d94366','FragranceNet','https://www.fragrancenet.com/cologne/christian-dior/dior-sauvage/eau-de-parfum#308500','https://cdn.fragrancenet.com/images/photos/900x900/308500.jpg')]
 for i,(brand,name,file,digest,seller,page,url) in enumerate(sources):
  record=next(f for f in records if f['brand']==brand and f['name']==name and f['sizeMl']==100 and f['concentration']=='Eau de Parfum')
  path=CACHE/file;assert hashlib.sha256(path.read_bytes()).hexdigest()==digest
  with Image.open(path) as im:width,height=im.size
  rows.append({'reviewNumber':i+1,'id':record['id'],'product':record,'url':url,'file':str(path),'sha256':digest,'width':width,'height':height,'seller':seller,'sourceUrl':page})
 review.OUT=CACHE/'reference-photo-review';review.OUT.mkdir(exist_ok=True)
 (review.OUT/'candidates.json').write_text(json.dumps(rows))
 review.publish({1,2},'enrichment-reference-photo-review.json')
if __name__=='__main__':main()
