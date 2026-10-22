"""Import exact bottle variants and attributed scent notes from public retailer catalogs."""
import argparse,concurrent.futures,datetime,hashlib,html,json,re,time,unicodedata,urllib.parse,urllib.request
from pathlib import Path
from refresh_prices import size
ROOT=Path(__file__).resolve().parents[1]
CACHE=ROOT.parent/'retailer-cache'
SELLERS={'perfumebox.com':'Perfume Box','www.olfactoryfactoryllc.com':'Olfactory Factory LLC','fragflex.com':'FragFlex'}
DAY=datetime.datetime.now(datetime.timezone.utc).date().isoformat()

def fetch(url):
 req=urllib.request.Request(url,headers={'User-Agent':'PoloStudios-FragranceLibrary/1.0','Accept':'application/json,text/html'})
 with urllib.request.urlopen(req,timeout=40) as r:return r.read()

def download(host):
 CACHE.mkdir(exist_ok=True)
 target=CACHE/(host+'.json')
 if target.exists() and time.time()-target.stat().st_mtime<21600:return json.loads(target.read_text())
 products=[];seen=set()
 for page in range(1,41):
  batch=json.loads(fetch(f'https://{host}/products.json?limit=250&page={page}')).get('products',[])
  if not batch:break
  signature=tuple(p['id'] for p in batch)
  if signature in seen:break
  seen.add(signature);products.extend(batch)
  print(host,'page',page,'products',len(products),flush=True)
  time.sleep(.4)
 target.write_text(json.dumps(products))
 return products

def plain(body):
 return re.sub(r'\s+',' ',html.unescape(re.sub(r'<[^>]+>',' ',body or ''))).strip()

def concentration(text):
 for pattern,label in [(r'\b(extrait|extract)\b','Extrait de Parfum'),(r'\b(eau\s+de\s+parfum|edp)\b','Eau de Parfum'),(r'\b(eau\s+de\s+toilette|edt)\b','Eau de Toilette'),(r'\b(eau\s+de\s+cologne|edc)\b','Eau de Cologne'),(r'\bparfum\b','Parfum')]:
  if re.search(pattern,text,re.I):return label
 return None

def notes(body):
 # Extract only explicitly labeled note lists, never prose or invented pyramids.
 text=html.unescape(re.sub(r'<[^>]+>',' ',re.sub(r'</(?:p|div|li|tr|h[1-6])>|<br\s*/?>','\n',body or '',flags=re.I)));result={}
 text=re.sub(r'[^\S\n]+',' ',text)
 pattern=r'\b(top|middle|heart|base|fragrance|scent)\s+notes?\s*[:\-–]\s*([^\n]*?)(?=\b(?:top|middle|heart|base|fragrance|scent)\s+notes?\s*[:\-–]|\n|\b(?:fragrance family|gender|size|concentration|country|disclaimer|shipping|ingredients)\s*[:\-–]|$)'
 for m in re.finditer(pattern,text,re.I):
  value=m[2].split('.')[0].strip(' ;|')
  if len(value)>300 or not value:continue
  values=[v.strip(' ;:•-') for v in re.split(r',|;|\s+and\s+|\s*&\s*|\s*•\s*',value) if v.strip()]
  if not 1<=len(values)<=18 or any(len(v)>60 or len(v.split())>4 or ':' in v or re.search(r'\b(is|are|this|designed|fragrance|opens|offers|might|may|could|giving|feature|typically|often|provides|creates|adds|wrapped|harmonizes|settles|brimming|mixes|plays)\b',v,re.I) for v in values):continue
  key={'middle':'heart','fragrance':'featured','scent':'featured'}.get(m[1].lower(),m[1].lower())
  result[key]=values
 return result

def norm(value):
 return re.sub(r'[^a-z0-9]+',' ',unicodedata.normalize('NFKD',str(value)).encode('ascii','ignore').decode().lower()).strip()

def brand(value):
 value=html.unescape(value).strip()
 return {'christian dior':'Dior','parfums de marly':'Parfums de Marly','maison francis kurkdjian':'Maison Francis Kurkdjian'}.get(norm(value),value)

