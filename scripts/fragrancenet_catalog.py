"""Read public FragranceNet product variants; preserve ordinary (non-coupon) USD prices."""
import concurrent.futures,json,re,time,urllib.parse
from enrich_catalog import CACHE,ROOT,DAY,fetch,brand,concentration,size
START='https://www.fragrancenet.com/cologne/christian-dior/dior-sauvage/eau-de-parfum'
def read(url):
 target=CACHE/('fragrancenet-'+__import__('hashlib').sha256(url.encode()).hexdigest()[:16]+'.json')
 if target.exists() and time.time()-target.stat().st_mtime<21600:return json.loads(target.read_text())
 source=fetch(url).decode()
 match=re.search(r'<script[^>]*id="__NEXT_DATA__"[^>]*>(.*?)</script>',source,re.S)
 if not match:raise ValueError('No public product data')
 page=json.loads(match[1])['props']['pageProps']['pageData']
 result={'url':url,'page':page,'links':list(dict.fromkeys('https://www.fragrancenet.com'+u for u in re.findall(r'href="(/(?:cologne|perfume)/[^"?#]+)"',source) if u.count('/')>=4))}
 target.write_text(json.dumps(result));return result
def main():
 CACHE.mkdir(exist_ok=True);first=read(START)
 def paths(value):
  if isinstance(value,dict):
   for key,item in value.items():
    if key=='productPath' and concentration(item):yield 'https://www.fragrancenet.com/'+item.split('#')[0]
    else:yield from paths(item)
  elif isinstance(value,list):
   for item in value:yield from paths(item)
 urls=list(dict.fromkeys(paths(first['page'].get('upsellWidgetData',{}))))[:24];rows=[first];errors=[]
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
  futures={pool.submit(read,u):u for u in urls if u!=START}
  for future in concurrent.futures.as_completed(futures):
   try:rows.append(future.result())
   except Exception as e:errors.append({'url':futures[future],'error':type(e).__name__})
 (CACHE/'fragrancenet-products.json').write_text(json.dumps(rows))
 observations=[]
 for row in rows:
  page=row['page'];conc=concentration(page.get('mlDescription',''));vendor=brand(page.get('designer',''));name=page.get('brand','')
  if vendor=='Dior' and name.startswith('Dior '):name=name[5:]
  if not conc or not vendor or page.get('currency')!='USD':continue
  for group in page.get('skuList',[]):
   for sku in group.get('SIZE',[]):
    ml=size(sku.get('metricValue',''));price=sku.get('ourPrice');desc=sku.get('name','')
    if not ml or not isinstance(price,(int,float)) or price<=0 or any(sku.get(k) for k in ['isTester','isUnboxed','isRefill','isTravelSpray','isRollerball']) or not 15<=ml<=500:continue
    if concentration(sku.get('variant',''))!=conc:continue
    discounted=sku.get('discountPrice');public_coupon=page.get('acceptsCoupon') and not sku.get('noDiscounts') and isinstance(discounted,(int,float)) and 0<discounted<price
    offer={'seller':'FragranceNet','price':discounted if public_coupon else price,'currency':'USD','url':row['url']+'#'+sku['sku'],'kind':'discount','checked':DAY,'stock':not sku.get('isOutOfStock',True),'reviewed':True,'matching':True}
    if public_coupon:offer['priceNote']='Advertised coupon price; activate the public coupon at the seller.'
    observations.append({'brand':vendor,'name':name,'concentration':conc,'sizeMl':ml,'quantity':str(ml)+' mL','sourceUrl':row['url'],'reviewStatus':'Retailer-stated exact variant','offer':offer})
 (ROOT/'data/fragrancenet-observations.json').write_text(json.dumps({'products':observations,'checked':DAY,'couponPolicy':'Explicitly advertised public coupon prices are included and labeled; personal, membership and cart-total offers excluded.'},ensure_ascii=False,indent=2)+'\n')
 print(json.dumps({'pages':len(rows),'errors':len(errors),'exactVariants':len(observations)}))
if __name__=='__main__':main()
