(function(root){
 'use strict';
 // Serialize snapshots and use a server-side version check to prevent silent overwrites.
 function create(client,userId,initialVersion,onStatus=()=>{}){
  let version=initialVersion,pending=null,running=false,failed=null,alive=true;
  async function flush(){
   if(running||failed||!alive||pending===null)return;
   running=true;
   while(alive&&pending!==null){
    const snapshot=pending;pending=null;onStatus('saving');
    try{
     const {data,error}=await client.rpc('save_my_collection',{p_owner:userId,p_items:snapshot,p_expected_version:version});
     if(error)throw error;
     if(!Number.isInteger(data)||data<1)throw Error('Invalid save response');
     if(!alive)break;version=data;
    }catch(error){
     if(!alive)break;
     // Keep the latest unsaved edit instead of replacing it with the older request.
     if(pending===null)pending=snapshot;
     failed=error;onStatus(error.code==='40001'?'conflict':'error');break;
    }
   }
   running=false;if(alive&&!failed&&pending===null)onStatus('saved');
  }
  return {
   save(items){if(!alive)return false;pending=JSON.parse(JSON.stringify(items));onStatus(failed?(failed.code==='40001'?'conflict':'error'):'saving');void flush();return true;},
   retry(){if(!alive||failed?.code==='40001')return false;failed=null;void flush();return true;},
   dirty(){return running||pending!==null;},
   invalidate(){alive=false;pending=null;},
   version(){return version;}
  };
 }
 const api={create};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CloudStore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