def clean_name(title,vendor):
 name=html.unescape(title).strip()
 if norm(name).startswith(norm(vendor)+' '):name=name[len(vendor):].strip(' -–:')
 name=re.sub(r'\b(?:eau\s+de\s+(?:parfum|toilette|cologne)|extrait\s+de\s+parfum|edp|edt|edc)\b',' ',name,flags=re.I)
 name=re.sub(r'\b(?:spray|natural spray)\b',' ',name,flags=re.I)
 name=re.sub(r'\d+(?:\.\d+)?\s*(?:(?:fl\.?\s*)?oz|ml)\b',' ',name,flags=re.I)
 name=re.sub(r'^\s*(?:men[’\x27]s|women[’\x27]s|unisex)\s+','',name,flags=re.I)
 name=re.sub(r'\s+for (?:man/woman|man|woman)\s*$','',name,flags=re.I)
 return re.sub(r'\s+',' ',name).strip(' -–:/')

def identity(f):
 return '|'.join([norm(brand(f['brand'])),norm(clean_name(f['name'],f['brand'])),norm(f['concentration']),str(float(f.get('sizeMl') or f.get('size'))),'standard'])

def identity_conflict(f):
 name=norm(f['name']);house=norm(f['brand']);conc=f['concentration']
 if house=='amouage' and re.search(r'\b(?:dia 40|reflection 45|guidance 46|purpose 50)\b',name) and conc!='Extrait de Parfum':return True
 if house=='afnan' and re.search(r'\b9\s*pm elixir\b',name) and conc!='Parfum':return True
 if house in ['afnan','zimaya'] and re.search(r'\bsharaf (?:divine|the club)\b',name) and conc!='Extrait de Parfum':return True
 return False

def variants(p,host):
 vendor=brand(p.get('vendor',''));title=plain(p['title']);name=clean_name(title,p.get('vendor',''))
 if not vendor or not name or len(name)>100 or len(vendor)>100:return
 for v in p.get('variants',[]):
  text=title+' '+v['title']
  if re.search(r'\b(tester|refill|gift\s*set|sample|decant|deodorant|shower|lotion|cream|oil|candle|diffuser|body mist|travel set)\b',text,re.I):continue
  ml=size(v['title']) or size(title);conc=concentration(text) or concentration(p.get('product_type',''))
  if not ml or not conc or not 15<=ml<=500:continue
  price=float(v.get('price') or 0)
  if not 2<=price<1500 or not isinstance(v.get('available'),bool):continue
  url=f'https://{host}/products/{p["handle"]}?variant={v["id"]}'
  record={'brand':vendor,'name':name,'concentration':conc,'sizeMl':ml,'quantity':str(ml)+' mL','sourceUrl':url,'reviewStatus':'Exact retailer variant: stated concentration and capacity'}
  offer={'seller':SELLERS[host],'price':price,'currency':'USD','url':url,'kind':'discount','checked':DAY,'stock':v['available'],'reviewed':True,'matching':True}
  image=next((i for i in p.get('images',[]) if v['id'] in i.get('variant_ids',[])),None)
  # Generic product photos are candidates only, never auto-approved for a new size.
  image=image or next(iter(p.get('images',[])),None)
  yield record,offer,notes(p.get('body_html','')),image

