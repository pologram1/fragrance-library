/* Manual discovery carousel. Selection survives ordinary catalog rerenders;
   browsing a highlight never creates or changes a personal collection entry. */
(function(root){
 'use strict';
 function selection(ids,currentId){
  let index=Math.max(0,ids.indexOf(currentId));
  const state=()=>({index,id:ids[index]||null,count:ids.length});
  return {state,go(next){index=ids.length?((next%ids.length)+ids.length)%ids.length:0;return state();}};
 }
 let currentId=null;
 function render(records,{photoManifest,money,esc}){
  const host=document.getElementById('home-picks'),region=document.getElementById('home-discovery');if(!host||!region)return;
  // Enforce photo review here too, even if a caller changes its selection rules.
  const choices=records.filter(f=>PhotoStandards.approved(f,photoManifest));
  const controller=selection(choices.map(f=>f.id),currentId);
  host.innerHTML=choices.map((f,index)=>{
   const photo=PhotoStandards.approved(f,photoManifest),quote=Pricing.value(MarketPrices.offers(f));
   const category=Catalog.categoryDefinitions.find(c=>c.id===Catalog.category(f));
   return `<article class="spotlight-slide" aria-roledescription="slide" aria-label="${index+1} of ${choices.length}: ${esc(Catalog.brand(f)+' '+f.name)}" ${index!==controller.state().index?'hidden inert':''}><div class="spotlight-copy"><p class="spotlight-kicker">${esc(category?.label||'From the library')}</p><p class="spotlight-brand">${esc(Catalog.brand(f))}</p><h3>${esc(f.name)}</h3><p class="spotlight-variant">${f.sizeMl} mL · ${esc(f.concentration)}</p><p class="spotlight-description">A closer look at the bottle, its notes, and where to find it.</p><div class="spotlight-price"><small>Estimated market value</small><strong>${quote.price===null?'Price being checked':money(quote.price)}</strong><span>${quote.price===null?'Explore the fragrance for available seller listings.':'Average of '+quote.count+' eligible seller'+(quote.count===1?'':'s')+' for this bottle.'}</span></div><a class="spotlight-explore" href="#fragrance/${esc(f.id)}">Explore this fragrance <span aria-hidden="true">↗</span></a></div><figure class="spotlight-visual"><img src="${esc(photo.url)}" alt="${esc(Catalog.brand(f)+' '+f.name)}" width="300" height="400" loading="lazy" decoding="async"><figcaption>${esc(Catalog.brand(f))} · ${f.sizeMl} mL</figcaption></figure></article>`;
  }).join('')||'<div class="spotlight-empty"><p>Preparing your next discovery.</p><a href="#discover">Explore the fragrance library →</a></div>';
  const controls=region.querySelector('.spotlight-controls'),dots=region.querySelector('.spotlight-dots'),status=region.querySelector('.spotlight-status'),count=region.querySelector('.spotlight-count');
  controls.hidden=choices.length<2;
  dots.innerHTML=choices.map((f,index)=>`<button type="button" data-spotlight-index="${index}" aria-label="Show ${esc(Catalog.brand(f)+' '+f.name)}" aria-pressed="false"><span aria-hidden="true"></span></button>`).join('');
  function show(next,announce=false){
   const selected=controller.go(next);currentId=selected.id;
   host.querySelectorAll('.spotlight-slide').forEach((slide,index)=>{slide.hidden=index!==selected.index;slide.inert=index!==selected.index;});
   dots.querySelectorAll('button').forEach((button,index)=>button.setAttribute('aria-pressed',String(index===selected.index)));
   count.textContent=choices.length?String(selected.index+1).padStart(2,'0')+' / '+String(choices.length).padStart(2,'0'):'';
   if(announce&&choices.length)status.textContent=Catalog.brand(choices[selected.index])+' '+choices[selected.index].name+' · '+(selected.index+1)+' of '+choices.length;
  }
  region.querySelector('[data-spotlight-prev]').onclick=()=>show(controller.state().index-1,true);
  region.querySelector('[data-spotlight-next]').onclick=()=>show(controller.state().index+1,true);
  dots.querySelectorAll('button').forEach(button=>button.onclick=()=>show(Number(button.dataset.spotlightIndex),true));
  region.onkeydown=event=>{
   if(!choices.length||event.altKey||event.ctrlKey||event.metaKey)return;
   const keys={ArrowLeft:()=>controller.state().index-1,ArrowRight:()=>controller.state().index+1,Home:()=>0,End:()=>choices.length-1};
   if(keys[event.key]){event.preventDefault();show(keys[event.key](),true);}
  };
  let start=null;
  region.onpointerdown=event=>{start=event.pointerType==='touch'&&!event.target.closest('button,a')?{x:event.clientX,y:event.clientY}:null;};
  region.onpointercancel=()=>{start=null;};
  region.onpointerup=event=>{if(!start)return;const dx=event.clientX-start.x,dy=event.clientY-start.y;start=null;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.5)show(controller.state().index+(dx<0?1:-1),true);};
  // An unavailable image should not leave a broken-image icon in the gallery.
  host.querySelectorAll('img').forEach(img=>img.addEventListener('error',()=>{img.hidden=true;img.closest('figure').querySelector('figcaption').textContent='Photo temporarily unavailable';},{once:true}));
  show(controller.state().index);
 }
 const api={selection,render};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FragranceSpotlight=api;
})(typeof globalThis!=='undefined'?globalThis:this);
