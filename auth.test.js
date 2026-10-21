'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const UsernameAuth=require('./username-auth.js');
const CloudStore=require('./cloud-store.js');
const tick=()=>new Promise(resolve=>setTimeout(resolve,5));
function fixture({hold=false,fail=false,cloud=[]}={}){
 const elements=new Map(),authModes=['signin','signup'].map(authMode=>({dataset:{authMode},setAttribute(){}}));
 function element(id){if(!elements.has(id))elements.set(id,{value:'',type:'password',checked:true,hidden:false,disabled:false,textContent:'',open:false,attributes:{},setAttribute(k,v){this.attributes[k]=v;},showModal(){this.open=true;},close(){this.open=false;}});return elements.get(id);}
 const guest=[{id:'guest-1',name:'Device fragrance'}],local=new Map([['polo-fragrance-library-v1',JSON.stringify(guest)]]),notices=[];
 let current=[],authCallback,release,reads=0,saves=0,failing=fail;
 const session={user:{id:'owner-test',email:'tester@accounts.fragrance-library.invalid'}};
 let row=cloud.length?{items:cloud,version:1}:null;
 const client={auth:{onAuthStateChange(cb){authCallback=cb;},async getSession(){return {data:{session:null}};},async signInWithPassword(){authCallback('SIGNED_IN',session);return {data:{session}};},async signUp(){authCallback('SIGNED_IN',session);return {data:{session}};},async signOut(){authCallback('SIGNED_OUT',null);return {}; }},from(){return {select(){return this;},eq(){return this;},async maybeSingle(){reads++;if(hold)await new Promise(resolve=>release=resolve);return failing?{error:Error('Read unavailable')}:{data:row};}};},async rpc(name,payload){assert.equal(name,'save_my_collection');assert.equal(payload.p_owner,session.user.id);assert.equal(payload.p_expected_version,row?.version||0);saves++;row={items:JSON.parse(JSON.stringify(payload.p_items)),version:(row?.version||0)+1};return {data:row.version};}};
 const code=fs.readFileSync(__dirname+'/auth.js','utf8').replace("await import('https://esm.sh/@supabase/supabase-js@2.117.3')",'await loadTestClient()');
 const events={};const sandbox={document:{addEventListener:(name,fn)=>events[name]=fn,visibilityState:'visible',querySelector:s=>element(s),querySelectorAll:s=>s==='[data-auth-mode]'?authModes:[]},window:{FRAGRANCE_CONFIG:{supabaseUrl:'https://example.supabase.co',supabasePublishableKey:'sb_publishable_test',registrationEnabled:true,emailPasswordEnabled:true,usernameAccounts:true},addEventListener:(name,fn)=>events[name]=fn},localStorage:{getItem:k=>local.get(k)||null,setItem:(k,v)=>local.set(k,v),removeItem:k=>local.delete(k)},UsernameAuth,CloudStore,setTimeout,clearTimeout,URL,URLSearchParams,location:{origin:'https://example.test',pathname:'/',hash:'',search:'',reload(){}},confirm:()=>true,loadTestClient:async()=>({createClient:()=>client})};
 vm.runInNewContext(code,sandbox);const account=sandbox.window.CollectionAccount;
 const initialize=()=>account.initialize({validate:items=>items,getCollection:()=>current,onCollection:items=>current=items,onState(){},onNotice:text=>notices.push(text)});
 function credentials(){element('#auth-email').value='tester';element('#auth-password').value='test-fixture-password';element('#auth-confirm').value='test-fixture-password';}
 return {emit:name=>events[name]?.(),account,initialize,element,credentials,local,guest,notices,authModes,release:()=>release(),failRead:value=>failing=value,get reads(){return reads;},get saves(){return saves;},get current(){return current;},get row(){return row;}};
}
test('sign-in waits for one account read and automatically merges device bottles without deleting them',async()=>{
 const s=fixture({hold:true,cloud:[{id:'cloud-1',name:'Account fragrance'}]});await s.initialize();s.account.open('signin');s.credentials();
 const pending=s.element('#auth-form').onsubmit({preventDefault(){}});await tick();
 assert.equal(s.reads,1);assert.equal(s.account.canEdit(),false);assert.equal(s.element('#account-dialog').open,true);
 s.release();await pending;await tick();assert.equal(s.reads,1);assert.equal(s.element('#account-dialog').open,false);assert.equal(s.current[0].id,'cloud-1');await tick();assert.equal(s.row.items.length,2);assert.equal(s.saves,1);assert.equal(s.local.get('polo-fragrance-library-v1'),JSON.stringify(s.guest));assert.ok(s.local.has('polo-fragrance-transferred-v1'));
});
test('sign-up automatically saves the device collection',async()=>{
 const s=fixture();await s.initialize();s.account.open('signup');s.credentials();
 await s.element('#auth-form').onsubmit({preventDefault(){}});await tick();
 assert.equal(s.account.hasUser(),true);assert.equal(s.element('#account-dialog').open,false);assert.equal(s.saves,1);assert.equal(s.current.length,1);
});
test('a failed collection load keeps editing blocked and reconnects automatically on network recovery',async()=>{
 const s=fixture({fail:true});await s.initialize();s.account.open();s.credentials();await s.element('#auth-form').onsubmit({preventDefault(){}});await tick();
 assert.equal(s.account.canEdit(),false);assert.equal(s.element('#account-dialog').open,true);assert.equal(s.element('#collection-error').hidden,false);assert.match(s.element('#auth-message').textContent,/collection could not load/);
 s.failRead(false);s.emit('online');await tick();assert.equal(s.account.canEdit(),true);assert.equal(s.element('#collection-error').hidden,true);
});

// Check the actual page as well as the simulated UI: every auth selector must exist.
test('account UI elements are present in the deployed HTML', async () => {
 const {readFile}=await import('node:fs/promises');
 const html=await readFile(require('node:path').join(__dirname,'index.html'),'utf8');
 const script=await readFile(require('node:path').join(__dirname,'auth.js'),'utf8');
 for(const [,id] of script.matchAll(/\$\('#([a-z0-9-]+)'\)/g)) {
  assert.ok(html.includes(`id="${id}"`),`Missing account UI element: ${id}`);
 }
});
