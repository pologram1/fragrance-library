'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const Details=require('./fragrance-details.js');
const now=Date.parse('2026-10-21T12:00:00Z');
const offer={seller:'Seller A',price:70,currency:'USD',url:'https://shop.example/product?variant=10&utm_source=affiliate&tag=partner',kind:'discount',checked:'2026-10-21',stock:true,reviewed:true,matching:true};
test('external shop links retain bottle variants and remove referral tracking',()=>{
 assert.equal(Details.cleanLink(offer.url),'https://shop.example/product?variant=10');
 assert.equal(Details.cleanLink('javascript:alert(1)'),null);assert.equal(Details.cleanLink('http://shop.example'),null);assert.equal(Details.cleanLink('https://secret@shop.example/product'),null);
 assert.equal(Details.cleanLink('https://shop.example/product?ref=paid&affiliate_id=123&sku=abc#affiliate'),'https://shop.example/product?sku=abc');
});
test('shopping offers deduplicate sellers, expose stock/freshness and never turn a dataset link into a buy link',()=>{
 const f={sourceUrl:'https://world.openbeautyfacts.org/product/1234'};
 assert.equal(Details.sellerLinks(f,[],now).length,0);
 const rows=Details.sellerLinks(f,[offer,{...offer,price:60,checked:'2026-10-20'},{...offer,seller:'B',stock:false,url:'https://other.example/product'},{...offer,seller:'Unreviewed',reviewed:false,url:'https://unknown.example/product'}],now);
 assert.equal(rows.length,2);assert.equal(rows[0].price,70);assert.equal(rows[0].current,true);assert.equal(rows[1].current,false);assert.equal(rows[1].stock,false);assert.equal(rows[0].url,'https://shop.example/product?variant=10');
 const stale=Details.sellerLinks(f,[{...offer,checked:'2026-10-01'}],now);assert.equal(stale[0].current,false);
 const fallback=Details.sellerLinks({sourceUrl:'https://perfumebox.com/products/abc?variant=99&utm_campaign=test'},[],now);assert.equal(fallback[0].price,null);assert.equal(fallback[0].url,'https://perfumebox.com/products/abc?variant=99');
});
test('sourced profiles keep flankers and concentrations separate; unknown history is not invented',()=>{
 const data=JSON.parse(fs.readFileSync(__dirname+'/data/fragrance-profiles.json','utf8'));Details.configure(data);
 const asad=Details.profile({id:'studio-retail-e469a4a6c73bafc589d0b56c',concentration:'Eau de Parfum'});assert.equal(asad.name,'Asad');assert.equal(asad.launchYear,2021);assert.ok(asad.notes.top.includes('Pineapple'));
 assert.equal(Details.profile({id:'studio-retail-e469a4a6c73bafc589d0b56c',concentration:'Extrait de Parfum'}),null);
 const extrait=Details.profile({id:'studio-retail-9404e70b4efb4abc3481e499',concentration:'Extrait de Parfum'});assert.ok(extrait.notes.featured.includes('Bitter almond'));
 assert.equal(Details.profile({id:'missing-fragrance'}),null);
 const ids=new Set();for(const p of data.profiles){assert.ok(p.sources.length);assert.ok(p.sources.every(s=>Details.cleanLink(s.url)&&/^\d{4}-\d{2}-\d{2}$/.test(s.checked)));assert.ok(p.story.length<1500);for(const id of p.catalogIds){assert.ok(!ids.has(id));ids.add(id);}}
});
