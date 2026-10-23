'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),C=require('./catalog');
const rows=[
 {id:'creed-100',brand:'CREED',name:'Aventus',sizeMl:100,concentration:'Eau de Parfum'},
 {id:'creed-50',brand:'Creed',name:'Aventus',sizeMl:50,concentration:'Eau de Parfum'},
 {id:'xerjoff',brand:'Xerjoff',name:'Naxos',sizeMl:100,concentration:'Eau de Parfum'},
 {id:'dior',brand:'Christian Dior',name:'Sauvage',sizeMl:100,concentration:'Eau de Parfum'},
 {id:'lattafa',brand:'Lataffa',name:'Asad',sizeMl:100,concentration:'Eau de Parfum'},
 {id:'other',brand:'A new house',name:'Amber',sizeMl:100,concentration:'Parfum'}
];
test('curated category filters compose with exact bottle and brand searches',()=>{
 assert.deepEqual(C.filter(rows,{category:'niche',brand:'Creed',query:'50ml edp'}).map(r=>r.id),['creed-50']);
 assert.deepEqual(C.filter(rows,{category:'designer'}).map(r=>r.id),['dior']);
 assert.deepEqual(C.filter(rows,{category:'arabic'}).map(r=>r.id),['lattafa']);
 assert.equal(C.filter(rows,{category:'niche',brand:'Dior'}).length,0);
 assert.equal(C.filter(rows,{category:'all'}).length,rows.length);
 assert.equal(C.category(rows.at(-1)),'other');
});
test('brand subcategories are normalized, counted and limited to their category',()=>{
 const brands=C.categoryBrands(rows,'niche');assert.equal(brands.length,2);
 assert.equal(brands.find(b=>b.name==='Creed').count,2);assert.ok(brands.some(b=>b.name==='Xerjoff'));
 assert.ok(!brands.some(b=>b.name==='Dior'));assert.equal(C.brandKey(''),'');
 assert.equal(C.category('MFK'),'niche');assert.equal(C.category('Tom Ford'),'designer');assert.equal(C.category('Lattafa'),'arabic');
 assert.equal(C.categoryBrands([], 'niche').length,0);
});