def build():
 photo=json.loads((ROOT/'data/photos.json').read_text());base=json.loads((ROOT/'data/catalog.json').read_text())['fragrances']
 known=[]
 for f in base+photo.get('additionalRecords',[]):
  pi=photo.get('photos',{}).get(f['id'],{}).get('review',{}).get('productIdentity',{})
  f={**f,'sizeMl':f.get('sizeMl') or pi.get('sizeMl'),'concentration':f.get('concentration') or pi.get('concentration')}
  if f.get('sizeMl') and f.get('concentration'):known.append(f)
 previous_path=ROOT/'data/retailer-catalog.json';previous=[]
 if previous_path.exists():previous=[f for f in json.loads(previous_path.read_text()).get('fragrances',[]) if not identity_conflict(f)];known+=previous
 bykey={identity(f):f for f in known};new={identity(f):f for f in previous};offers={};profiles={};images=[];source_counts={}
 rows=[]
 for host in SELLERS:
  path=CACHE/(host+'.json')
  if not path.exists() or time.time()-path.stat().st_mtime>=21600:continue
  products=json.loads(path.read_text());source_counts[host]=len(products)
  for p in products:
   rows.extend((host,*row) for row in variants(p,host))
 for filename in ['fragrancenet-observations.json','jomashop-observations.json']:
  path=ROOT/'data'/filename
  if not path.exists():continue
  extra=json.loads(path.read_text()).get('products',[]);source_counts[filename]=len(extra)
  for entry in extra:
   offer=entry['offer'];host=urllib.parse.urlparse(offer['url']).hostname;record={k:v for k,v in entry.items() if k!='offer'}
   rows.append((host,record,offer,entry.get('notes',{}),None))
 # Retain a failed source's last observation with its original date; never re-stamp stale cached quotes.
 old_prices=ROOT/'data/retailer-prices.json'
 if old_prices.exists():
  for p in json.loads(old_prices.read_text()).get('products',[]):
   retained=[o for o in p['offers'] if urllib.parse.urlparse(o['url']).hostname in SELLERS and urllib.parse.urlparse(o['url']).hostname not in source_counts]
   if retained and not identity_conflict(p):offers[identity(p)]={**p,'offers':retained}
 # Match existing bottles first, then prioritize available bottles with explicitly listed notes.
 rows.sort(key=lambda row:(identity(row[1]) not in bykey,not row[2]['stock'],not bool(row[3]),row[1]['brand'],row[1]['name']))
 for host,f,offer,note,image in rows:
  if identity_conflict(f):continue
  key=identity(f);record=bykey.get(key)
  if record is None:
   if not offer['stock'] or len(new)>=6000 and host in SELLERS:continue
   record={**f,'id':'studio-enriched-'+hashlib.sha256(key.encode()).hexdigest()[:24]};bykey[key]=record;new[key]=record
  # Existing supplemental records remain in their own catalog on every refresh.
  elif record['id'].startswith('studio-enriched-'):new[key]=record
  pricekey=identity(record)
  entry=offers.setdefault(pricekey,{'catalogId':record['id'],**{k:record[k] for k in ['brand','name','concentration','sizeMl']},'type':'standard','offers':[]})
  if not any(urllib.parse.urlparse(o['url']).hostname==urllib.parse.urlparse(offer['url']).hostname for o in entry['offers']):entry['offers'].append(offer)
  if note and record['id'] not in profiles:
   profiles[record['id']]={'id':'notes-'+record['id'],'catalogIds':[record['id']],'brand':record['brand'],'name':record['name'],'concentration':record['concentration'],'notes':note,'summary':f'{record["name"]} by {record["brand"]}. Explore the retailer’s listed scent notes and compare this exact bottle.','story':'The note lists below are attributed to the linked retailer. A verified launch history has not been added for this fragrance.','launchYear':None,'creator':None,'sources':[{'label':SELLERS.get(host,offer['seller'])+' · Fragrance notes','url':offer['url'],'checked':DAY}]}
  if image and record['id'] not in photo['photos']:
   images.append({'id':record['id'],'product':record,'url':image['src'],'width':image.get('width'),'height':image.get('height'),'seller':SELLERS[host],'sourceUrl':offer['url'],'variantImage':bool(image.get('variant_ids'))})
 meta={'updatedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'sources':source_counts,'newVariants':len(new),'pricedVariants':len(offers),'multipleSellers':sum(len(p['offers'])>1 for p in offers.values()),'noteProfiles':len(profiles),'policy':'Exact stated size and concentration. In-stock USD prices; no compare-at prices, coupon assumptions, gift sets, testers or decants. Photo candidates require visual review.'}
 for filename,data in [('retailer-catalog.json',{'metadata':meta,'fragrances':list(new.values())}),('retailer-prices.json',{'version':1,'updatedAt':meta['updatedAt'],'products':list(offers.values())}),('retailer-profiles.json',{'version':1,'profiles':list(profiles.values())}),('enrichment-report.json',meta)]:
  (ROOT/'data'/filename).write_text(json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n')
 (CACHE/'image-candidates.json').write_text(json.dumps(images,ensure_ascii=False))
 print(json.dumps(meta),flush=True)

def main():
 reports=[]
 with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
  futures={pool.submit(download,h):h for h in SELLERS}
  for future in concurrent.futures.as_completed(futures):
   host=futures[future]
   try:products=future.result();reports.append({'host':host,'status':'ok','products':len(products)})
   except Exception as e:reports.append({'host':host,'status':'unavailable','error':type(e).__name__})
 print(json.dumps(reports),flush=True);build()

if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--cached',action='store_true');args=parser.parse_args()
 if args.cached:build()
 else:main()
