const assert=require('node:assert/strict');global.Pricing=require('./pricing');const P=require('./portfolio');
const now=Date.parse('2026-10-14T12:00:00Z');
function offer(price){return {price,currency:'USD',url:'https://seller.example/item',seller:'Seller',kind:'discount',checked:'2026-10-14',stock:true,reviewed:true,matching:true};}
const bottle={size:100,remainingMl:50,quantity:2,status:'owned',paid:80,offers:[offer(120)],priceHistory:[{date:'2026-10-13',price:100}]};
const m=P.metrics(bottle,now);assert.equal(m.remainingValue,120);assert.equal(m.marketChange,20);assert.equal(m.usageValue,100);assert.equal(m.netChange,-80);assert.equal(m.purchaseChange,-40);assert.equal(m.purchasePercent,-25);
assert.equal(P.metrics({...bottle,remainingMl:0},now).remainingValue,0);
assert.equal(P.metrics({...bottle,remainingMl:undefined},now).remainingValue,240);
assert.equal(P.metrics({...bottle,offers:[]},now).remainingValue,null);
assert.equal(P.metrics({...bottle,paid:null},now).purchaseChange,null);
const f={...bottle,priceHistory:[]};P.capture(f,now);f.offers=[offer(150)];P.capture(f,now);assert.equal(f.priceHistory[0].price,120);assert.equal(f.priceHistory[1].price,150);
const sum=P.totals([bottle,{...bottle,status:'wishlist'},{...bottle,offers:[],paid:null}],now);assert.equal(sum.bottles,4);assert.equal(sum.pricedBottles,2);assert.equal(sum.purchaseChange,-40);assert.equal(sum.remainingValue,120);
assert.equal(P.metrics({...bottle,offers:[offer(50)]},now).marketChange,-50);
console.log('Usage-adjusted value, market changes, purchase comparison, old records, empty bottles, missing prices and frozen baselines passed.');

assert.equal(P.validate({...bottle,remainingMl:-1}), 'Remaining mL must be between zero and bottle size.');
assert.equal(P.validate({...bottle,remainingMl:101}), 'Remaining mL must be between zero and bottle size.');
assert.equal(P.validate({...bottle,remainingMl:0}),null);
assert.equal(P.validate({...bottle,remainingMl:undefined,priceHistory:undefined}),null);
assert.equal(P.validate({...bottle,priceHistory:[{date:'invalid',price:100}]}),'Invalid price history.');
