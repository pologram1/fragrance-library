'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
global.Pricing=require('./pricing.js');global.Portfolio=require('./portfolio.js');
const Details=require('./fragrance-details.js'),Home=require('./home.js');
const now=Date.parse('2026-10-23T12:00:00Z');
const offer=(price,patch={})=>({seller:'Seller A',url:'https://a.example/bottle',price,currency:'USD',kind:'discount',checked:'2026-10-23',stock:true,reviewed:true,matching:true,...patch});
const bottle={id:'1',brand:'Example',name:'Scent',concentration:'Eau de Parfum',size:100,remainingMl:50,quantity:2,status:'owned',paid:null,offers:[offer(120)],priceHistory:[{date:'2026-10-20',price:100}]};
test('remaining value reconciles starting value, market movement and consumption',()=>{
 const m=Portfolio.metrics(bottle,now);
 assert.equal(m.baselineValue,200);assert.equal(m.baselineValue+m.marketChange-m.usageValue,m.remainingValue);
 const totals=Portfolio.totals([bottle],now);
 assert.equal(totals.netPercent,-40);assert.equal(totals.fillPercent,50);assert.equal(totals.fullValue,240);
 assert.equal(totals.volumeMl,200);assert.equal(totals.trackedBaselineValue,200);
});
test('stale prices retain known usage while market and net coverage stay explicit',()=>{
 const stale={...bottle,id:'2',quantity:1,offers:[offer(120,{checked:'2026-09-01'})]};
 const untracked={...bottle,id:'3',quantity:1,offers:[],priceHistory:[]};
 const t=Portfolio.totals([bottle,stale,untracked,{...bottle,status:'wishlist'}],now);
 assert.equal(t.bottles,4);assert.equal(t.pricedBottles,2);assert.equal(t.trackedBottles,2);assert.equal(t.usageBottles,3);
 assert.equal(t.usageValue,150);assert.equal(t.marketChange,20);assert.equal(t.netChange,-80);
 assert.equal(t.netPercent,-40);assert.equal(t.remainingValue,120);
 assert.equal(Portfolio.totals([],now).netPercent,null);
 assert.equal(Portfolio.totals([],now).fillPercent,null);
});
test('seller evidence matches the average and does not revive superseded offers',()=>{
 const offers=[offer(60,{checked:'2026-10-22'}),offer(70,{stock:false}),offer(90,{seller:'B',url:'https://b.example/item'}),offer(120,{seller:'B duplicate',url:'https://www.b.example/old',checked:'2026-10-22'}),offer(500,{seller:'C',url:'https://c.example/item',checked:'2026-09-01'})];
 const evidence=Details.priceEvidence({sizeMl:100},offers,now),rows=Details.sellerLinks({},offers,now);
 assert.equal(evidence.price,90);assert.equal(evidence.count,1);assert.equal(evidence.lowest,90);assert.equal(evidence.highest,90);assert.equal(evidence.perMl,.9);
 assert.equal(rows.filter(r=>r.current).length,evidence.count);assert.equal(rows.find(r=>r.seller==='Seller A').stock,false);
 const none=Details.priceEvidence({sizeMl:100},[offer(60,{stock:false})],now);assert.equal(none.price,null);assert.equal(none.perMl,null);assert.equal(none.oldest,null);
});
test('price ranges and freshness use each included seller once',()=>{
 const evidence=Details.priceEvidence({sizeMl:50},[offer(60),offer(100,{seller:'B',url:'https://b.example/item',checked:'2026-10-21'})],now);
 assert.equal(evidence.price,80);assert.equal(evidence.lowest,60);assert.equal(evidence.highest,100);assert.equal(evidence.count,2);assert.equal(evidence.perMl,1.6);
 assert.equal(evidence.oldest,'2026-10-21');assert.equal(evidence.newest,'2026-10-23');
});
test('size links require the same retailer product, concentration and bottle type',()=>{
 const record={id:'one',brand:'Creed',name:'Aventus',concentration:'Eau de Parfum',sizeMl:100,sourceUrl:'https://www.shop.example/products/aventus-man?variant=1'};
 const small={...record,id:'two',sizeMl:50,sourceUrl:'https://shop.example/products/aventus-man?variant=2'};
 const other={...record,id:'three',sizeMl:75,sourceUrl:'https://shop.example/products/aventus-woman?variant=3'};
 assert.deepEqual(Details.bottleVariants(record,[record,small,other,{...small,concentration:'Parfum'},{...small,type:'tester'}]).map(p=>p.id),['two','one']);
 assert.deepEqual(Details.bottleVariants({...record,sourceUrl:undefined},[record]),[]);
});
test('the breakdown escapes private names and keeps unknown values distinct from zero',()=>{
 const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
 const content=Home.insights([{...bottle,name:'<script>alert(1)</script>',offers:[],priceHistory:[]}],n=>'$'+n.toFixed(2),esc,now);
 assert.ok(!content.breakdown.includes('<script>'));assert.match(content.breakdown,/&lt;script&gt;/);assert.match(content.breakdown,/Not priced/);
 assert.match(content.cards,/0 of 2 bottles comparable/);
});
