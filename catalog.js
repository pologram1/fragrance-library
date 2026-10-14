(function(root){
 'use strict';
 const normalize=s=>String(s).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 function filter(records,{query='',brand='',imagesOnly=false,imageAvailable=f=>Boolean(f.image)}={}){
  const terms=normalize(query).trim().split(/\s+/).filter(Boolean);
  return records.filter(f=>(!brand||f.brand===brand)&&(!imagesOnly||imageAvailable(f))&&terms.every(t=>normalize(`${f.brand} ${f.name} ${f.barcode||''}`).includes(t)));
 }
 function page(records,index=1,size=24){
  const pages=Math.max(1,Math.ceil(records.length/size)),current=Math.min(pages,Math.max(1,index));
  return {items:records.slice((current-1)*size,current*size),current,pages,total:records.length};
 }
 const api={normalize,filter,page};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.Catalog=api;
})(typeof globalThis!=='undefined'?globalThis:this);
