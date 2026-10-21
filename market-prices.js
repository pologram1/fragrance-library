(function(root){
'use strict';
let entries=new Map();
const normalize=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
function key(f){return [normalize(f.brand),normalize(f.name),normalize(f.concentration),Number(f.sizeMl??f.size),f.type||'standard'].join('|');}
function configure(data){
 const next=new Map();
 for(const row of data?.products||[]){
  if(!row||!Array.isArray(row.offers)||!row.brand||!row.name||!row.concentration||!Number.isFinite(row.sizeMl)||!['standard','tester'].includes(row.type))continue;
  const valid=row.offers.filter(o=>{try{return new URL(o.url).protocol==='https:'&&o.currency==='USD'&&Number.isFinite(o.price)&&o.price>0&&typeof o.seller==='string'&&['discount','retail'].includes(o.kind)&&/^\d{4}-\d{2}-\d{2}$/.test(o.checked)&&['stock','reviewed','matching'].every(k=>typeof o[k]==='boolean');}catch{return false;}});
  const k=key(row);next.set(k,[...(next.get(k)||[]),...valid]);
 }
 entries=next;
}
function offers(f){return (entries.get(key(f))||[]).map(o=>({...o}));}
function apply(f){return {...f,offers:[...offers(f),...(f.offers||[])]};}
function complete(f){return Boolean(f.brand?.trim()&&f.name?.trim()&&['Eau de Parfum','Eau de Toilette','Parfum','Extrait de Parfum','Eau de Cologne','Other'].includes(f.concentration)&&Number.isFinite(f.sizeMl)&&f.sizeMl>=1&&f.sizeMl<=2000);}
const api={key,configure,offers,apply,complete};if(typeof module!=='undefined')module.exports=api;else root.MarketPrices=api;
})(typeof globalThis!=='undefined'?globalThis:this);
