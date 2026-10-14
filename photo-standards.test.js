'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const Photos=require('./photo-standards.js');
const manifest=JSON.parse(fs.readFileSync(__dirname+'/data/photos.json','utf8'));
const record=manifest.additionalRecords[0];
assert(Photos.approved(record,manifest));
assert(Photos.approved({catalogId:record.id},manifest));
assert.equal(Photos.approved({id:'obf-123'},manifest),null);
const photo=manifest.photos[record.id];
function altered(changes){return {photos:{[record.id]:{...photo,...changes}}};}
assert.equal(Photos.approved(record,altered({status:'pending'})),null);
assert.equal(Photos.approved(record,altered({width:100})),null);
assert.equal(Photos.approved(record,altered({url:'javascript:alert(1)'})),null);
assert.equal(Photos.approved(record,altered({url:'assets/fragrances/../../config.js'})),null);
assert.equal(Photos.approved(record,altered({checks:{...photo.checks,labelReadable:false}})),null);
assert.equal(Photos.approved(record,altered({checks:{...photo.checks,correctProduct:false}})),null);
assert.equal(Photos.approved(record,altered({checks:{...photo.checks,cleanBackground:false}})),null);
console.log('Photo checks passed: reviewed assets, exact product identity, dimensions, source URL safety and rejected low-quality images.');
