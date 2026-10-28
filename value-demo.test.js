'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
global.Pricing=require('./pricing.js');global.Portfolio=require('./portfolio.js');
const {calculate}=require('./value-demo.js');
test('sample uses the same valuation rules as owned bottles',()=>{
 const sample=calculate(75,120);
 assert.equal(sample.remainingValue,90);assert.equal(sample.marketChange,15);
 assert.equal(sample.usageValue,25);assert.equal(sample.netChange,-10);
});
test('empty and full bottles preserve the value accounting identity',()=>{
 for(const remaining of [0,25,100])for(const price of [50,100,200]){
  const result=calculate(remaining,price);
  assert.equal(result.remainingValue-100,result.netChange);
  assert.equal(result.marketChange-result.usageValue,result.netChange);
 }
 assert.throws(()=>calculate(101,120),RangeError);assert.throws(()=>calculate(75,NaN),RangeError);
});
