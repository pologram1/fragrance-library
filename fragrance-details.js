(function(root){
'use strict';
const pricing=typeof module!=='undefined'?require('./pricing.js'):root.Pricing;
let profiles=new Map();
function cleanLink(value){
 try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password)return null;
 for(const key of [...u.searchParams.keys()])if(!['variant','sku','pid'].includes(key.toLowerCase()))u.searchParams.delete(key);
 if(!(/(?:^|\.)fragrancenet\.com$/.test(u.hostname)&&/^#\d+$/.test(u.hash)))u.hash='';return u.href;}catch{return null;}
}
function configure(data){
 const next=new Map();
 for(const p of data?.profiles||[]){if(!p||!Array.isArray(p.catalogIds)||typeof p.name!=='string'||typeof p.concentration!=='string'||!Array.isArray(p.sources)||!p.sources.some(s=>cleanLink(s.url)))continue;for(const id of p.catalogIds)if(typeof id==='string')next.set(id,p);}
 profiles=next;
}
function profile(record){const p=profiles.get(record.catalogId||record.id);return p&&(!record.concentration||record.concentration===p.concentration)?p:null;}
function sellerLinks(record,offers,now=Date.now()){
 const rows=new Map();
 for(const o of pricing.latest(offers,now)){const url=cleanLink(o.url);if(!url)continue;const host=new URL(url).hostname.replace(/^www\./,'');rows.set(host,{...o,url,current:pricing.eligible(o,now)});}
 const source=cleanLink(record.sourceUrl);
 if(source){const host=new URL(source).hostname.replace(/^www\./,'');const names={'perfumebox.com':'Perfume Box','olfactoryfactoryllc.com':'Olfactory Factory LLC','terramaterperfumes.com':'Terra Mater Perfumes','fragflex.com':'FragFlex','fragrancenet.com':'FragranceNet','jomashop.com':'Jomashop'};if(names[host]&&!rows.has(host))rows.set(host,{seller:names[host],url:source,price:null,current:false,stock:null,checked:null});}
 return [...rows.values()].sort((a,b)=>Number(b.current)-Number(a.current)||(a.current&&b.current?a.price-b.price:a.seller.localeCompare(b.seller)));
}
function priceEvidence(record,offers,now=Date.now()){
 const included=pricing.sources(offers,now),quote=pricing.value(offers,now),dates=included.map(o=>o.checked).sort();
 return {...quote,highest:included.length?Math.max(...included.map(o=>o.price)):null,perMl:quote.price===null||!record.sizeMl?null:quote.price/record.sizeMl,oldest:dates[0]||null,newest:dates.at(-1)||null};
}
const api={configure,profile,sellerLinks,cleanLink,priceEvidence};if(typeof module!=='undefined')module.exports=api;else root.FragranceDetails=api;
})(typeof globalThis!=='undefined'?globalThis:this);
