(function(root){
'use strict';
const pricing=typeof module!=='undefined'?require('./pricing.js'):root.Pricing;
let profiles=new Map(),adminProfiles=new Map();
function cleanLink(value){
 try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password)return null;
 for(const key of [...u.searchParams.keys()])if(!['variant','sku','pid'].includes(key.toLowerCase()))u.searchParams.delete(key);
 if(!(/(?:^|\.)fragrancenet\.com$/.test(u.hostname)&&/^#\d+$/.test(u.hash)))u.hash='';return u.href;}catch{return null;}
}
function configure(data,{append=false}={}){
 const next=append?new Map(profiles):new Map();
 for(const p of data?.profiles||[]){if(!p||!Array.isArray(p.catalogIds)||typeof p.name!=='string'||typeof p.concentration!=='string'||!Array.isArray(p.sources)||!p.sources.some(s=>cleanLink(s.url)))continue;for(const id of p.catalogIds)if(typeof id==='string')next.set(id,p);}
 profiles=next;
}
function configureAdmin(rows){adminProfiles=new Map(rows.filter(r=>r.status==='published'&&r.payload?.profile).map(r=>[r.id,r.payload.profile]));}
function profile(record){for(const id of [record.catalogId||record.id,...(record.sourceIds||[])]){const p=adminProfiles.get(id)||profiles.get(id);if(p&&(!record.concentration||record.concentration===p.concentration))return p;}return null;}
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
function bottleVariants(record,catalog){
 const source=value=>{const link=cleanLink(value);if(!link)return null;const u=new URL(link);return u.hostname.replace(/^www\./,'')+u.pathname.replace(/\/$/,'');};
 const product=source(record.sourceUrl),same=s=>String(s||'').trim().toLowerCase(),sizes=new Map();
 if(!product)return [];
 for(const item of catalog){if(source(item.sourceUrl)!==product||same(item.brand)!==same(record.brand)||same(item.name)!==same(record.name)||item.concentration!==record.concentration||(item.type||'standard')!==(record.type||'standard')||!Number.isFinite(item.sizeMl)||item.sizeMl<=0)continue;if(!sizes.has(item.sizeMl)||item.id===record.id)sizes.set(item.sizeMl,item);}
 return [...sizes.values()].sort((a,b)=>a.sizeMl-b.sizeMl);
}
const api={configure,configureAdmin,profile,sellerLinks,cleanLink,priceEvidence,bottleVariants};if(typeof module!=='undefined')module.exports=api;else root.FragranceDetails=api;
})(typeof globalThis!=='undefined'?globalThis:this);
