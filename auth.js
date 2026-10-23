(function(){
 'use strict';
 const $=s=>document.querySelector(s);
 const GUEST_KEY='polo-fragrance-library-v1';
 const TRANSFER_KEY='polo-fragrance-transferred-v1';
 let client=null,user=null,store=null,phase='unconfigured',epoch=0,mode='signin',callbacks=null,busy=false,googleReady=false,googleChecking=false,accountLoad=null;
 let readRetryTimer=null,readAttempts=0;
 const config=window.FRAGRANCE_CONFIG||{};
 const redirect=()=>location.origin+location.pathname;
 function message(text){$('#auth-message').textContent=text;}
 function guest(){try{return callbacks.validate(JSON.parse(localStorage.getItem(GUEST_KEY)||'[]'));}catch{return [];}}
 function ui(){
  $('#account-button').textContent=user?'Account':'Sign in';
  $('#account-email').textContent=UsernameAuth.display(user);$('#signup-button').hidden=Boolean(user);$('#signup-button').disabled=busy||!client;
  $('#account-panel').hidden=!user;$('#auth-form').hidden=mode!=='update'&&(!config.emailPasswordEnabled||Boolean(user));$('#google-panel').hidden=Boolean(config.usernameAccounts)||Boolean(user)||mode==='update';$('#google-signin').disabled=busy||!client||!googleReady;$('#google-signin').textContent=busy?'Please wait…':'Continue with Google';$('#google-status').textContent=googleChecking?'Checking Google sign-in…':googleReady?'Create an account or sign in with your Google account.':'Google sign-in is being configured. Your guest collection is available meanwhile.';
  $('#auth-tabs').hidden=Boolean(user)||phase==='unconfigured'||!config.emailPasswordEnabled;
  $('#account-setup').hidden=phase!=='unconfigured'&&phase!=='unavailable';
  $('#account-setup').textContent=phase==='unconfigured'?'Account setup is in progress. For now, your guest collection is saved only in this browser.':phase==='unavailable'?'Account service could not load. Reload the page to try again.':'';
  $('#auth-submit').disabled=busy||!client||phase==='unconfigured'||phase==='unavailable';
  $('#auth-email').disabled=busy||!client;$('#auth-password').disabled=busy||!client;
  $('#auth-email-label').hidden=mode==='update';$('#auth-email').required=mode!=='update';
  $('#auth-password-label').hidden=mode==='reset';$('#auth-password').required=mode!=='reset';
  $('#auth-password').minLength=mode==='signin'?1:12;$('#auth-confirm-label').hidden=mode!=='signup';$('#auth-confirm').required=mode==='signup';$('#auth-confirm').disabled=busy||mode!=='signup';$('#forgot-password').hidden=!config.emailDeliveryReady;
  $('#auth-password').autocomplete=mode==='signin'?'current-password':'new-password';
  $('#auth-title').textContent=user&&mode!=='update'?'Your account':({signin:'Welcome back',signup:'Create your collection',reset:'Reset your password',update:'Choose a new password'})[mode];
  $('#auth-submit').textContent=busy?'Please wait…':({signin:'Sign in',signup:'Create account',reset:'Send reset link',update:'Save new password'})[mode];
  document.querySelectorAll('[data-auth-mode]').forEach(b=>{b.disabled=busy||(b.dataset.authMode==='signup'&&!config.registrationEnabled);b.setAttribute('aria-pressed',b.dataset.authMode===mode);});$('#forgot-password').disabled=busy||!client||!config.emailDeliveryReady;$('#registration-notice').hidden=Boolean(config.registrationEnabled)||!client||!config.emailPasswordEnabled;
  $('#sign-out').disabled=busy||phase==='loading'||Boolean(store?.dirty());
  const errors={error:'Your latest changes are kept on this device while we reconnect automatically.',conflict:'This collection changed on another device. Your recent edits are kept here and have not overwritten those changes.','loading-error':'Your collection could not load. We will reconnect automatically when you return or your connection recovers.'};
  $('#collection-error').hidden=!errors[phase];$('#collection-error').textContent=errors[phase]||'';
 }
 function setMode(next){$('#auth-password').type='password';$('#toggle-auth-password').textContent='Show password';$('#toggle-auth-password').setAttribute('aria-pressed','false');if(next==='signup'&&!config.registrationEnabled)return;if(next==='reset'&&!config.emailDeliveryReady)return;mode=next;$('#auth-password').value='';$('#auth-confirm').value='';message('');ui();}
 function open(next='signin'){setMode(typeof next==='string'?next:'signin');message('');ui();$('#account-dialog').showModal();if(client&&!config.usernameAccounts)void checkGoogle();}
 async function checkGoogle(){if(googleChecking)return;googleChecking=true;ui();googleReady=await GoogleSignIn.available(fetch,config.supabaseUrl,config.supabasePublishableKey);googleChecking=false;ui();}
 function notify(){ui();callbacks?.onState();}
 function setAccount(session,force=false){
  const next=session?.user||null;
  if(!force&&phase!=='starting'&&next?.id===user?.id)return accountLoad||Promise.resolve();
  const operation=loadAccount(session);accountLoad=operation;
  void operation.finally(()=>{if(accountLoad===operation)accountLoad=null;});
  return operation;
 }
 async function loadAccount(session){
  clearTimeout(readRetryTimer);readRetryTimer=null;
  const next=session?.user||null;
  const ticket=++epoch;store?.invalidate();store=null;user=next;
  const adminLink=$('#admin-link');if(adminLink)adminLink.hidden=true;
  if(user&&client)void client.rpc('library_admin',{p_action:'context',p_input:{}}).then(({data,error})=>{if(ticket===epoch&&adminLink)adminLink.hidden=Boolean(error)||!data;}).catch(()=>{});
  $('#editor').close();$('#prices').close();
  if(!user){readAttempts=0;phase='guest';callbacks.onCollection(guest());notify();return;}
  phase='loading';callbacks.onCollection([]);notify();
  try{
   const {data,error}=await client.from('user_collections').select('items,version').eq('user_id',user.id).maybeSingle();
   if(error)throw error;if(ticket!==epoch)return;
   const items=callbacks.validate(data?.items||[]);
   store=CloudStore.create(client,user.id,data?.version||0,status=>{
    if(ticket!==epoch)return;phase=({saved:'ready',saving:'saving',conflict:'conflict',error:'error'})[status];notify();
   },{storage:localStorage});
   readAttempts=0;phase='ready';const recovered=store.resume(items,callbacks.validate);
   callbacks.onCollection(recovered.items);if(recovered.conflict)phase='conflict';
   if(!recovered.conflict)transferGuest();notify();
  }catch{if(ticket===epoch){phase='loading-error';notify();if(readAttempts<5){readRetryTimer=setTimeout(()=>{readRetryTimer=null;void reconnect();},[1000,2000,5000,10000,20000][readAttempts++]);readRetryTimer?.unref?.();}}}
 }
 function transferGuest(){
  if(!['ready','saving'].includes(phase)||!store)return false;
  const local=guest(),current=callbacks.getCollection(),ids=new Set(current.map(f=>f.id));
  let receipts={};try{receipts=JSON.parse(localStorage.getItem(TRANSFER_KEY)||'{}');if(!receipts||typeof receipts!=='object'||Array.isArray(receipts))receipts={};}catch{}
  const transferred=new Set(Array.isArray(receipts[user.id])?receipts[user.id]:[]);
  const additions=local.filter(f=>!ids.has(f.id)&&!transferred.has(f.id));
  if(!additions.length){remember();return false;}
  const merged=current.concat(additions);
  try{callbacks.validate(merged);}catch{message('The combined collection is too large. Your device collection has been kept.');return false;}
  callbacks.onCollection(merged);store.save(merged);
  remember();
  return true;
  function remember(){receipts[user.id]=[...new Set([...transferred,...local.map(f=>f.id)])];try{localStorage.setItem(TRANSFER_KEY,JSON.stringify(receipts));}catch{}}
 }
 async function reconnect(){
  if(!client||!user||phase==='loading'||accountLoad||busy)return;
  if(store?.dirty()){store.retry();return;}
  await setAccount({user},true);
 }
 async function initialize(options){
  callbacks=options;
  $('#account-button').onclick=()=>open();$('#signup-button').onclick=()=>open('signup');$('#google-signin').onclick=async()=>{if(!client||busy||!googleReady)return;busy=true;message('');ui();try{await GoogleSignIn.start(client,redirect());}catch{message('Google sign-in could not start. Please try again.');}finally{busy=false;ui();}};
  document.querySelectorAll('[data-auth-mode]').forEach(b=>b.onclick=()=>setMode(b.dataset.authMode));
  $('#forgot-password').onclick=()=>setMode('reset');
  $('#toggle-auth-password').onclick=()=>{const shown=$('#auth-password').type==='password';$('#auth-password').type=shown?'text':'password';$('#toggle-auth-password').textContent=shown?'Hide password':'Show password';$('#toggle-auth-password').setAttribute('aria-pressed',String(shown));};
  $('#sign-out').onclick=async()=>{
   if(store?.dirty())return;busy=true;ui();
   const {error}=await client.auth.signOut({scope:'local'});busy=false;
   if(error){message('Sign out failed. Please try again.');ui();return;}
   await setAccount(null,true);$('#account-dialog').close();
  };
  $('#auth-form').onsubmit=async event=>{
   event.preventDefault();if(!client||busy)return;if(mode==='signup'&&!config.registrationEnabled||mode==='reset'&&!config.emailDeliveryReady){message('Account emails are not available yet.');return;}busy=true;message('');ui();
   const password=$('#auth-password').value,submittedMode=mode;
   try{
    let result;
    const credentials=UsernameAuth.credentials($('#auth-email').value,password,$('#auth-confirm').value,mode==='signup');
    const email=credentials.email;
    if(mode==='signup')result=await client.auth.signUp(credentials);
    else if(mode==='reset')result=await client.auth.resetPasswordForEmail(email,{redirectTo:redirect()});
    else if(mode==='update')result=await client.auth.updateUser({password});
    else result=await client.auth.signInWithPassword({email,password});
    if(result.error)throw result.error;
    $('#auth-password').value='';$('#auth-confirm').value='';
    if(submittedMode==='signup'){
     if(result.data?.session){
      await setAccount(result.data.session);
      if(store){$('#account-dialog').close();callbacks.onNotice?.('Account created. Your collection is ready.');}
      else message('Account created, but your collection could not load. It will reconnect automatically when your connection recovers.');
     }else message('This username may already be registered. Try signing in or choose another username.');
    }
    else if(submittedMode==='reset')message('If an account exists for this email, a password reset link will arrive in your inbox.');
    else if(submittedMode==='update'){setMode('signin');message('Password updated.');}
    else {
     if(!result.data?.session)throw Error('Sign-in did not return a session');
     await setAccount(result.data.session);
     if(store){$('#account-dialog').close();callbacks.onNotice?.('Welcome back.');}
     else message('Signed in, but your collection could not load. It will reconnect automatically when your connection recovers.');
    }
   }catch(error){
    const code=error.code;if(!code&&error.message&&/characters|Passwords do not match|Enter your password/.test(error.message)){message(error.message);return;}
    message(code==='email_not_confirmed'?'Confirm your email before signing in.':code==='over_email_send_rate_limit'||code==='over_request_rate_limit'?'Too many attempts. Please wait and try again.':submittedMode==='signin'?'Could not sign in. Check your username and password.':submittedMode==='signup'?'Could not create this account. Try another username or wait and try again.':'The request could not be completed. Try again.');
   }finally{busy=false;ui();}
  };
  window.addEventListener('beforeunload',e=>{if(store?.dirty()&&!store.durable()){e.preventDefault();e.returnValue='';}});
  window.addEventListener('online',()=>void reconnect());
  window.addEventListener('focus',()=>void reconnect());
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')void reconnect();});
  ui();
  let url;
  try{url=new URL(config.supabaseUrl);}catch{return;}
  if(url.protocol!=='https:'||!url.hostname.endsWith('.supabase.co')||!config.supabasePublishableKey?.startsWith('sb_publishable_'))return;
  phase='starting';notify();
  try{
   const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2.117.3');
   client=createClient(url.href,config.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
   client.auth.onAuthStateChange((event,session)=>{
    // Do not call async Supabase methods inside its auth callback lock.
    setTimeout(()=>{
     if(event==='PASSWORD_RECOVERY'){setMode('update');$('#account-dialog').showModal();}
     void setAccount(session);
    },0);
   });
   const {data,error}=await client.auth.getSession();if(error)throw error;
   await setAccount(data.session);ui();if(!config.usernameAccounts)void checkGoogle();const errors=new URLSearchParams(location.hash.slice(1));if(errors.has('error')||new URLSearchParams(location.search).has('error')){open();message('Google sign-in was not completed. You can try again.');}
  }catch{phase='unavailable';client=null;callbacks.onCollection(guest());notify();}
 }
 window.CollectionAccount={initialize,save(items){return store?.save(items)||false;},
  hasUser:()=>Boolean(user),canEdit:()=>!user||['ready','saving','error','conflict'].includes(phase),
  pending:()=>Boolean(store?.dirty()),refresh:ui,open};
})();
