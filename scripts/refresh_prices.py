"""Refresh public USD seller prices for already reviewed, exact catalog variants.
No account data, image changes, estimated sizes, compare-at prices, or secret API keys.
"""
import concurrent.futures,datetime,json,re,sqlite3,time,urllib.parse,urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SOURCES={'perfumebox.com':('Perfume Box','discount'),'olfactoryfactoryllc.com':('Olfactory Factory LLC','discount'),'terramaterperfumes.com':('Terra Mater Perfumes','retail')}
DAY=datetime.datetime.now(datetime.timezone.utc).date().isoformat()
def size(text):
 m=re.search(r'(\d+(?:\.\d+)?)\s*ml\b',text,re.I)
 if m:return float(m[1])
 m=re.search(r'(\d+(?:\.\d+)?)\s*(?:fl\.?\s*)?oz\b',text,re.I)
 return {0.17:5,0.25:7.5,0.33:10,0.5:15,0.67:20,1:30,1.0:30,1.3:40,1.35:40,1.6:50,1.7:50,2:60,2.0:60,2.5:75,2.7:80,3:90,3.0:90,3.3:100,3.4:100,4:120,4.0:120,4.2:125,5:150,5.0:150,6.7:200,6.8:200}.get(float(m[1])) if m else None

def fetch_source(host,records):
 cache=ROOT.parent/'retailer-cache'/(('www.' if host=='olfactoryfactoryllc.com' else '')+host+'.json')
 if cache.exists() and time.time()-cache.stat().st_mtime<3600:
  return {p['handle']:p for p in json.loads(cache.read_text())}
 wanted={urllib.parse.urlparse(f['sourceUrl']).path.split('/products/')[-1].strip('/').split('/')[0] for f in records}
 found={};seen=set()
 for page in range(1,101):
  req=urllib.request.Request(f'https://{host}/products.json?limit=250&page={page}',headers={'User-Agent':'PoloStudios-FragranceLibrary/1.0','Accept':'application/json'})
  with urllib.request.urlopen(req,timeout=35) as response:products=json.load(response)['products']
  if not products:break
  signature=tuple(p['id'] for p in products)
  if signature in seen:raise ValueError('Repeated storefront page; stopping')
  seen.add(signature)
  for p in products:
   if p['handle'] in wanted:found[p['handle']]=p
  if len(found)==len(wanted):break
  time.sleep(.25)
 return found

def build_offer(f,p,host):
 parsed=urllib.parse.urlparse(f['sourceUrl']);variant=urllib.parse.parse_qs(parsed.query).get('variant',[None])[0]
 variants=[v for v in p['variants'] if str(v['id'])==variant] if variant else p['variants'] if len(p['variants'])==1 else []
 if len(variants)!=1:return None
 v=variants[0];text=p['title']+' '+v['title']
 # A different capacity or tester is never silently attached to a standard bottle.
 actual=size(v['title']) or size(p['title'])
 if actual is None or actual!=f['sizeMl']:return None
 if re.search(r'\b(tester|refill|gift set|sample|decant)\b',text,re.I):return None
 concentrations=set()
 for pattern,label in [(r'\b(extrait|extract)\b','Extrait de Parfum'),(r'\b(eau de parfum|edp)\b','Eau de Parfum'),(r'\b(eau de toilette|edt)\b','Eau de Toilette'),(r'\b(eau de cologne|edc)\b','Eau de Cologne')]:
  if re.search(pattern,text,re.I):concentrations.add(label)
 if not concentrations and re.search(r'\bparfum\b',text,re.I):concentrations.add('Parfum')
 if any(c!=f['concentration'] for c in concentrations):return None
 price=float(v['price']);assert 0<price<=100000
 assert isinstance(v['available'],bool)
 seller,kind=SOURCES[host]
 return {'seller':seller,'price':price,'currency':'USD','url':f'https://{host}/products/{p["handle"]}?variant={v["id"]}','kind':kind,'checked':DAY,'stock':v['available'],'reviewed':True,'matching':True}

def main():
 photo=json.loads((ROOT/'data/photos.json').read_text());base=json.loads((ROOT/'data/catalog.json').read_text())['fragrances']
 groups={h:[] for h in SOURCES};records=base+photo.get('additionalRecords',[])
 for f in records:
  identity=photo.get('photos',{}).get(f['id'],{}).get('review',{}).get('productIdentity',{})
  f={**f,'sizeMl':f.get('sizeMl') or identity.get('sizeMl'),'concentration':f.get('concentration') or identity.get('concentration')}
  if not f.get('sizeMl') or not f.get('concentration') or not f.get('sourceUrl'):continue
  host=urllib.parse.urlparse(f['sourceUrl']).hostname.removeprefix('www.')
  if host in groups:groups[host].append(f)
 path=ROOT/'data/prices.json';previous=json.loads(path.read_text()) if path.exists() else {'products':[]}
 old={f['catalogId']:f for f in previous.get('products',[])};products=[];reports=[]
 with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
  futures={pool.submit(fetch_source,h,fs):h for h,fs in groups.items() if fs}
  for task in concurrent.futures.as_completed(futures):
   host=futures[task]
   try:source=task.result()
   except Exception as e:
    reports.append({'host':host,'status':'unavailable','error':type(e).__name__})
    products.extend(old[f['id']] for f in groups[host] if f['id'] in old);continue
   count=0
   for f in groups[host]:
    handle=urllib.parse.urlparse(f['sourceUrl']).path.split('/products/')[-1].strip('/').split('/')[0]
    try:offer=build_offer(f,source[handle],host)
    except (KeyError,ValueError,AssertionError,TypeError):offer=None
    if offer:
     products.append({'catalogId':f['id'],'brand':f['brand'],'name':f['name'],'concentration':f['concentration'],'sizeMl':f['sizeMl'],'type':'standard','offers':[offer]});count+=1
   reports.append({'host':host,'status':'ok','exactVariants':count})
 result={'version':1,'updatedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'currency':'USD','method':'Latest price per seller; arithmetic average of all eligible reviewed sellers including official retail; seven-day freshness; excludes shipping and tax.','sources':reports,'products':sorted(products,key=lambda f:f['catalogId'])}
 if not products:raise RuntimeError('No verified prices available; keeping previous database')
 path.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
 db=sqlite3.connect(ROOT/'data/prices.sqlite')
 db.execute('CREATE TABLE IF NOT EXISTS seller_prices(catalog_id TEXT,brand TEXT,name TEXT,concentration TEXT,size_ml REAL,bottle_type TEXT,seller TEXT,price_usd REAL,url TEXT,source_kind TEXT,checked TEXT,in_stock INTEGER,PRIMARY KEY(catalog_id,seller))')
 with db:
  db.execute('DELETE FROM seller_prices')
  for f in products:
   for o in f['offers']:db.execute('INSERT INTO seller_prices VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',(f['catalogId'],f['brand'],f['name'],f['concentration'],f['sizeMl'],f['type'],o['seller'],o['price'],o['url'],o['kind'],o['checked'],int(o['stock'])))
 db.close();print(json.dumps({'pricedVariants':len(products),'sources':reports}))
if __name__=='__main__':main()
