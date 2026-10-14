(function(root){
 'use strict';
 async function available(fetcher,projectUrl,publishableKey){
  try{
   const response=await fetcher(projectUrl.replace(/\/$/,'')+'/auth/v1/settings',{headers:{apikey:publishableKey}});
   if(!response.ok)return false;
   const settings=await response.json();
   return settings.external?.google===true&&settings.disable_signup!==true;
  }catch{return false;}
 }
 async function start(client,returnUrl){
  const url=new URL(returnUrl);
  if(url.protocol!=='https:')throw Error('Sign-in requires HTTPS');
  // Google verifies the identity; no email confirmation is sent by this application.
  const {data,error}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:url.href}});
  if(error)throw error;
  return data;
 }
 const api={available,start};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.GoogleSignIn=api;
})(typeof globalThis!=='undefined'?globalThis:this);
