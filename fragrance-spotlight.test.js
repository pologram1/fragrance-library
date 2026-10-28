'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {selection}=require('./fragrance-spotlight');
test('highlight navigation wraps in both directions, including Home and End targets',()=>{
 const control=selection(['a','b','c']);
 assert.equal(control.state().id,'a');assert.equal(control.go(-1).id,'c');
 assert.equal(control.go(3).id,'a');assert.equal(control.go(1).id,'b');
 assert.equal(control.go(0).id,'a');assert.equal(control.go(2).id,'c');
});
test('catalog refresh retains the selected fragrance by ID and handles removed, single, or empty selections',()=>{
 assert.equal(selection(['c','a','b'],'b').state().index,2);
 assert.equal(selection(['a','b'],'removed').state().id,'a');
 assert.equal(selection(['a'],'a').go(-1).id,'a');
 assert.deepEqual(selection([]).go(9),{index:0,id:null,count:0});
});
