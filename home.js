(function(root){
 'use strict';
 function series(items,days=30,now=Date.now()){
  const owned=items.filter(f=>f.status==='owned'&&f.priceHistory?.length&&Pricing.value(f.offers,now).price!==null);
  if(!owned.length)return [];
  // Use a common observed interval. Never backfill prices before tracking began.
  const start=Math.max(...owned.map(f=>Date.parse(f.priceHistory[0].date)),days?now-(days-1)*86400000:0),end=Date.parse(new Date(now).toISOString().slice(0,10));
  const points=[];
  for(let day=Date.parse(new Date(start).toISOString().slice(0,10));day<=end;day+=86400000){
   let value=0,complete=true;
   for(const f of owned){const p=[...f.priceHistory].reverse().find(p=>Date.parse(p.date)<=day);if(!p){complete=false;break;}value+=p.price*Portfolio.remaining(f)/f.size*f.quantity;}
   if(complete)points.push({date:new Date(day).toISOString().slice(0,10),value});
  }
  return points;
 }
 let range=30;
 function render({items,catalog,photoManifest,money,esc}){
  const panel=document.getElementById('home-dashboard');if(!panel)return;
  const points=series(items.map(f=>MarketPrices.apply(f)),range),chart=document.getElementById('market-chart');
  document.querySelectorAll('[data-chart-days]').forEach(b=>b.setAttribute('aria-pressed',Number(b.dataset.chartDays)===range?'true':'false'));
  if(points.length<2){chart.innerHTML='<div class="chart-empty"><span class="chart-orbit" aria-hidden="true">↗</span><strong>'+ (points.length?'Your first price is recorded.':'Your collection starts with one bottle.')+'</strong><p>'+(points.length?'Come back as prices change to see your collection’s history.':'Add a fragrance to follow its market value and the fragrance you have left.')+'</p><a class="home-link" href="#discover">Explore the library →</a></div>';}
  else{
   const values=points.map(p=>p.value),lo=Math.min(...values),hi=Math.max(...values),pad=Math.max((hi-lo)*.15,hi*.015,1),min=lo-pad,max=hi+pad;
   const coordinates=points.map((p,i)=>[18+i/(points.length-1)*724,18+(1-(p.value-min)/(max-min))*158]);
   const path=coordinates.map((p,i)=>(i?'L':'M')+p.join(',')).join(' ');
   chart.innerHTML=`<svg viewBox="0 0 760 210" role="img" aria-label="Market value from ${esc(points[0].date)} to ${esc(points.at(-1).date)}: ${money(values[0])} to ${money(values.at(-1))}"><defs><linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="currentColor" stop-opacity=".18"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs><path class="chart-grid" d="M18 35H742M18 105H742M18 176H742"/><path fill="url(#chart-fill)" d="${path} L742,187 L18,187 Z"/><path class="chart-line" d="${path}"/><circle cx="${coordinates.at(-1)[0]}" cy="${coordinates.at(-1)[1]}" r="4" fill="currentColor"/></svg><div class="chart-dates"><span>${points[0].date}</span><span>${points.at(-1).date}</span></div>`;
  }
  const approved=catalog.filter(f=>PhotoStandards.approved(f,photoManifest)&&MarketPrices.complete(f));
  const wanted=['Sauvage','Aventus','Asad Bourbon','9 Pm','Khamrah','Baccarat Rouge 540','Bianco Latte','Yara','Eros'];
  const chosen=[],identities=new Set();
  for(const title of wanted){const target=title.toLowerCase().replace(/\b(\d+)\s+(am|pm)\b/g,'$1$2');const f=approved.find(f=>MarketPrices.key(f).split('|')[1]===target&&Pricing.value(MarketPrices.offers(f)).price!==null);if(f&&!identities.has(f.brand+'|'+f.name)){chosen.push(f);identities.add(f.brand+'|'+f.name);}}
  for(const f of approved){if(chosen.length>=6)break;if(!chosen.some(c=>c.brand===f.brand)&&!identities.has(f.brand+'|'+f.name)&&Pricing.value(MarketPrices.offers(f)).price!==null){chosen.push(f);identities.add(f.brand+'|'+f.name);}}
  document.getElementById('home-picks').innerHTML=chosen.slice(0,6).map(f=>{const photo=PhotoStandards.approved(f,photoManifest),p=Pricing.value(MarketPrices.offers(f));return `<a class="home-pick" href="#fragrance/${esc(f.id)}"><div class="home-pick-image"><img src="${esc(photo.url)}" alt="${esc(f.brand+' '+f.name)}" loading="lazy"></div><small>${esc(f.brand)}</small><strong>${esc(f.name)}</strong><span>${f.sizeMl} mL · ${money(p.price)}</span></a>`;}).join('')||'<p class="hint">Loading the fragrance shelves…</p>';
  const wishes=items.filter(f=>f.status==='wishlist').slice(0,3);
  document.getElementById('home-watchlist').innerHTML=wishes.length?wishes.map(f=>{const price=Pricing.value(MarketPrices.apply(f).offers).price;return `<a href="${f.catalogId?'#fragrance/'+esc(f.catalogId):'#wishlist'}" class="watch-row"><span><small>${esc(f.brand)}</small><strong>${esc(f.name)}</strong></span><span>${price===null?'Price pending':money(price)}</span></a>`;}).join(''):'<p class="watch-empty">A place for your next discovery.<br>Save the bottles you want to try.</p><a class="home-link" href="#discover">Find a fragrance →</a>';
  document.getElementById('home-catalog-count').textContent=catalog.length?catalog.length.toLocaleString()+' bottle variants':'Your next discovery awaits';
  document.querySelectorAll('[data-chart-days]').forEach(b=>b.onclick=()=>{range=Number(b.dataset.chartDays);render({items,catalog,photoManifest,money,esc});});
 }
 const api={series,render};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.HomeDashboard=api;
})(typeof globalThis!=='undefined'?globalThis:this);
