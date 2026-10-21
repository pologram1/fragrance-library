(function(root){
 'use strict';
 // Serialize snapshots and use a server-side version check to prevent silent overwrites.
 function create(client,userId,initialVersion,onStatus=()=>{},options={}){
  let version=initialVersion,pending=null,running=false,failed=null,alive=true,retryTimer=null,retryAttempt=0,durable=false;
  const storage=options.storage,key='polo-fragrance-pending:'+userId;
  const retryDelays=options.retryDelays||[1000,2000,4000,8000,15000];
  function persist(items){durable=false;try{if(storage&&typeof storage.setItem==='function'){storage.setItem(key,JSON.stringify({owner:userId,version,items}));durable=true;}}catch{}}
  function clearDraft(){try{storage?.removeItem(key);}catch{}}
  function scheduleRetry(){
   if(!alive||failed?.code==='40001'||retryTimer||retryAttempt>=retryDelays.length)return;
   retryTimer=setTimeout(()=>{retryTimer=null;failed=null;void flush();},retryDelays[retryAttempt++]);
   retryTimer?.unref?.();
  }
  async function flush(){
   if(running||failed||!alive||pending===null)return;
   running=true;
   while(alive&&pending!==null){
    const snapshot=pending;pending=null;onStatus('saving');
    try{
     const {data,error}=await client.rpc('save_my_collection',{p_owner:userId,p_items:snapshot,p_expected_version:version});
     if(error)throw error;
     if(!Number.isInteger(data)||data<1)throw Error('Invalid save response');
     if(!alive)break;version=data;retryAttempt=0;
     if(pending!==null)persist(pending);else clearDraft();
    }catch(error){
     if(!alive)break;
     // Keep the latest unsaved edit instead of replacing it with the older request.
     if(pending===null)pending=snapshot;
     failed=error;persist(pending);onStatus(error.code==='40001'?'conflict':'error');scheduleRetry();break;
    }
   }
   running=false;if(alive&&!failed&&pending===null)onStatus('saved');
  }
  return {
   save(items){if(!alive)return false;pending=JSON.parse(JSON.stringify(items));persist(pending);if(failed&&failed.code!=='40001'){retryAttempt=0;scheduleRetry();}onStatus(failed?(failed.code==='40001'?'conflict':'error'):'saving');void flush();return true;},
   retry(){if(!alive||failed?.code==='40001')return false;clearTimeout(retryTimer);retryTimer=null;retryAttempt=0;failed=null;void flush();return true;},
   resume(serverItems,validate){
    let draft;try{draft=JSON.parse(storage?.getItem(key)||'null');}catch{return {items:serverItems,conflict:false};}
    if(!draft||draft.owner!==userId||!Number.isInteger(draft.version))return {items:serverItems,conflict:false};
    let items;try{items=validate(draft.items);}catch{return {items:serverItems,conflict:false};}
    if(JSON.stringify(items)===JSON.stringify(serverItems)){clearDraft();return {items:serverItems,conflict:false};}
    if(draft.version!==version){pending=items;durable=true;failed={code:'40001'};onStatus('conflict');return {items,conflict:true};}
    this.save(items);return {items,conflict:false};
   },
   dirty(){return running||pending!==null;},
   durable(){return durable;},
   invalidate(){alive=false;pending=null;clearTimeout(retryTimer);retryTimer=null;},
   version(){return version;}
  };
 }
 const api={create};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CloudStore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
