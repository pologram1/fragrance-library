(function(root){
'use strict';
async function load(config,fetcher=fetch){
 const rows=[];
 for(let offset=0;offset<=100000;offset+=200){
  const response=await fetcher(config.supabaseUrl+'/rest/v1/rpc/library_catalog_updates',{method:'POST',signal:AbortSignal.timeout(8000),headers:{apikey:config.supabasePublishableKey,'Content-Type':'application/json'},body:JSON.stringify({p_offset:offset})});
  if(!response.ok)throw Error('Catalog updates unavailable');const batch=await response.json();if(!Array.isArray(batch))throw Error('Invalid catalog updates');rows.push(...batch);if(batch.length<200)return rows;
 }
 throw Error('Catalog updates exceed pagination limit');
}
function merge(records,manifest,updates){const result=new Map(records.map(f=>[f.id,f]));for(const row of updates){if(!row||typeof row.id!=='string')continue;if(row.status==='archived'){result.delete(row.id);continue;}const p=row.payload;if(row.status!=='published'||!p||typeof p.brand!=='string'||typeof p.name!=='string')continue;const old=result.get(row.id);result.set(row.id,{...old,...p,id:row.id,sourceIds:old?.sourceIds||[row.id]});if(p.photo)manifest.photos[row.id]=p.photo;}return [...result.values()];}
const api={load,merge};if(typeof module!=='undefined')module.exports=api;else root.CatalogUpdates=api;
})(typeof globalThis!=='undefined'?globalThis:this);
