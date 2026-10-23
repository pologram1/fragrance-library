(function(root){
const MAX_AGE_DAYS=7;
function eligible(offer,now=Date.now()){
 const checked=Date.parse(offer.checked+'T00:00:00Z');
 return offer.currency==='USD' && offer.stock===true && offer.reviewed===true && offer.matching===true && Number.isFinite(offer.price) && offer.price>0 && Number.isFinite(checked) && checked<=now && now-checked<=MAX_AGE_DAYS*86400000;
}
function latest(offers,now=Date.now()){
 const bySeller=new Map();for(const o of offers||[]){if(o.reviewed!==true||o.matching!==true||o.currency!=='USD'||!Number.isFinite(o.price)||o.price<=0||!Number.isFinite(Date.parse(o.checked+'T00:00:00Z'))||Date.parse(o.checked+'T00:00:00Z')>now)continue;let key;try{key=new URL(o.url).hostname.replace(/^www\./,'');}catch{key=o.seller||String(bySeller.size);}const previous=bySeller.get(key);if(!previous||o.checked>=previous.checked)bySeller.set(key,o);}return [...bySeller.values()];
}
function sources(offers,now=Date.now()){return latest(offers,now).filter(o=>eligible(o,now));}
function value(offers,now=Date.now()){
 const valid=sources(offers,now),discount=valid.filter(o=>o.kind==='discount'),chosen=valid;
 if(!chosen.length)return {price:null,lowest:null,count:0,kind:null};
 const average=chosen.reduce((sum,o)=>sum+o.price,0)/chosen.length;
 return {price:average,lowest:Math.min(...valid.map(o=>o.price)),count:chosen.length,kind:discount.length?'market':'retail'};
}
const api={value,eligible,latest,sources,MAX_AGE_DAYS};if(typeof module!=='undefined')module.exports=api;else root.Pricing=api;
})(typeof window!=='undefined'?window:globalThis);
