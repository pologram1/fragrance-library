(function(root){
 'use strict';
 const normalize=s=>String(s).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 function filter(records,{query='',brand='',concentration='',ownership='',inCollection=()=>false,inWishlist=()=>false,minPrice='',maxPrice='',getPrice=()=>null,imagesOnly=false,imageAvailable=f=>Boolean(f.image)}={}){
  const terms=normalize(query).trim().split(/\s+/).filter(Boolean);
  const lower=minPrice!==''&&Number.isFinite(Number(minPrice))?Number(minPrice):null,upper=maxPrice!==''&&Number.isFinite(Number(maxPrice))?Number(maxPrice):null;
  return records.filter(f=>{
   if(brand&&f.brand!==brand||concentration&&f.concentration!==concentration||imagesOnly&&!imageAvailable(f))return false;
   if(ownership==='owned'&&!inCollection(f)||ownership==='not-owned'&&inCollection(f)||ownership==='wishlist'&&!inWishlist(f))return false;
   if(lower!==null||upper!==null){const price=getPrice(f);if(!Number.isFinite(price)||lower!==null&&price<lower||upper!==null&&price>upper)return false;}
   return terms.every(t=>normalize(`${f.brand} ${f.name} ${f.barcode||''}`).includes(t));
  });
 }
 function page(records,index=1,size=24){
  const pages=Math.max(1,Math.ceil(records.length/size)),current=Math.min(pages,Math.max(1,index));
  return {items:records.slice((current-1)*size,current*size),current,pages,total:records.length};
 }
 const api={normalize,filter,page};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.Catalog=api;
})(typeof globalThis!=='undefined'?globalThis:this);
