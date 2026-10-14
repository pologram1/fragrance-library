(function(){
 'use strict';
 const $=s=>document.querySelector(s);
 const GUEST_KEY='polo-fragrance-library-v1';
 let client=null,user=null,store=null,phase='unconfigured',epoch=0,mode='signin',callbacks=null,busy=false,googleReady=false,googleChecking=false;
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
  $('#auth-email').disabled=!client;$('#auth-password').disabled=!client;
  $('#auth-email-label').hidden=mode==='update';$('#auth-email').required=mode!=='update';
  $('#auth-password-label').hidden=mode==='reset';$('#auth-password').required=mode!=='reset';
  $('#auth-password').minLength=mode==='signin'?1:12;$('#auth-confirm-label').hidden=mode!=='signup';$('#auth-confirm').required=mode==='signup';$('#auth-confirm').disabled=busy||mode!=='signup';$('#forgot-password').hidden=!config.emailDeliveryReady;
  $('#auth-password').autocomplete=mode==='signin'?'current-password':'new-password';
  $('#auth-title').textContent=user&&mode!=='update'?'Your account':({signin:'Welcome back',signup:'Create your collection',reset:'Reset your password',update:'Choose a new password'})[mode];
  $('#auth-submit').textContent=busy?'Please wait…':({signin:'Sign in',signup:'Create account',reset:'Send reset link',update:'Save new password'})[mode];
  document.querySelectorAll('[data-auth-mode]').forEach(b=>{b.disabled=busy||(b.dataset.authMode==='signup'&&!config.registrationEnabled);b.setAttribute('aria-pressed',b.dataset.authMode===mode);});$('#forgot-password').disabled=busy||!client||!config.emailDeliveryReady;$('#registration-notice').hidden=Boolean(config.registrationEnabled)||!client||!config.emailPasswordEnabled;
  $('#guest-transfer').hidden=!user||phase!=='ready'||!guest().length;
  $('#sign-out').disabled=busy||phase==='loading'||Boolean(store?.dirty());
  $('#sync-retry').hidden=!['error','loading-error'].includes(phase);
  $('#sync-reload').hidden=!user||phase==='loading';
  const labels={unconfigured:'Guest collection · saved in this browser',unavailable:'Guest collection · account service unavailable',starting:'Connecting to account service…',guest:'Guest collection · sign in to save across devices',loading:'Loading your private collection…',ready:'Account collection · saved to cloud',saving:'Saving your collection…',error:'Changes not synced. Export a backup or retry.',conflict:'Collection changed on another device. Export your edits, then reload.', 'loading-error':'Could not load your account collection. Retry before editing.'};
  $('#sync-status').textContent=labels[phase]||'';
  $('#storage-note').textContent=user?'Your account collection is private. Export a backup whenever you need one.':'Guest collection stored in this browser. Export a backup to keep a copy.';
 }
 function setMode(next){if(next==='signup'&&!config.registrationEnabled)return;if(next==='reset'&&!config.emailDeliveryReady)return;mode=next;$('#auth-password').value='';$('#auth-confirm').value='';message('');ui();}
 function open(next='signin'){mode=typeof next==='string'?next:'signin';message('');ui();$('#account-dialog').showModal();if(client&&!config.usernameAccounts)void checkGoogle();}
 async function checkGoogle(){if(googleChecking)return;googleChecking=true;ui();googleReady=await GoogleSignIn.available(fetch,config.supabaseUrl,config.supabasePublishableKey);googleChecking=false;ui();}
 function notify(){ui();callbacks?.onState();}
 async function setAccount(session,force=false){
  const next=session?.user||null;
  if(!force&&phase!=='starting'&&next?.id===user?.id)return;
  const ticket=++epoch;store?.invalidate();store=null;user=next;
  $('#editor').close();$('#prices').close();
  if(!user){phase='guest';callbacks.onCollection(guest());notify();return;}
  phase='loading';callbacks.onCollection([]);notify();
  try{
   const {data,error}=await client.from('user_collections').select('items,version').eq('user_id',user.id).maybeSingle();
   if(error)throw error;if(ticket!==epoch)return;
   const items=callbacks.validate(data?.items||[]);
   store=CloudStore.create(client,user.id,data?.version||0,status=>{
    if(ticket!==epoch)return;phase=({saved:'ready',saving:'saving',conflict:'conflict',error:'error'})[status];notify();
   });
   phase='ready';callbacks.onCollection(items);notify();
  }catch{if(ticket===epoch){phase='loading-error';notify();}}
 }
 async function initialize(options){
  callbacks=options;
  $('#account-button').onclick=()=>open();$('#signup-button').onclick=()=>open('signup');$('#google-signin').onclick=async()=>{if(!client||busy||!googleReady)return;busy=true;message('');ui();try{await GoogleSignIn.start(client,redirect());}catch{message('Google sign-in could not start. Please try again.');}finally{busy=false;ui();}};
  document.querySelectorAll('[data-auth-mode]').forEach(b=>b.onclick=()=>setMode(b.dataset.authMode));
  $('#forgot-password').onclick=()=>setMode('reset');
  $('#guest-transfer').onclick=()=>{
   if(phase!=='ready')return;
   const local=guest();if(!local.length||!confirm('Copy this browser’s guest collection into your signed-in account? Existing account items will be kept.'))return;
   const current=callbacks.getCollection(),ids=new Set(current.map(f=>f.id));
   const merged=current.concat(local.filter(f=>!ids.has(f.id)));
   try{callbacks.validate(merged);}catch{message('The combined collection is too large. Export a backup and import a smaller collection.');return;}
   callbacks.onCollection(merged);store.save(merged);message('Guest items copied. Your original guest collection is kept in this browser.');
  };
  $('#sign-out').onclick=async()=>{
   if(store?.dirty())return;busy=true;ui();
   const {error}=await client.auth.signOut({scope:'local'});busy=false;
   if(error){message('Sign out failed. Please try again.');ui();return;}
   await setAccount(null,true);$('#account-dialog').close();
  };
  $('#sync-retry').onclick=()=>phase==='loading-error'?setAccount({user},true):store?.retry();
  $('#sync-reload').onclick=()=>{if(store?.dirty()&&!confirm('Reload the cloud collection and discard unsynced changes? Export a backup first if you need to keep them.'))return;void setAccount({user},true);};
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
    $('#auth-password').value='';
    if(submittedMode==='signup'){if(result.data?.session){await setAccount(result.data.session,true);message('Account created. Your collection is ready.');}else message('Account creation did not return a session. Please try signing in.');}
    else if(submittedMode==='reset')message('If an account exists for this email, a password reset link will arrive in your inbox.');
    else if(submittedMode==='update'){setMode('signin');message('Password updated.');}
    else $('#account-dialog').close();
   }catch(error){
    const code=error.code;if(!code&&error.message&&/characters|Passwords do not match|Enter your password/.test(error.message)){message(error.message);return;}
    message(code==='email_not_confirmed'?'Confirm your email before signing in.':code==='over_email_send_rate_limit'||code==='over_request_rate_limit'?'Too many attempts. Please wait and try again.':submittedMode==='signin'?'Could not sign in. Check your username and password.':submittedMode==='signup'?'Could not create this account. Try another username or wait and try again.':'The request could not be completed. Try again.');
   }finally{busy=false;ui();}
  };
  window.addEventListener('beforeunload',e=>{if(store?.dirty()){e.preventDefault();e.returnValue='';}});
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
  pending:()=>Boolean(store?.dirty()),open};
})();
