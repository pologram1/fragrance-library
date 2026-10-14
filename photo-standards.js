(function(root){
 'use strict';
 function safeAsset(url){
  if(typeof url!=='string')return false;
  if(/^assets\/fragrances\/[a-z0-9.-]+$/.test(url))return true;
  try{return new URL(url).protocol==='https:';}catch{return false;}
 }
 function approved(record,manifest){
  const photo=manifest?.photos?.[record?.catalogId||record?.id];
  if(!photo||photo.status!=='approved'||!safeAsset(photo.url)||photo.width<300||photo.height<400)return null;
  if(!photo.review?.identityConfirmed||!photo.review?.reviewedBy||!/^([a-f0-9]{64})$/.test(photo.review?.sourceSha256||''))return null;
  const identity=photo.review.productIdentity;
  if(identity&&record?.catalogId&&((record.concentration&&record.concentration!==identity.concentration)||(record.size&&record.size!==identity.sizeMl)))return null;
  if(!['sharp','labelReadable','correctProduct','wholeBottle','cleanBackground'].every(k=>photo.checks?.[k]===true))return null;
  return photo;
 }
 const api={safeAsset,approved};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PhotoStandards=api;
})(typeof globalThis!=='undefined'?globalThis:this);
