'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const CloudStore=require('./cloud-store.js'),Catalog=require('./catalog.js');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('failed saves retry automatically and recover a durable owner-scoped draft after reopening',async()=>{
 const entries=new Map(),storage={getItem:k=>entries.get(k),setItem:(k,v)=>entries.set(k,v),removeItem:k=>entries.delete(k)};
 let calls=0;const client={rpc:async()=>++calls===1?{error:{code:'offline'}}:{data:1}};
 const first=CloudStore.create(client,'owner-a',0,()=>{},{storage,retryDelays:[10]});first.save([{id:'bottle'}]);await tick();
 assert(first.durable());assert(first.dirty());first.invalidate();
 const other=CloudStore.create(client,'owner-b',0,()=>{},{storage});assert.deepEqual(other.resume([],x=>x).items,[]);assert.equal(calls,1);
 const reopened=CloudStore.create(client,'owner-a',0,()=>{},{storage});assert.deepEqual(reopened.resume([],x=>x).items,[{id:'bottle'}]);await tick();assert(!reopened.dirty());assert(!entries.has('polo-fragrance-pending:owner-a'));
 let attempts=0;const automatic=CloudStore.create({rpc:async()=>++attempts===1?{error:{code:'offline'}}:{data:1}},'retry',0,()=>{},{retryDelays:[1]});automatic.save([]);await new Promise(r=>setTimeout(r,20));assert.equal(attempts,2);assert(!automatic.dirty());
});
test('recovered edits never overwrite a changed server version',async()=>{
 const draft=JSON.stringify({owner:'a',version:1,items:[{id:'local'}]});let writes=0;
 const store=CloudStore.create({rpc:async()=>{writes++;}},'a',2,()=>{},{storage:{getItem:()=>draft}});
 assert(store.resume([{id:'remote'}],x=>x).conflict);assert(store.durable());assert.equal(store.retry(),false);assert.equal(writes,0);
});
test('Discover filters exact concentration, ownership, wishlist and eligible market price',()=>{
 const rows=[{id:1,brand:'A',name:'One',concentration:'Parfum'},{id:2,brand:'A',name:'Two',concentration:'Eau de Parfum'},{id:3,brand:'B',name:'Three',concentration:'Parfum'}];
 assert.deepEqual(Catalog.filter(rows,{concentration:'Parfum',ownership:'owned',inCollection:f=>f.id===1}).map(f=>f.id),[1]);
 assert.deepEqual(Catalog.filter(rows,{ownership:'wishlist',inWishlist:f=>f.id===2}).map(f=>f.id),[2]);
 assert.deepEqual(Catalog.filter(rows,{minPrice:'0',maxPrice:'80',getPrice:f=>f.id===1?70:f.id===2?100:null}).map(f=>f.id),[1]);
 assert.equal(Catalog.filter(rows,{ownership:'not-owned',inCollection:f=>f.id===1}).length,2);
});
test('normal UI has no manual storage, backup, photo approval filter or paid-cost input',()=>{
 const html=fs.readFileSync(__dirname+'/index.html','utf8');
 for(const id of ['sync-status','sync-reload','sync-retry','export','import','import-file','catalog-images','purchase-cost-label','guest-save-prompt','offer-form'])assert(!html.includes('id="'+id+'"'),id);
 assert(!/name="paid"/.test(html));assert(html.includes('id="collection-error"'));assert(html.includes('id="catalog-ownership"'));
});
