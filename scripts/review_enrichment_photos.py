"""Prepare native retailer photo candidates and review sheets; never auto-approve."""
import concurrent.futures,hashlib,io,json
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
from enrich_catalog import CACHE,fetch
OUT=CACHE/'photo-review'
def publish(numbers,report='enrichment-photo-review.json'):
 root=Path(__file__).resolve().parents[1];manifest=json.loads((root/'data/photos.json').read_text());rows=json.loads((OUT/'candidates.json').read_text());audits=[]
 for row in rows:
  number=row['reviewNumber'];approved=number in numbers;f=row['product']
  audits.append({'number':number,'id':row['id'],'url':row['url'],'sha256':row['sha256'],'verdict':'approved' if approved else 'held','reason':'Visually reviewed whole bottle, label, size/concentration, proportions and plain presentation.' if approved else 'Placeholder, composition, label or concentration/identity not sufficiently confirmed.'})
  if not approved:continue
  assert hashlib.sha256(Path(row['file']).read_bytes()).hexdigest()==row['sha256']
  manifest['photos'][row['id']]={'url':row['url'],'status':'approved','width':row['width'],'height':row['height'],'source':'retailer-enrichment','sourceUrl':row['sourceUrl'],'credit':row['seller'],'license':'Image reuse authorized by Miguel for the supplied retailers, 2026-10-22; no Creative Commons license asserted.','checks':dict(sharp=True,labelReadable=True,correctProduct=True,wholeBottle=True,cleanBackground=True),'review':{'reviewedBy':'Codex visual review','reviewedAt':'2026-10-22','sourceSha256':row['sha256'],'policyVersion':1,'identityConfirmed':True,'productIdentity':{k:f[k] for k in ['brand','name','concentration','sizeMl']},'notes':'Inspected original photo in numbered review sheet; reviewed against selected retailer variant. Native source retained without upscaling or distortion.'}}
 (root/'data/photos.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
 (root/'data'/report).write_text(json.dumps({'date':'2026-10-22','candidates':audits,'approved':len(numbers)},ensure_ascii=False,indent=2)+'\n')
 print('approved',len(numbers),'total',len(manifest['photos']))
def prepare(diverse=False):
 OUT.mkdir(exist_ok=True)
 rows=json.loads((CACHE/'image-candidates.json').read_text());seen=set();chosen=[]
 brands=['Lattafa','Afnan','Armaf','Paris Corner','Maison Alhambra','Creed','Parfums de Marly','Xerjoff','Amouage','Dior','Versace','Jean Paul Gaultier','Giorgio Armani','Montale','Mancera','Tom Ford']
 rows.sort(key=lambda r:(r['product']['brand'] not in brands,not r['variantImage'],r['product']['brand'],r['product']['name']));per_brand={}
 for row in rows:
  b=row['product']['brand']
  if diverse and (b not in brands or b=='Afnan' or per_brand.get(b,0)>=3):continue
  if row['id'] in seen or row['url'] in seen or (row.get('width') or 0)<500 or (row.get('height') or 0)<500:continue
  if row['product']['sizeMl']!=100:continue
  seen.update([row['id'],row['url']]);chosen.append(row);per_brand[b]=per_brand.get(b,0)+1
  if len(chosen)>=60:break
 def get(row):
  try:
   data=fetch(row['url']);image=Image.open(io.BytesIO(data));image.load()
   if image.width<300 or image.height<400:return None
   path=OUT/(row['id']+'.image');path.write_bytes(data)
   return {**row,'file':str(path),'sha256':hashlib.sha256(data).hexdigest(),'width':image.width,'height':image.height}
  except Exception:return None
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:result=[r for r in pool.map(get,chosen) if r]
 for i,r in enumerate(result):r['reviewNumber']=i+1
 (OUT/'candidates.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
 font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',13)
 for start in range(0,len(result),12):
  sheet=Image.new('RGB',(1200,1640),'#f2f0eb');draw=ImageDraw.Draw(sheet)
  for j,r in enumerate(result[start:start+12]):
   x=(j%3)*400;y=(j//3)*410;img=Image.open(r['file']).convert('RGB');img.thumbnail((380,340));sheet.paste(img,(x+(400-img.width)//2,y+5+(340-img.height)//2))
   label=f'{r["reviewNumber"]}. {r["product"]["brand"]}\n{r["product"]["name"][:45]}\n{r["product"]["concentration"]} / {r["product"]["sizeMl"]} mL'
   draw.multiline_text((x+12,y+348),label,fill='#111111',font=font,spacing=3)
  sheet.save(OUT/f'sheet-{start//12+1}.jpg',quality=94)
 print('candidates',len(result),'sheets',(len(result)+11)//12)
if __name__=='__main__':prepare()
