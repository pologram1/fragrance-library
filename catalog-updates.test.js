const {test}=require('node:test'),assert=require('node:assert/strict');
const Updates=require('./catalog-updates.js'),Prices=require('./market-prices.js'),Details=require('./fragrance-details.js');
test('published catalog updates merge without exposing drafts, losing aliases or mutating saved records',()=>{
 const original={id:'a',sourceIds:['a','alias'],brand:'Dior',name:'Original',concentration:'Eau de Parfum',sizeMl:50,type:'standard'},saved=structuredClone(original),manifest={photos:{}};
 const out=Updates.merge([original,{...original,id:'archived'}],manifest,[{id:'a',status:'published',payload:{...original,name:'Edited',photo:{url:'https://example.com/bottle.jpg'}}},{id:'draft',status:'draft',payload:original},{id:'archived',status:'archived'}]);
 assert.equal(out.length,1);assert.equal(out[0].name,'Edited');assert.deepEqual(out[0].sourceIds,['a','alias']);assert.deepEqual(original,saved);assert.equal(manifest.photos.a.url,'https://example.com/bottle.jpg');
});
test('public update loader paginates and rejects failures',async()=>{
 let calls=0;const rows=await Updates.load({supabaseUrl:'https://example.supabase.co',supabasePublishableKey:'public'},async(_url,options)=>{assert.equal(JSON.parse(options.body).p_offset,calls*200);return {ok:true,json:async()=>++calls===1?Array.from({length:200},(_,i)=>({id:String(i)})):[]};});assert.equal(rows.length,200);assert.equal(calls,2);
 await assert.rejects(Updates.load({},async()=>({ok:false})));
});
test('admin offers supplement indexed sellers and profiles survive lazy source loads',()=>{
 const record={id:'a',brand:'Dior',name:'Test',concentration:'Eau de Parfum',sizeMl:50,type:'standard'};Prices.configureCatalog([record]);Prices.configureIndexed(new Map([['a',[{seller:'Base'}]]]));Prices.configureAdmin([{id:'a',status:'published',payload:{offers:[{seller:'Admin'}]}}]);assert.deepEqual(Prices.offers(record).map(x=>x.seller),['Base','Admin']);
 const profile={catalogIds:['a'],name:'Test',concentration:'Eau de Parfum',story:'Curated',sources:[{url:'https://example.com'}]};Details.configureAdmin([{id:'a',status:'published',payload:{profile}}]);Details.configure({profiles:[{...profile,story:'Old'}]},{append:true});assert.equal(Details.profile(record).story,'Curated');Prices.configureAdmin([]);Details.configureAdmin([]);
});
