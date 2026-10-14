(function(){
 'use strict';
 const $=s=>document.querySelector(s);
 const GUEST_KEY='polo-fragrance-library-v1';
 let client=null,user=null,store=null,phase='unconfigured',epoch=0,mode='signin',callbacks=null,busy=false;
 const config=window.FRAGRANCE_CONFIG||{};
 const redirect=()=>location.origin+location.pathname;
 function message(text){$('#auth-message').textContent=text;}
 function guest(){try{return callbacks.validate(JSON.parse(localStorage.getItem(GUEST_KEY)||'[]'));}catch{return [];}}
 function ui(){
  $('#account-button').textContent=user?'Account':'Sign in';
  $('#account-email').textContent=user?.email||'';
  $('#account-panel').hidden=!user;$('#auth-form').hidden=Boolean(user)&&mode!=='update';
  $('#auth-tabs').hidden=Boolean(user)||phase==='unconfigured';
  $('#account-setup').hidden=phase!=='unconfigured'&&phase!=='unavailable';
  $('#account-setup').textContent=phase==='unconfigured'?'Account setup is in progress. For now, your guest collection is saved only in this browser.':phase==='unavailable'?'Account service could not load. Reload the page to try again.':'';
  $('#auth-submit').disabled=busy||!client||phase==='unconfigured'||phase==='unavailable';
  $('#auth-email').disabled=!client;$('#auth-password').disabled=!client;
  $('#auth-email-label').hidden=mode==='update';$('#auth-email').required=mode!=='update';
  $('#auth-password-label').hidden=mode==='reset';$('#auth-password').required=mode!=='reset';
  $('#auth-password').minLength=mode==='signin'?1:12;
  $('#auth-password').autocomplete=mode==='signin'?'current-password':'new-password';
  $('#auth-title').textContent=user&&mode!=='update'?'Your account':({signin:'Welcome back',signup:'Create your collection',reset:'Reset your password',update:'Choose a new password'})[mode];
  $('#auth-submit').textContent=busy?'Please wait…':({signin:'Sign in',signup:'Create account',reset:'Send reset link',update:'Save new password'})[mode];
  document.querySelectorAll('[data-auth-mode]').forEach(b=>{b.disabled=busy||(b.dataset.authMode==='signup'&&!config.registrationEnabled);b.setAttribute('aria-pressed',b.dataset.authMode===mode);});$('#forgot-password').disabled=busy||!client||!config.emailDeliveryReady;$('#registration-notice').hidden=Boolean(config.registrationEnabled)||!client;
  $('#guest-transfer').hidden=!user||phase!=='ready'||!guest().length;
  $('#sign-out').disabled=busy||phase==='loading'||Boolean(store?.dirty());
  $('#sync-retry').hidden=!['error','loading-error'].includes(phase);
  $('#sync-reload').hidden=!user||phase==='loading';
  const labels={unconfigured:'Guest collection · saved in this browser',unavailable:'Guest collection · account service unavailable',starting:'Connecting to account service…',guest:'Guest collection · sign in to save across devices',loading:'Loading your private collection…',ready:'Account collection · saved to cloud',saving:'Saving your collection…',error:'Changes not synced. Export a backup or retry.',conflict:'Collection changed on another device. Export your edits, then reload.', 'loading-error':'Could not load your account collection. Retry before editing.'};
  $('#sync-status').textContent=labels[phase]||'';
  $('#storage-note').textContent=user?'Your account collection is private. Export a backup whenever you need one.':'Guest collection stored in this browser. Export a backup to keep a copy.';
 }
 function setMode(next){if(next==='signup'&&!config.registrationEnabled)return;if(next==='reset'&&!config.emailDeliveryReady)return;mode=next;$('#auth-password').value='';message('');ui();}
 function open(){mode=user?'signin':'signin';message('');ui();$('#account-dialog').showModal();}
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
  $('#account-button').onclick=open;
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
   const email=$('#auth-email').value.trim(),password=$('#auth-password').value,submittedMode=mode;
   try{
    let result;
    if(mode==='signup')result=await client.auth.signUp({email,password,options:{emailRedirectTo:redirect()}});
    else if(mode==='reset')result=await client.auth.resetPasswordForEmail(email,{redirectTo:redirect()});
    else if(mode==='update')result=await client.auth.updateUser({password});
    else result=await client.auth.signInWithPassword({email,password});
    if(result.error)throw result.error;
    $('#auth-password').value='';
    if(submittedMode==='signup')message('If registration is available for this email, check your inbox to confirm your account before signing in.');
    else if(submittedMode==='reset')message('If an account exists for this email, a password reset link will arrive in your inbox.');
    else if(submittedMode==='update'){setMode('signin');message('Password updated.');}
    else $('#account-dialog').close();
   }catch(error){
    const code=error.code;
    message(code==='email_not_confirmed'?'Confirm your email before signing in.':code==='over_email_send_rate_limit'||code==='over_request_rate_limit'?'Too many attempts. Please wait and try again.':submittedMode==='signin'?'Could not sign in. Check your email and password.':submittedMode==='signup'?'Account creation failed. Please try again later or use another email.':'The request could not be completed. Try again.');
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
   await setAccount(data.session);ui();
  }catch{phase='unavailable';client=null;callbacks.onCollection(guest());notify();}
 }
 window.CollectionAccount={initialize,save(items){return store?.save(items)||false;},
  hasUser:()=>Boolean(user),canEdit:()=>!user||['ready','saving','error','conflict'].includes(phase),
  pending:()=>Boolean(store?.dirty()),open};
})();
