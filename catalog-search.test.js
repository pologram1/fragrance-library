'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const C=require('./catalog'),Market=require('./market-prices'),Pricing=require('./pricing'),Details=require('./fragrance-details');
const base={id:'a',brand:'Christian Dior',name:'Sauvage',concentration:'Eau de Parfum',sizeMl:100,type:'standard'};
test('cleanup groups exact bottles, standardizes brands and retains every old ID',()=>{
 const duplicate={...base,id:'b',brand:'DIOR',barcode:'1234567890123'},records=[base,duplicate,{...base,id:'small',sizeMl:50},{...base,id:'edt',concentration:'Eau de Toilette'},{...base,id:'tester',type:'tester'},{...base,id:'intense',name:'Sauvage Intense'},{...base,id:'women',sourceUrl:'https://shop.example/sauvage-woman'}];
 const prepared=C.prepare(records,{imageAvailable:f=>f.id==='b'});
 assert.equal(prepared.records.length,6);assert.equal(prepared.merged,1);
 assert.equal(prepared.aliases.get('a').id,'b');assert.equal(prepared.aliases.get('b').displayBrand,'Dior');assert.equal(prepared.aliases.size,7);
 assert.equal(prepared.aliases.get('a').sourceRecords[0].barcode,'1234567890123');
 assert.equal(base.brand,'Christian Dior');assert.equal(duplicate.brand,'DIOR');
 assert.notEqual(prepared.aliases.get('a'),prepared.aliases.get('women'));
 const incomplete=C.prepare([{...base,id:'unknown-1',concentration:null},{...base,id:'unknown-2',concentration:null}]);assert.equal(incomplete.records.length,2);
});
test('case, accents, punctuation and known brand aliases share one filter choice',()=>{
 const records=C.prepare([{...base,brand:'CHANEL'},{...base,id:'b',brand:'chanel',name:'Bleu'},{...base,id:'c',brand:'Chanel',name:'Allure'}]).records;
 assert.equal(new Set(records.map(C.brand)).size,1);assert.equal(C.filter(records,{brand:'chanel'}).length,3);
 assert.equal(C.brand('Lataffa'),'Lattafa');assert.equal(C.brand('Christian Dior'),'Dior');
 assert.equal(C.filter([{...base,brand:'Hermès',name:'Terre d’Hermès'}],{query:'hermes terre'}).length,1);
});
test('search corrects bounded misspellings and transpositions without changing bottle constraints',()=>{
 const records=[base,{...base,id:'small',sizeMl:50},{...base,id:'edt',concentration:'Eau de Toilette'},{...base,id:'extra',name:'Sauvage Elixir',concentration:'Parfum'}];
 assert.equal(C.search(records,'dior savauge 100ml edp').items[0].id,'a');
 assert.equal(C.search(records,'dior savauge 100ml edp').fuzzy,true);
 assert.equal(C.search([{...base,id:'elixir',name:'Dior Sauvage Elixir'},base],'dior savauge').items[0].id,'a');
 assert.equal(C.search(records,'sauvage 100 ml EDT').items[0].id,'edt');
 assert.equal(C.search(records,'dior 200ml').items.length,0);
 assert.deepEqual(C.search([{...base,id:'woman',audience:'women'},{...base,id:'man',audience:'men'}],'sauvage men').items.map(f=>f.id),['man']);
 assert.equal(C.search(records,'totallyunknownscent').items.length,0);
 assert.equal(C.search([{...base,sizeMl:7.5}],'sauvage 7.5 ml').items.length,1);
 const exact=C.search([base,{...base,id:'other',name:'Sauvage Elixir'}],'sauvage');assert.equal(exact.fuzzy,false);
});
test('barcode and brand shortcuts remain searchable; numeric typos are not corrected',()=>{
 const records=[{...base,id:'mfk',brand:'Maison Francis Kurkdjian',name:'Baccarat Rouge 540',barcode:'1234567890123'},{...base,id:'ysl',brand:'Yves Saint Laurent',name:'Y'}];
 assert.equal(C.search(records,'MFK 540').items[0].id,'mfk');assert.equal(C.search(records,'YSL').items[0].id,'ysl');
 assert.equal(C.search(records,'1234567890123').items[0].id,'mfk');assert.equal(C.search(records,'1234567890124').items.length,0);
});
test('grouped photos, profiles and original private collection links still resolve',()=>{
 const prepared=C.prepare([base,{...base,id:'b',brand:'Dior'}],{imageAvailable:f=>f.id==='b'}),canonical=prepared.records[0];
 Details.configure({profiles:[{name:'Sauvage',concentration:'Eau de Parfum',catalogIds:['a'],sources:[{url:'https://brand.example/sauvage'}]}]});
 assert.equal(Details.profile(canonical).name,'Sauvage');
 Market.configureCatalog(prepared.records);Market.configure({products:[{...base,catalogId:'a',offers:[{seller:'Example',url:'https://shop.example/sauvage',price:100,currency:'USD',kind:'discount',checked:'2026-10-23',stock:true,reviewed:true,matching:true}]}]});
 const saved={catalogId:'a',brand:'Christian Dior',name:'Sauvage',concentration:'Eau de Parfum',size:100,type:'standard',remainingMl:30};
 assert.equal(Market.key(saved),Market.key(canonical));assert.equal(Market.offers(saved)[0].price,100);assert.equal(saved.remainingMl,30);
 assert.equal(Market.offers({...saved,size:50}).length,0);
});
test('explicitly different audiences and testers cannot share seller prices',()=>{
 const man={...base,id:'man',sourceUrl:'https://shop.example/sauvage-man'},woman={...base,id:'woman',sourceUrl:'https://shop.example/sauvage-woman'};
 const rows=C.prepare([man,woman]).records;Market.configureCatalog(rows);
 const offer=(url,price)=>({seller:url,url,price,currency:'USD',kind:'discount',checked:'2026-10-23',stock:true,reviewed:true,matching:true});
 Market.configure({products:[{...man,catalogId:'man',offers:[offer('https://shop.example/sauvage-man',80),offer('https://other.example/sauvage-woman',20),offer('https://third.example/sauvage-tester',30)]}]});
 assert.equal(Market.offers(rows.find(r=>r.id==='man')).length,1);assert.equal(Market.offers(rows.find(r=>r.id==='woman')).length,0);
 assert.equal(Pricing.value(Market.offers(rows.find(r=>r.id==='man')),Date.parse('2026-10-23T12:00:00Z')).price,80);
});
