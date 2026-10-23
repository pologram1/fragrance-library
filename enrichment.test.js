'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const Market=require('./market-prices'),Pricing=require('./pricing'),Photos=require('./photo-standards'),Details=require('./fragrance-details');
const read=name=>JSON.parse(fs.readFileSync(__dirname+'/data/'+name+'.json'));
test('published supplemental prices and notes point to existing exact bottle records',()=>{
 const photos=read('photos'),rows=[...read('catalog').fragrances,...photos.additionalRecords,...read('retailer-catalog').fragrances].map(f=>{const pi=photos.photos[f.id]?.review?.productIdentity;return pi?{...f,sizeMl:f.sizeMl||pi.sizeMl,concentration:f.concentration||pi.concentration}:f;}),byId=new Map(rows.map(r=>[r.id,r]));
 Market.configureCatalog(rows);
 const prices=read('retailer-prices').products;assert(prices.length>6000);
 for(const p of prices){assert(byId.has(p.catalogId));assert.equal(Market.key(p),Market.key(byId.get(p.catalogId)));for(const o of p.offers){assert.equal(o.currency,'USD');assert(o.price>0);assert.equal(typeof o.stock,'boolean');assert.equal(o.matching,true);assert(['perfumebox.com','olfactoryfactoryllc.com','fragflex.com','jomashop.com','fragrancenet.com'].includes(new URL(o.url).hostname.replace(/^www\./,'')));}}
 for(const profile of read('retailer-profiles').profiles){assert(profile.catalogIds.every(id=>byId.has(id)));assert(profile.sources.length);assert(Object.values(profile.notes).flat().every(n=>typeof n==='string'&&n.length<65));}
 for(const name of ['enrichment-photo-review','enrichment-photo-review-diverse','enrichment-reference-photo-review'])for(const r of read(name).candidates){if(r.verdict==='approved'){assert(byId.has(r.id));assert(Photos.approved(byId.get(r.id),photos));assert.equal(photos.photos[r.id].review.sourceSha256,r.sha256);}else assert(!photos.photos[r.id]||photos.photos[r.id].review.sourceSha256!==r.sha256);}
});
test('one exact bottle averages eligible sellers and retains numeric FragranceNet size selectors',()=>{
 const products=read('retailer-prices').products;Market.configure({products});
 const f=products.find(f=>f.brand==='Lattafa'&&f.name==='Asad Bourbon'&&f.sizeMl===100);assert(f);
 const result=Pricing.value(Market.offers(f));assert.equal(result.count,2);assert.equal(result.price,28.95);
 assert.equal(Details.cleanLink('https://www.fragrancenet.com/cologne/example/eau-de-parfum#12345'),'https://www.fragrancenet.com/cologne/example/eau-de-parfum#12345');
 assert.equal(Details.cleanLink('https://example.com/item#anything'),'https://example.com/item');
});
