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
 // Discovery should survive a stale price feed. Price eligibility is checked
 // separately when rendering values; it must never hide an approved bottle.
 function featured(catalog,photoManifest){
  const approved=catalog.filter(f=>PhotoStandards.approved(f,photoManifest)&&MarketPrices.complete(f));
  const wanted=['Sauvage','Aventus','Asad Bourbon','9 Pm','Khamrah','Baccarat Rouge 540','Bianco Latte','Yara','Eros'];
  const chosen=[],seen=new Set();
  const add=f=>{if(!f)return;const key=Catalog.brand(f).toLowerCase()+'|'+f.name.toLowerCase();if(!seen.has(key)){chosen.push(f);seen.add(key);}};
  for(const title of wanted){const target=title.toLowerCase().replace(/\b(\d+)\s+(am|pm)\b/g,'$1$2');add(approved.find(f=>MarketPrices.key(f).split('|')[1]===target));if(chosen.length===6)break;}
  for(const f of approved){if(chosen.length>=6)break;if(!chosen.some(c=>Catalog.brand(c)===Catalog.brand(f)))add(f);}
  for(const f of approved){if(chosen.length>=6)break;add(f);}
  return chosen;
 }
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
  const chosen=featured(catalog,photoManifest);
  const featuredBrands={niche:['Amouage','Creed','Xerjoff'],designer:['Chanel','Dior','Yves Saint Laurent'],arabic:['Lattafa','Afnan','Armaf']};
  document.querySelectorAll('[data-category-photo]').forEach(slot=>{const category=slot.dataset.categoryPhoto,candidates=approved.filter(f=>Catalog.category(f)===category);const f=featuredBrands[category].map(brand=>candidates.find(f=>Catalog.brand(f).toLowerCase().includes(brand.toLowerCase()))).find(Boolean)||candidates[0];if(f){const photo=PhotoStandards.approved(f,photoManifest);slot.innerHTML='<img src="'+esc(photo.url)+'" alt="" loading="lazy" decoding="async" width="180" height="240">';}});
  document.getElementById('home-picks').innerHTML=chosen.slice(0,6).map(f=>{const photo=PhotoStandards.approved(f,photoManifest),p=Pricing.value(MarketPrices.offers(f));return `<a class="home-pick" href="#fragrance/${esc(f.id)}"><div class="home-pick-image"><img src="${esc(photo.url)}" alt="${esc(f.brand+' '+f.name)}" loading="lazy" decoding="async" width="300" height="400"><span class="pick-explore" aria-hidden="true">Discover the fragrance ↗</span></div><div class="pick-caption"><div><small>${esc(Catalog.brand(f))}</small><strong>${esc(f.name)}</strong><span>${f.sizeMl} mL · ${esc(f.concentration)}</span></div><div class="pick-market"><small>Est. market value</small><span>${p.price===null?'Price being checked':money(p.price)}</span></div></div></a>`;}).join('')||'<p class="hint">Reviewed fragrances will appear here as the library grows.</p>';
  const wishes=items.filter(f=>f.status==='wishlist').slice(0,3);
  document.getElementById('home-watchlist').innerHTML=wishes.length?wishes.map(f=>{const price=Pricing.value(MarketPrices.apply(f).offers).price;return `<a href="${f.catalogId?'#fragrance/'+esc(f.catalogId):'#wishlist'}" class="watch-row"><span><small>${esc(Catalog.brand(f))}</small><strong>${esc(f.name)}</strong></span><span>${price===null?'Price pending':money(price)}</span></a>`;}).join(''):'<p class="watch-empty">A place for your next discovery.<br>Save the bottles you want to try.</p><a class="home-link" href="#discover">Find a fragrance →</a>';
  document.getElementById('home-catalog-count').textContent=catalog.length?catalog.length.toLocaleString()+' bottle variants':'Your next discovery awaits';
  document.querySelectorAll('[data-chart-days]').forEach(b=>b.onclick=()=>{range=Number(b.dataset.chartDays);render({items,catalog,photoManifest,money,esc});});
 }
 function insights(items,money,esc,now=Date.now()){
  const stats=Portfolio.totals(items,now),owned=items.filter(f=>f.status==='owned');
  const signed=n=>(n<0?'−':n>0?'+':'')+money(Math.abs(n)),tone=n=>n<0?'negative':n>0?'positive':'';
  const coverage=count=>count+' of '+stats.bottles+' bottles';
  const cards=`<article><p class="eyebrow">Market movement</p><h2 class="${tone(stats.marketChange)}">${stats.trackedBottles?signed(stats.marketChange):'—'}</h2><p>Price changes on the liquid you still own.</p><small>${coverage(stats.trackedBottles)} tracked</small></article><article><p class="eyebrow">Value used</p><h2>${stats.usageBottles?money(stats.usageValue):'—'}</h2><p>${stats.usedMl.toLocaleString('en-US',{maximumFractionDigits:1})} mL consumed, at first tracked prices.</p><small>${coverage(stats.usageBottles)} with a starting price</small></article><article><p class="eyebrow">Net value change</p><h2 class="${tone(stats.netChange)}">${stats.trackedBottles?signed(stats.netChange):'—'}</h2><p>${stats.netPercent===null?'A starting and current price are needed.':(stats.netPercent>0?'+':'')+stats.netPercent.toFixed(1)+'% against first tracked full-bottle value.'}</p><small>${coverage(stats.trackedBottles)} comparable</small></article><article><p class="eyebrow">Fragrance remaining</p><h2>${stats.remainingMl.toLocaleString('en-US',{maximumFractionDigits:1})} <small>mL</small></h2><p>${stats.fillPercent===null?'Your shelf is ready for its first bottle.':stats.fillPercent.toFixed(0)+'% of '+stats.volumeMl.toLocaleString()+' mL still on your shelf.'}</p><small>${stats.bottles} bottle${stats.bottles===1?'':'s'} owned</small></article>`;
  const rows=owned.map(f=>{const m=Portfolio.metrics(f,now);return `<tr><th scope="row">${f.catalogId?`<a href="#fragrance/${esc(f.catalogId)}">${esc(f.brand+' '+f.name)}</a>`:esc(f.brand+' '+f.name)}<small>${esc(f.concentration)} · ${f.size} mL · ${f.quantity} bottle${f.quantity===1?'':'s'}${m.firstTracked?' · Tracking since '+esc(m.firstTracked):''}</small></th><td>${Portfolio.remaining(f)} / ${f.size} mL<small>per bottle</small></td><td>${m.remainingValue===null?'Not priced':money(m.remainingValue)}</td><td class="${tone(m.marketChange)}">${m.marketChange===null?'—':signed(m.marketChange)}</td><td>${m.usageValue===null?'—':money(m.usageValue)}</td><td class="${tone(m.netChange)}">${m.netChange===null?'—':signed(m.netChange)}</td></tr>`;}).join('');
  const breakdown=`<details class="value-breakdown"><summary>Understand your collection value <span>View bottle-by-bottle breakdown ↓</span></summary><div class="value-explainer"><p><strong>Market movement</strong> compares today’s average bottle price with the first tracked price, adjusted for the liquid left. <strong>Value used</strong> measures consumed liquid at that starting price. Their difference is the <strong>net change</strong>.</p><p>These are replacement-value estimates, not cash earnings or used-bottle resale quotes. Missing current prices are excluded from market and net totals; known usage remains visible.</p></div>${rows?`<div class="breakdown-scroll" tabindex="0" role="region" aria-label="Scrollable bottle value breakdown"><table><caption>Values in USD. Each row includes all bottles in that entry.</caption><thead><tr><th scope="col">Fragrance</th><th scope="col">Remaining</th><th scope="col">Current value</th><th scope="col">Market change</th><th scope="col">Value used</th><th scope="col">Net change</th></tr></thead><tbody>${rows}</tbody></table></div>`:'<p class="hint">Add a bottle to see its market changes and usage here.</p>'}</details>`;
  return {cards,breakdown};
 }
 const api={series,render,insights,featured};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.HomeDashboard=api;
})(typeof globalThis!=='undefined'?globalThis:this);
