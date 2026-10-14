'use strict';
const assert=require('node:assert/strict');
const Google=require('./google-signin.js');
(async()=>{
 const settings=value=>async()=>({ok:true,json:async()=>value});
 assert(await Google.available(settings({external:{google:true},disable_signup:false}),'https://test.supabase.co','sb_publishable_test'));
 assert(!await Google.available(settings({external:{google:false}}),'https://test.supabase.co','sb_publishable_test'));
 assert(!await Google.available(settings({external:{google:true},disable_signup:true}),'https://test.supabase.co','sb_publishable_test'));
 assert(!await Google.available(async()=>{throw Error('network');},'https://test.supabase.co','sb_publishable_test'));
 let argumentsReceived;
 const client={auth:{signInWithOAuth:async args=>{argumentsReceived=args;return {data:{url:'https://accounts.google.com/'}};}}};
 await Google.start(client,'https://pologram1.github.io/fragrance-library/');
 assert.equal(argumentsReceived.provider,'google');assert.equal(argumentsReceived.options.redirectTo,'https://pologram1.github.io/fragrance-library/');
 assert.equal(argumentsReceived.options.scopes,undefined);
 await assert.rejects(Google.start(client,'http://example.com/'));
 await assert.rejects(Google.start({auth:{signInWithOAuth:async()=>({error:Error('cancelled')})}},'https://example.com/'));
 console.log('Google sign-in checks passed: provider readiness, HTTPS redirect, minimal access, and errors.');
})().catch(e=>{console.error(e);process.exit(1);});
