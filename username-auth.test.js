const assert=require('node:assert/strict');
const auth=require('./username-auth');
assert.equal(auth.normalize(' Miguel_101 '),'miguel_101');
assert.equal(auth.credentials('Miguel','a-long-password','a-long-password',true).email,'miguel@accounts.fragrance-library.invalid');
for(const name of ['ab','1miguel','miguel@example.com','a b','<script>','a'.repeat(25)])assert.throws(()=>auth.normalize(name));
assert.throws(()=>auth.credentials('miguel','short','short',true));
assert.throws(()=>auth.credentials('miguel','a-long-password','different',true));
assert.equal(auth.display({email:'miguel@accounts.fragrance-library.invalid'}),'miguel');
console.log('Username credential mapping, validation and password confirmation passed.');
