(function(root){
 'use strict';
 function bucket(id){let hash=0;for(const c of id)hash=(hash*31+c.charCodeAt(0))>>>0;return String(hash%32).padStart(2,'0');}
 const catalogFields=['id','brand','name','concentration','sizeMl','sourceUrl','barcode','audience','type','sourceIds','barcodes','quantity'];
 function packCatalog(rows){return rows.map(f=>catalogFields.map(k=>k==='sourceIds'&&f[k]?.length===1?null:f[k]??null));}
 function unpackCatalog(rows){return rows.map(values=>{const row=Object.fromEntries(catalogFields.map((k,i)=>[k,values[i]]));row.sourceIds=row.sourceIds||[row.id];return row;});}
 function packPrices(rows){
  const sellers=[],index=new Map(),products={};
  for(const [id,offers] of rows){if(!offers.length)continue;products[id]=offers.map(o=>{if(!index.has(o.seller)){index.set(o.seller,sellers.length);sellers.push(o.seller);}return [index.get(o.seller),o.price,o.url,o.kind==='retail'?1:0,o.checked,o.stock?1:0,o.priceNote||''];});}
  return {version:1,sellers,products};
 }
 function unpackPrices(data){return new Map(Object.entries(data.products).map(([id,rows])=>[id,rows.map(o=>({seller:data.sellers[o[0]],price:o[1],url:o[2],kind:o[3]?'retail':'discount',checked:o[4],stock:Boolean(o[5]),priceNote:o[6],currency:'USD',reviewed:true,matching:true}))]));}
 function remaining(size,amount){const capacity=Number(size);if(!Number.isFinite(capacity)||capacity<=0)return {amount:0,percent:0};const value=amount===''?capacity:Number(amount);const ml=Math.round(Math.max(0,Math.min(capacity,Number.isFinite(value)?value:capacity))*10)/10;return {amount:ml,percent:Math.round(ml/capacity*100)};}
 const api={bucket,packCatalog,unpackCatalog,packPrices,unpackPrices,remaining};if(typeof module!=='undefined')module.exports=api;else root.RuntimeData=api;
})(typeof globalThis!=='undefined'?globalThis:this);
