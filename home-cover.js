/* Campaign carousel: the selected cover stays first; product cards use approved
   catalog photos. Optional announcements are public content, never account data. */
(function(root){
 'use strict';
 function safeLink(value){
  if(typeof value!=='string')return null;
  if(/^#(?:menu|discover(?:\?[^\s<>"']*)?|owned|wishlist|fragrance\/[a-z0-9-]+)$/i.test(value))return value;
  try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password?url.href:null;}catch{return null;}
 }
 function announcements(data,now=Date.now()){
  const date=value=>typeof value==='string'&&/T.*(?:Z|[+-]\d\d:\d\d)$/.test(value)&&Number.isFinite(Date.parse(value));
  const seen=new Set();
  return (Array.isArray(data?.announcements)?data.announcements:[]).filter(item=>{
   if(!item||item.enabled!==true||!/^[-a-z0-9]+$/i.test(item.id||'')||seen.has(item.id)||typeof item.title!=='string'||!item.title.trim()||!safeLink(item.href))return false;
   if(item.startsAt&&(!date(item.startsAt)||Date.parse(item.startsAt)>now))return false;
   if(item.endsAt&&(!date(item.endsAt)||Date.parse(item.endsAt)<=now))return false;
   seen.add(item.id);return true;
  }).slice(0,3);
 }
 let selected='cover',events=[],context=null,loading=false;
 function render(records,options){
  const region=document.getElementById('scent-editorial'),host=document.getElementById('cover-extra');if(!region||!host)return;
  context={records,options};
  const {photoManifest,money,esc}=options;
  const approved=records.filter(f=>PhotoStandards.approved(f,photoManifest));
  // Two contrasting highlights, leaving the larger spotlight shelf independent.
  const products=[approved[0],approved.find(f=>Catalog.category(f)==='arabic')].filter((f,index,list)=>f&&list.indexOf(f)===index);
  const panels=products.map(f=>{
   const photo=PhotoStandards.approved(f,photoManifest),price=Pricing.value(MarketPrices.offers(f));
   return {id:'product-'+f.id,label:Catalog.brand(f)+' · '+f.name,html:`<div class="cover-campaign-copy"><p class="cover-kicker">From the fragrance library</p><p class="cover-brand">${esc(Catalog.brand(f))}</p><h2>${esc(f.name)}</h2><p class="cover-variant">${f.sizeMl} mL · ${esc(f.concentration)}</p><p class="cover-summary">Your next discovery starts with a closer look.</p><p class="cover-price">${price.price===null?'Market price being checked':money(price.price)+' · estimated market value'}</p><a class="cover-cta" href="#fragrance/${esc(f.id)}">Discover the fragrance <span aria-hidden="true">↗</span></a></div><figure class="cover-product-art"><img src="${esc(photo.url)}" alt="${esc(Catalog.brand(f)+' '+f.name)}" width="300" height="400" loading="lazy" decoding="async"><figcaption>${esc(Catalog.brand(f))} · ${f.sizeMl} mL</figcaption></figure>`};
  });
  panels.push({id:'explore',label:'Explore the fragrance houses',html:'<div class="cover-campaign-copy"><p class="cover-kicker">Find your point of view</p><h2>A world of scent.<br><em>Yours to explore.</em></h2><p class="cover-summary">Discover niche perfumes, designer perfumes, and Arabic perfumes. Follow a house. Find your signature.</p><a class="cover-cta" href="#discover">Explore the library <span aria-hidden="true">↗</span></a></div><div class="cover-house-art"><span aria-hidden="true">FL</span><nav aria-label="Explore fragrance houses"><a href="#discover?category=niche">niche perfumes ↗</a><a href="#discover?category=designer">designer perfumes ↗</a><a href="#discover?category=arabic">Arabic perfumes ↗</a></nav></div>'});
  for(const event of events){const href=safeLink(event.href);panels.push({id:'event-'+event.id,label:event.title,html:`<div class="cover-campaign-copy"><p class="cover-kicker">${esc(event.eyebrow||'From the studio')}</p><h2>${esc(event.title)}</h2><p class="cover-summary">${esc(typeof event.description==='string'?event.description:'')}</p><a class="cover-cta" href="${esc(href)}" ${href.startsWith('https:')?'target="_blank" rel="noopener noreferrer"':''}>${esc(event.linkLabel||'Explore the announcement')} <span aria-hidden="true">↗</span></a></div><div class="cover-house-art" aria-hidden="true"><span>FL</span><p>The Fragrance Library<br>by Polo Studios</p></div>`});}
  const ids=['cover',...panels.map(p=>p.id)];if(!ids.includes(selected))selected='cover';
  const controller=FragranceSpotlight.selection(ids,selected);
  host.innerHTML=panels.map(panel=>`<article class="cover-panel cover-campaign" data-cover-id="${esc(panel.id)}" aria-roledescription="slide" aria-label="${esc(panel.label)}" hidden inert>${panel.html}</article>`).join('');
  const dots=region.querySelector('.cover-dots'),status=region.querySelector('.cover-status'),counter=region.querySelector('.cover-counter');
  dots.innerHTML=[{id:'cover',label:'Puerto Rico cover'},...panels].map((panel,index)=>`<button type="button" data-cover-index="${index}" aria-label="Show cover: ${esc(panel.label)}" aria-pressed="false"><span aria-hidden="true"></span></button>`).join('');
  const slides=[region.querySelector('[data-cover-id="cover"]'),...host.querySelectorAll('.cover-panel')];
  function show(index,announce=false){
   const state=controller.go(index);selected=state.id;
   slides.forEach((slide,i)=>{slide.hidden=i!==state.index;slide.inert=i!==state.index;});
   dots.querySelectorAll('button').forEach((button,i)=>button.setAttribute('aria-pressed',String(i===state.index)));
   counter.textContent=String(state.index+1).padStart(2,'0')+' / '+String(ids.length).padStart(2,'0');
   if(announce)status.textContent=(state.index?panels[state.index-1].label:'The Fragrance Library · Puerto Rico')+' · slide '+(state.index+1)+' of '+ids.length;
  }
  region.querySelector('.cover-controls').hidden=false;
  region.querySelector('[data-cover-prev]').onclick=()=>show(controller.state().index-1,true);
  region.querySelector('[data-cover-next]').onclick=()=>show(controller.state().index+1,true);
  dots.querySelectorAll('button').forEach(button=>button.onclick=()=>show(Number(button.dataset.coverIndex),true));
  region.onkeydown=event=>{if(event.ctrlKey||event.metaKey||event.altKey)return;const next={ArrowLeft:controller.state().index-1,ArrowRight:controller.state().index+1,Home:0,End:ids.length-1}[event.key];if(next!==undefined){event.preventDefault();show(next,true);}};
  let touch=null;
  region.onpointerdown=event=>{touch=event.pointerType==='touch'&&!event.target.closest('a,button')?{x:event.clientX,y:event.clientY}:null;};
  region.onpointercancel=()=>{touch=null;};
  region.onpointerup=event=>{if(!touch)return;const dx=event.clientX-touch.x,dy=event.clientY-touch.y;touch=null;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.5)show(controller.state().index+(dx<0?1:-1),true);};
  host.querySelectorAll('img').forEach(img=>img.addEventListener('error',()=>{img.hidden=true;img.closest('figure').querySelector('figcaption').textContent='Photo temporarily unavailable';},{once:true}));
  show(controller.state().index);
  if(!loading){loading=true;fetch('data/home-highlights.json',{cache:'no-cache'}).then(response=>{if(!response.ok)throw Error('No announcements');return response.json();}).then(data=>{events=announcements(data);if(context)render(context.records,context.options);}).catch(()=>{/* The cover and catalog work without announcements. */});}
 }
 const api={safeLink,announcements,render};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.HomeCover=api;
})(typeof globalThis!=='undefined'?globalThis:this);
