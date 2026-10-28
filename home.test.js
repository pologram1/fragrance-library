'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
global.Pricing=require('./pricing.js');global.Portfolio=require('./portfolio.js');
const {series}=require('./home.js');
global.Catalog=require('./catalog.js');global.MarketPrices=require('./market-prices.js');global.PhotoStandards=require('./photo-standards.js');
const {featured}=require('./home.js');
const now=Date.parse('2026-10-22T12:00:00Z');
const offer={seller:'Example',price:120,url:'https://example.com/item',currency:'USD',kind:'discount',checked:'2026-10-22',stock:true,reviewed:true,matching:true};
test('chart uses observed market prices and the current quantity and remaining mL',()=>{
 const f={status:'owned',size:100,remainingMl:50,quantity:2,offers:[offer],priceHistory:[{date:'2026-10-20',price:100},{date:'2026-10-22',price:120}]};
 assert.deepEqual(series([f],30,now),[{date:'2026-10-20',value:100},{date:'2026-10-21',value:100},{date:'2026-10-22',value:120}]);
 assert.deepEqual(series([{...f,status:'wishlist'}],30,now),[]);
 assert.deepEqual(series([{...f,offers:[]}],30,now),[]);
 const later={...f,priceHistory:[{date:'2026-10-22',price:120}]};
 assert.equal(series([f,later],0,now).length,1);assert.equal(series([f,later],0,now)[0].value,240);
});
test('the first observed day is retained without fabricating pre-tracking values',()=>{
 assert.deepEqual(series([],0,now),[]);
 const f={status:'owned',size:100,quantity:1,offers:[offer],priceHistory:[{date:'2026-10-22',price:120}]};
 assert.deepEqual(series([f],365,now),[{date:'2026-10-22',value:120}]);
});
test('discovery remains visible without fresh prices and excludes unreviewed photos and duplicate sizes',()=>{
 const base={brand:'Dior',name:'Sauvage',concentration:'Eau de Parfum',sizeMl:100};
 const records=[{...base,id:'one'},{...base,id:'two',sizeMl:50},{...base,id:'unreviewed',name:'Unreviewed'},{...base,id:'incomplete',name:'Incomplete',sizeMl:null}];
 const photo={status:'approved',url:'https://example.com/photo.jpg',width:600,height:800,review:{identityConfirmed:true,reviewedBy:'Test reviewer',sourceSha256:'a'.repeat(64)},checks:{sharp:true,labelReadable:true,correctProduct:true,wholeBottle:true,cleanBackground:true}};
 const manifest={photos:{one:photo,two:photo,incomplete:photo}};
 assert.equal(Pricing.value(MarketPrices.offers(records[0])).price,null);
 assert.deepEqual(featured(records,manifest).map(f=>f.id),['one']);
 assert.deepEqual(featured([],manifest),[]);
});
