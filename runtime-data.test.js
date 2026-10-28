'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const Runtime=require('./runtime-data'),Catalog=require('./catalog'),Market=require('./market-prices'),Pricing=require('./pricing'),Photos=require('./photo-standards'),Details=require('./fragrance-details');
const read=name=>JSON.parse(fs.readFileSync(__dirname+'/data/'+name+'.json'));
test('compact catalog retains all IDs, photos and exact current seller averages',()=>{
 const report=require('./scripts/build_runtime').build(),data=read('runtime/browse'),catalog=Runtime.unpackCatalog(data.records),packed=Runtime.unpackPrices(read('runtime/prices'));
 const manifest=read('photos'),original=read('catalog').fragrances.concat(manifest.additionalRecords,read('retailer-catalog').fragrances);
 assert.equal(catalog.length,report.records);assert.equal(new Set(catalog.flatMap(f=>f.sourceIds)).size,new Set(original.map(f=>f.id)).size);
 const prepared=Catalog.prepare(original.map(f=>{const i=manifest.photos[f.id]?.review?.productIdentity;return i?{...f,concentration:f.concentration||i.concentration,sizeMl:f.sizeMl||i.sizeMl}:f;}),{imageAvailable:f=>Boolean(Photos.approved(f,manifest))});
 const compactById=new Map(catalog.map(f=>[f.id,f]));
 for(const row of prepared.records){const compact=compactById.get(row.id);for(const source of row.sourceRecords)if(source.barcode)assert([compact.barcode,...(compact.barcodes||[])].includes(source.barcode));}
 Market.configureCatalog(prepared.records);Market.configure({products:[...read('prices').products,...read('retailer-prices').products]});
 const quotes=new Map(prepared.records.map(f=>[f.id,Pricing.value(Market.offers(f))]));
 Market.configureCatalog(catalog);Market.configureIndexed(packed);
 for(const f of catalog){assert.deepEqual(Pricing.value(Market.offers(f)),quotes.get(f.id),f.id);assert.equal(Boolean(Photos.approved(f,{photos:data.photos})),Boolean(Photos.approved(f,manifest)),f.id);}
 const example=catalog.find(f=>packed.has(f.id));assert(example);
 assert.equal(Market.offers({...example,id:undefined,catalogId:example.sourceIds[0],size:example.sizeMl,remainingMl:25}).length,packed.get(example.id).length);
 assert.equal(Market.offers({...example,id:undefined,catalogId:example.id,sizeMl:example.sizeMl+1}).length,0);
 assert.equal(Market.offers({...example,sizeMl:example.sizeMl+1}).length,0);
 assert.equal(Market.offers({...example,id:'personal-id',catalogId:undefined}).length,packed.get(example.id).length);
 const initialBytes=fs.statSync(__dirname+'/data/runtime/browse.json').size+fs.statSync(__dirname+'/data/runtime/prices.json').size;
 const originalBytes=['catalog','photos','retailer-catalog','prices','retailer-prices','retailer-profiles','fragrance-profiles'].reduce((n,f)=>n+fs.statSync(__dirname+'/data/'+f+'.json').size,0);
 assert(initialBytes<originalBytes*.45);
});
test('profiles load independently by stable bucket and append without erasing previous details',()=>{
 const profiles=read('fragrance-profiles').profiles;
 for(const profile of profiles)for(const id of profile.catalogIds){const shard=read('runtime/profiles/'+Runtime.bucket(id));assert(shard.profiles.some(p=>p.id===profile.id));}
 Details.configure({profiles:[profiles[0]]});Details.configure({profiles:[profiles[1]]},{append:true});
 for(const p of profiles.slice(0,2))assert.equal(Details.profile({id:p.catalogIds[0],concentration:p.concentration}).id,p.id);
});
test('name cleanup and brand aliases preserve flankers and unknown names',()=>{
 assert.equal(Catalog.cleanName({brand:'Dior',name:'Sauvage by Christian Dior'}),'Sauvage');
 assert.equal(Catalog.cleanName({brand:'Dior',name:'Sauvage Elixir'}),'Sauvage Elixir');
 assert.equal(Catalog.cleanName({brand:'Example',name:'Stand By Me'}),'Stand By Me');
 assert.equal(Catalog.brand('Ateliers des Ors'),Catalog.brand('Atelier des Ors'));
 assert.equal(Catalog.brand('Memo'),Catalog.brand('Memo Paris'));
});
test('explicit seller bottle conflicts cannot contribute to the average; shared product paths are not guessed',()=>{
 const f={id:'variant',brand:'Example',name:'Scent',concentration:'Eau de Parfum',sizeMl:100,type:'standard'};
 assert.deepEqual(Catalog.listingConflicts(f,'https://shop.example/scent-edt-50ml'),['concentration','size']);
 assert.deepEqual(Catalog.listingConflicts(f,'https://shop.example/scent-edt-50ml?variant=123'),[]);
 const offer=url=>({seller:'Example',url,price:90,currency:'USD',kind:'discount',checked:'2026-10-23',stock:true,reviewed:true,matching:true});
 Market.configureCatalog([f]);Market.configure({products:[{...f,offers:[offer('https://shop.example/scent-edt-50ml')]}]});assert.equal(Market.offers(f).length,0);
 assert.deepEqual(Catalog.filter([f,{...f,id:'small',sizeMl:50}],{sizeMl:'50'}).map(f=>f.id),['small']);
});
test('remaining-volume shortcuts clamp safely and retain fractional milliliters',()=>{
 assert.deepEqual(Runtime.remaining(100,''),{amount:100,percent:100});assert.deepEqual(Runtime.remaining(100,75),{amount:75,percent:75});
 assert.deepEqual(Runtime.remaining(50,100),{amount:50,percent:100});assert.deepEqual(Runtime.remaining(50,-4),{amount:0,percent:0});
 assert.deepEqual(Runtime.remaining(7.5,3.75),{amount:3.8,percent:51});assert.deepEqual(Runtime.remaining('',10),{amount:0,percent:0});
});

test('profile queue bounds concurrent requests, deduplicates and reuses successful buckets',async()=>{
 let active=0,peak=0;const gates=new Map(),calls=[];
 const loader=Runtime.createProfileLoader(key=>{calls.push(key);active++;peak=Math.max(peak,active);return new Promise(resolve=>gates.set(key,()=>{active--;resolve();}));},{concurrency:2});
 const a=loader.request('a'),b=loader.request('b'),c=loader.request('c');
 assert.equal(loader.request('a'),a);await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(calls,['a','b']);
 gates.get('a')();await a.promise;await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(calls,['a','b','c']);
 gates.get('b')();gates.get('c')();await Promise.all([b.promise,c.promise]);assert.equal(peak,2);assert.equal(loader.request('a'),a);assert.equal(a.status,'ready');
});
test('a failed profile bucket releases its queue slot and retries on demand',async()=>{
 let attempts=0;const loader=Runtime.createProfileLoader(async key=>{if(key==='bad'&&attempts++===0)throw Error('offline');},{concurrency:1});
 const bad=loader.request('bad'),good=loader.request('good');await Promise.all([bad.promise,good.promise]);assert.equal(bad.status,'error');assert.equal(good.status,'ready');
 const retry=loader.request('bad');assert.notEqual(retry,bad);await retry.promise;assert.equal(retry.status,'ready');
});
