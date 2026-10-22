'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
global.Pricing=require('./pricing.js');global.Portfolio=require('./portfolio.js');
const {series}=require('./home.js');
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
