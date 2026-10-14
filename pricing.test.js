const assert=require('node:assert/strict');const {value,eligible}=require('./pricing.js');const now=Date.parse('2026-10-14T12:00:00Z');const offer=price=>({price,currency:'USD',stock:true,reviewed:true,matching:true,kind:'discount',checked:'2026-10-14'});
assert.equal(value([offer(90),offer(120),offer(300)],now).price,120);
assert.equal(value([offer(90),offer(120)],now).price,105);
assert.equal(value([{...offer(200),kind:'retail'}],now).kind,'retail');
assert.equal(value([offer(90),{...offer(200),kind:'retail'}],now).price,90);
for(const patch of [{stock:false},{reviewed:false},{matching:false},{currency:'EUR'},{checked:'2026-10-01'},{checked:'2026-10-15'},{price:NaN}])assert.equal(eligible({...offer(90),...patch},now),false);
assert.equal(value([],now).price,null);console.log('Pricing checks passed: medians, retail fallback, and offer eligibility.');

assert.equal(value([{...offer(90),url:'https://www.example.com/a'},{...offer(100),url:'https://example.com/b'},{...offer(200),url:'https://another.example/a'}],now).price,150);
