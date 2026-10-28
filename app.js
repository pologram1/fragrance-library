'use strict';
const $=s=>document.querySelector(s), KEY='polo-fragrance-library-v1';let fragrances=[],view='menu',active=null,selectedCatalog=null;
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const id=()=>crypto.randomUUID();
let toastTimer;function say(s){const toast=$('#message');clearTimeout(toastTimer);toast.textContent=s;toast.classList.add('visible');toastTimer=setTimeout(()=>toast.classList.remove('visible'),5000);}
function safeURL(s){try{const u=new URL(s);return u.protocol==='https:'?u.href:null;}catch{return null;}}
function validate(items){
 if(!Array.isArray(items)||items.length>1000)throw Error('Invalid backup collection.');const ids=new Set();
 for(const f of items){if(!f||typeof f.id!=='string'||ids.has(f.id)||!['brand','name','concentration'].every(k=>typeof f[k]==='string'&&f[k].trim()&&f[k].length<=100)||!['standard','tester'].includes(f.type)||!['owned','wishlist'].includes(f.status)||!Number.isFinite(f.size)||f.size<1||f.size>2000||!Number.isInteger(f.quantity)||f.quantity<1||f.quantity>100||!Array.isArray(f.offers)||f.offers.length>500||(f.paid!==null&&(!Number.isFinite(f.paid)||f.paid<0)))throw Error('Invalid fragrance in backup.');if(f.catalogId!==undefined&&(typeof f.catalogId!=='string'||!/^(?:obf-[0-9]{4,14}|studio-[a-z0-9-]{1,80})$/.test(f.catalogId)))throw Error('Invalid catalog reference.');ids.add(f.id);
 for(const o of f.offers)if(!o||typeof o.seller!=='string'||!safeURL(o.url)||!Number.isFinite(o.price)||o.price<=0||o.currency!=='USD'||!['discount','retail'].includes(o.kind)||!/^\d{4}-\d{2}-\d{2}$/.test(o.checked)||!['stock','reviewed','matching'].every(k=>typeof o[k]==='boolean'))throw Error('Invalid price offer in backup.');
 const portfolioError=Portfolio.validate(f);if(portfolioError)throw Error(portfolioError);
 }return items;
}
try{fragrances=validate(JSON.parse(localStorage.getItem(KEY)||'[]'));}catch{say('Saved data could not be loaded. Your existing data has been kept on this device.');}
function save(){if(window.CollectionAccount?.hasUser())return CollectionAccount.save(fragrances);try{localStorage.setItem(KEY,JSON.stringify(fragrances));window.CollectionAccount?.refresh();return true;}catch{say('Your browser could not keep these changes. Please check that storage is enabled.');return false;}}
let retailerData={fragrances:[]},retailerProfiles={profiles:[]},retailerPrices={products:[]};
let catalogAliases=new Map();const resolveCatalog=id=>catalogAliases.get(id)||catalog.find(f=>f.id===id);
let catalogQuotes=new Map();
let catalog=[],catalogState='loading',catalogPage=1,catalogMetadata=null,photoManifest={photos:{},additionalRecords:[]};
let priceState='loading',runtimeCatalog=false;
const profileLoads=new Map();
async function loadCatalog(){
 catalogState='loading';render();
 try{
  const response=await fetch('data/runtime/browse.json',{cache:'no-cache'});if(!response.ok)throw Error('Compact catalog unavailable');const data=await response.json();
  if(data.version!==1||!Array.isArray(data.records))throw Error('Invalid compact catalog');
  catalog=RuntimeData.unpackCatalog(data.records);photoManifest={photos:data.photos,additionalRecords:[]};catalogMetadata=data.metadata;
  await loadAdminCatalog();
  catalogAliases=new Map();for(const record of catalog)for(const alias of record.sourceIds)catalogAliases.set(alias,record);
  MarketPrices.configureCatalog(catalog);runtimeCatalog=true;catalogState='ready';render();if($('#fragrance-picker').open)renderPicker();
  await loadRuntimePrices();
 }catch{return loadLegacyCatalog();}
}
async function loadAdminCatalog(){
 try{const updates=await CatalogUpdates.load(window.FRAGRANCE_CONFIG);catalog=CatalogUpdates.merge(catalog,photoManifest,updates);MarketPrices.configureAdmin(updates);FragranceDetails.configureAdmin(updates);}
 catch{console.warn('Catalog edits could not load. Showing the source catalog.');}
}
async function loadRuntimePrices(){
 priceState='loading';
 try{const response=await fetch('data/runtime/prices.json',{cache:'no-cache'});if(!response.ok)throw Error('Prices unavailable');MarketPrices.configureIndexed(RuntimeData.unpackPrices(await response.json()));priceState='ready';}
 catch{try{const r=await fetch('data/retailer-prices.json');if(!r.ok)throw Error('Prices unavailable');retailerPrices=await r.json();await loadMarketPrices();priceState='ready';}catch{priceState='error';}}
 catalogQuotes=new Map(catalog.map(f=>[f.id,Pricing.value(MarketPrices.offers(f))]));
 const before=JSON.stringify(fragrances);fragrances.forEach(capturePrice);if(before!==JSON.stringify(fragrances)&&CollectionAccount.canEdit())save();
 render();if($('#fragrance-picker').open)renderPicker();
}
function loadDetailProfile(record){
 if(!runtimeCatalog)return false;
 const buckets=[...new Set((record.sourceIds||[record.id]).map(RuntimeData.bucket))];
 for(const bucket of buckets)if(!profileLoads.has(bucket)){
  const state={status:'loading'};profileLoads.set(bucket,state);
  state.promise=fetch('data/runtime/profiles/'+bucket+'.json').then(response=>{if(!response.ok)throw Error('Profile unavailable');return response.json();}).then(data=>{FragranceDetails.configure(data,{append:true});state.status='ready';}).catch(()=>{state.status='error';}).finally(()=>{if(view==='fragrance'&&resolveCatalog(detailId)?.id===record.id)render();});
 }
 return buckets.some(bucket=>profileLoads.get(bucket).status==='loading');
}
async function loadLegacyCatalog(){
 catalogState='loading';render();
 try{const response=await fetch('data/catalog.json');if(!response.ok)throw Error('Catalog unavailable');const data=await response.json();try{const photos=await fetch('data/photos.json?v=terra-mater-v1',{cache:'no-cache'});if(!photos.ok)throw Error('Photo manifest unavailable');photoManifest=await photos.json();}catch{photoManifest={photos:{},additionalRecords:[]};}if(!Array.isArray(data.fragrances)||!data.fragrances.every(f=>typeof f.id==='string'&&typeof f.brand==='string'&&typeof f.name==='string'))throw Error('Invalid catalog');await loadRetailerData();catalog=data.fragrances.concat(photoManifest.additionalRecords||[],retailerData.fragrances||[]).map(f=>{const identity=photoManifest.photos?.[f.id]?.review?.productIdentity;return identity?{...f,concentration:f.concentration||identity.concentration,sizeMl:f.sizeMl||identity.sizeMl}:f;}).sort((a,b)=>Number(Boolean(PhotoStandards.approved(b,photoManifest)))-Number(Boolean(PhotoStandards.approved(a,photoManifest)))||a.brand.localeCompare(b.brand)||a.name.localeCompare(b.name));const prepared=Catalog.prepare(catalog,{imageAvailable:f=>Boolean(PhotoStandards.approved(f,photoManifest))});catalog=prepared.records;catalogAliases=prepared.aliases;MarketPrices.configureCatalog(catalog);catalogMetadata={...data.metadata,merged:prepared.merged};await Promise.all([loadMarketPrices(),loadProfiles()]);catalogQuotes=new Map(catalog.map(f=>[f.id,Pricing.value(MarketPrices.offers(f))]));const beforePrices=JSON.stringify(fragrances);fragrances.forEach(capturePrice);if(JSON.stringify(fragrances)!==beforePrices&&CollectionAccount.canEdit())save();catalogState='ready';priceState='ready';if($('#fragrance-picker').open)renderPicker();$('#catalog-brand').innerHTML='<option value="">All brands</option>'+[...new Set(catalog.map(f=>Catalog.brand(f)))].sort((a,b)=>a.localeCompare(b)).map(b=>`<option value="${esc(b)}">${esc(b)}</option>`).join('');render();}
 catch{catalogState='error';render();if($('#fragrance-picker').open)renderPicker();}
}
async function loadRetailerData(){const files=['retailer-catalog','retailer-prices','retailer-profiles'];const values=await Promise.all(files.map(async file=>{try{const r=await fetch('data/'+file+'.json');if(!r.ok)throw Error('Unavailable');return await r.json();}catch{return {};}}));[retailerData,retailerPrices,retailerProfiles]=values;}
async function loadProfiles(){try{const response=await fetch('data/fragrance-profiles.json');if(!response.ok)throw Error('Profiles unavailable');const original=await response.json();FragranceDetails.configure({profiles:[...(retailerProfiles.profiles||[]),...(original.profiles||[])]});}catch{FragranceDetails.configure(retailerProfiles);}}
async function loadMarketPrices(){
 try{const response=await fetch('data/prices.json',{cache:'no-cache'});if(!response.ok)throw Error('Prices unavailable');const original=await response.json();MarketPrices.configure({products:[...(original.products||[]),...(retailerPrices.products||[])]});}catch{MarketPrices.configure(retailerPrices);}
}
function capturePrice(f){const priced=MarketPrices.apply(f);Portfolio.capture(priced);if(priced.priceHistory)f.priceHistory=priced.priceHistory;}
function referencePhoto(record){
 const photo=PhotoStandards.approved(record,photoManifest);
 if(!photo)return bottleArt();
 const attribution=['CC BY-SA 3.0','CC-BY-SA-3.0'].includes(photo.license)?`<a href="${esc(safeURL(photo.sourceUrl)||'https://world.openbeautyfacts.org')}" target="_blank" rel="noopener noreferrer">${esc(photo.credit)}</a> · <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 3.0</a>`:photo.credit&&safeURL(photo.sourceUrl)?`<a href="${esc(safeURL(photo.sourceUrl))}" target="_blank" rel="noopener noreferrer">Photo: ${esc(photo.credit)}</a>`:'Product image';
 return `<figure class="product-photo approved-photo"><button type="button" class="photo-preview" data-photo="${esc(record.catalogId||record.id)}" aria-label="View ${esc(record.brand+' '+record.name)} photo"><img src="${esc(photo.url)}" alt="${esc(record.brand+' '+record.name)} · product image" loading="lazy" decoding="async" width="300" height="400" data-approved-photo="true"><span class="photo-zoom-hint" aria-hidden="true">View photo ↗</span></button><figcaption>${attribution}</figcaption></figure>`;
}
let advancedOpen=false;
function syncAdvancedControls(){const count=Number(Boolean(catalogBrand))+['catalog-concentration','catalog-size','catalog-ownership','catalog-min-price','catalog-max-price'].filter(id=>$('#'+id).value!=='').length;document.querySelectorAll('[data-open-advanced]').forEach(button=>{button.setAttribute('aria-expanded',String(view==='discover'&&advancedOpen));button.textContent='Advanced search'+(count?' · '+count:'');});}
function toggleAdvanced(open){advancedOpen=open;if(view!=='discover'){location.hash='discover'+($('#global-query').value.trim()?'?q='+encodeURIComponent($('#global-query').value.trim()):'');navigate();}else render();if(open)$('#catalog-filters').scrollIntoView({behavior:'auto',block:'nearest'});}
document.querySelectorAll('[data-open-advanced]').forEach(button=>button.onclick=()=>{closeSuggestions();toggleAdvanced(!(view==='discover'&&advancedOpen));});
$('#close-advanced').onclick=()=>{toggleAdvanced(false);$('#advanced-search').focus();};
$('#search-submit').onclick=()=>{clearTimeout(discoverSearchTimer);catalogPage=1;if(view==='discover')updateBrowseRoute();render();};
$('#search').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();$('#search-submit').click();}});
let catalogCategory='all',catalogBrand='',lastDiscoverRoute='discover';
function renderCategoryBrowser(){
 const definition=Catalog.categoryDefinitions.find(c=>c.id===catalogCategory)||Catalog.categoryDefinitions[0],brands=Catalog.categoryBrands(catalog,catalogCategory);
 document.querySelectorAll('[data-category]').forEach(button=>{const selected=button.dataset.category===catalogCategory;button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;});
 $('#category-panel').setAttribute('aria-labelledby','category-'+catalogCategory);
 const selected=brands.find(b=>Catalog.brandKey(b.name)===Catalog.brandKey(catalogBrand));if(catalogState==='ready')catalogBrand=selected?.name||'';
 $('#catalog-brand').innerHTML='<option value="">All brands</option>'+brands.map(b=>'<option value="'+esc(b.name)+'">'+esc(b.name)+'</option>').join('');$('#catalog-brand').value=catalogBrand;
 const popular=['Dior','Chanel','Creed','Lattafa','Afnan','Armaf','Maison Francis Kurkdjian','Parfums de Marly','Xerjoff','Yves Saint Laurent','Jean Paul Gaultier','Tom Ford'].map(Catalog.brandKey);
 const visible=catalogCategory==='all'?brands.filter(b=>popular.includes(Catalog.brandKey(b.name))||b.name===catalogBrand):brands;
 $('#category-description').textContent=definition.description+(catalogState==='ready'?' '+brands.length+' brands · '+brands.reduce((n,b)=>n+b.count,0).toLocaleString()+' bottle variants.':' Loading brands…')+(catalogCategory==='all'?' Popular brands below; the Brand filter includes every house.':'');
 $('#brand-subtabs').innerHTML='<button type="button" data-brand="" aria-pressed="'+String(!catalogBrand)+'">All '+(catalogCategory==='all'?'brands':esc(definition.label))+'</button>'+visible.map(b=>'<button type="button" data-brand="'+esc(b.name)+'" aria-pressed="'+String(catalogBrand===b.name)+'">'+esc(b.name)+' <small>'+b.count+'</small></button>').join('');
}
function updateBrowseRoute(){
 const params=new URLSearchParams();if(catalogCategory!=='all')params.set('category',catalogCategory);if(catalogBrand)params.set('brand',catalogBrand);const query=$('#search').value.trim();if(query)params.set('q',query);
 lastDiscoverRoute='discover'+(params.size?'?'+params.toString():'');history.replaceState(null,'','#'+lastDiscoverRoute);
}
function chooseCategory(category){
 catalogCategory=category;catalogBrand='';catalogPage=1;updateBrowseRoute();render();
}
document.querySelector('.category-tabs').addEventListener('click',event=>{const button=event.target.closest('[data-category]');if(button)chooseCategory(button.dataset.category);});
document.querySelector('.category-tabs').addEventListener('keydown',event=>{
 if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const ids=Catalog.categoryDefinitions.map(c=>c.id),index=ids.indexOf(catalogCategory),next=event.key==='Home'?0:event.key==='End'?ids.length-1:(index+(event.key==='ArrowRight'?1:ids.length-1))%ids.length;chooseCategory(ids[next]);$('#category-'+ids[next]).focus();
});
$('#brand-subtabs').onclick=event=>{const button=event.target.closest('[data-brand]');if(!button)return;catalogBrand=button.dataset.brand;catalogPage=1;updateBrowseRoute();render();[...$('#brand-subtabs').querySelectorAll('[data-brand]')].find(b=>b.dataset.brand===catalogBrand)?.focus();};

function renderCatalog(){
 renderCategoryBrowser();
 $('#catalog-info').innerHTML=catalogState==='ready'?`<span>${catalog.length.toLocaleString()} bottle variants to explore · Market prices in USD</span><details class="catalog-credits"><summary>Catalog sources</summary><small>Product data includes <a href="https://world.openbeautyfacts.org" target="_blank" rel="noopener noreferrer">Open Beauty Facts</a> under <a href="https://opendatacommons.org/licenses/odbl/1.0/" target="_blank" rel="noopener noreferrer">ODbL 1.0</a>, plus studio-reviewed retailer and brand records. Photo credits appear with each image.</small></details>`:'<p>Loading the fragrance catalog…</p>';
 if(catalogState!=='ready'){$('#collection').innerHTML=catalogState==='error'?'<div class="empty"><h2>The catalog could not load.</h2><p>Your collection is still available. Try loading the catalog again.</p><button id="retry-catalog">Retry</button></div>':'<div class="empty"><p>Loading product records…</p></div>';if(catalogState==='error'){$('#catalog-info').innerHTML='<p>Catalog unavailable. Reload or retry.</p>';$('#retry-catalog').onclick=loadCatalog;}return;}
 const prices=new Map([...catalogQuotes].map(([id,quote])=>[id,quote.price]));
 const owned=new Set(fragrances.filter(f=>f.status==='owned').map(f=>MarketPrices.key(f))),wished=new Set(fragrances.filter(f=>f.status==='wishlist').map(f=>MarketPrices.key(f)));
 const matches=Catalog.filter(catalog,{query:$('#search').value,category:catalogCategory,brand:catalogBrand,concentration:$('#catalog-concentration').value,sizeMl:$('#catalog-size').value,ownership:$('#catalog-ownership').value,inCollection:f=>owned.has(MarketPrices.key(f)),inWishlist:f=>wished.has(MarketPrices.key(f)),minPrice:$('#catalog-min-price').value,maxPrice:$('#catalog-max-price').value,getPrice:f=>prices.get(f.id)});const mode=$('#sort').value;
 matches.sort((a,b)=>mode==='value'?(prices.get(b.id)??-1)-(prices.get(a.id)??-1):mode==='price-asc'?(prices.get(a.id)??Infinity)-(prices.get(b.id)??Infinity):mode==='brand'?a.brand.localeCompare(b.brand)||a.name.localeCompare(b.name):Number(Boolean(PhotoStandards.approved(b,photoManifest)))-Number(Boolean(PhotoStandards.approved(a,photoManifest)))||($('#search').value.trim()?0:a.name.localeCompare(b.name)));
 const page=Catalog.page(matches,catalogPage);catalogPage=page.current;
 $('#page-count').textContent=`Page ${page.current} of ${page.pages} · ${page.total.toLocaleString()} matches`;$('#previous-page').disabled=page.current===1;$('#next-page').disabled=page.current===page.pages;
 $('#collection').innerHTML=page.items.length?page.items.map(f=>`<article class="card catalog-card">${referencePhoto(f)}<span class="brand-name">${esc(Catalog.brand(f))}</span><h3>${esc(f.name)}</h3>${(view==='discover'||f.catalogId)?`<a class="detail-link" href="#fragrance/${esc(f.catalogId||f.id)}">Explore fragrance →</a>`:''}<p class="meta">${esc(f.concentration||'Concentration needs confirmation')}${f.sizeMl?' · '+esc(String(f.sizeMl))+' mL':f.quantity?' · '+esc(f.quantity):''}<br>${catalogPriceLabel(f)}${f.audience?' · '+esc(f.audience==='women'?"Women's version":f.audience==='men'?"Men’s version":'Unisex'):''}</p>${f.sourceUrl?`<a class="source-link" href="${esc(safeURL(f.sourceUrl)||'https://world.openbeautyfacts.org')}" target="_blank" rel="noopener noreferrer">Product record ↗</a>`:''}</article>`).join(''):'<div class="empty"><h2>No catalog matches.</h2><p>Try another fragrance or brand. You can add a missing bottle from My collection.</p><a class="detail-link" href="#owned">Go to My collection →</a></div>';
}
function bottleArt(){return '<div class="photo-placeholder"><span class="placeholder-mark" aria-hidden="true">FL</span><span>Photo coming soon</span></div>';}
function render(){
 document.body.dataset.view=view;
 $('#scent-editorial').hidden=view!=='menu';$('#scent-shelf-title').hidden=view!=='menu';
 $('#library-view').hidden=view==='fragrance';$('#fragrance-detail').hidden=view!=='fragrance';if(view==='fragrance'){syncAdvancedControls();document.querySelectorAll('.app-nav a').forEach(a=>a.removeAttribute('aria-current'));renderFragrancePage();return;}
 const menu=view==='menu',dashboard=view==='owned',discover=view==='discover';
 $('#page-title').textContent=menu?'Discover your next signature.':discover?'Discover fragrances':view==='wishlist'?'Your wishlist':'My collection';
 $('#page-description').textContent=menu?'Explore scent stories, compare bottles, and find something worth making yours.':discover?'Find your next fragrance. Explore its notes, story and market price.':view==='wishlist'?'Keep an eye on the bottles you want next.':'Your bottles, current market value and remaining fragrance.';
 $('.intro').classList.toggle('compact',!menu);$('#add').hidden=menu||discover;$('#add').textContent=view==='wishlist'?'Add to wishlist':'Add to collection';
 document.querySelectorAll('.app-nav a').forEach(a=>{if(a.hash==='#'+view)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
 $('#section-title').textContent=menu?'Featured fragrances':discover?'Discover fragrances':view==='wishlist'?'Your wishlist':'My collection';
 $('#section-label').textContent=discover?'Fragrance catalog':menu?'Featured fragrances':'Your personal library';
 $('.stats').hidden=!dashboard;
 $('#overview').hidden=!(dashboard||view==='owned');$('#collection-insights').hidden=!(dashboard||view==='owned');$('#home-dashboard').hidden=!dashboard;$('#home-discovery').hidden=!menu;$('#section-title').closest('.section-heading').hidden=menu;$('.toolbar').hidden=menu;$('#collection').hidden=menu;$('.method').hidden=menu;
 $('#sort').parentElement.hidden=false;
 $('#count').hidden=menu||discover;$('#catalog-info').hidden=!discover;$('#catalog-filters').hidden=!discover||!advancedOpen;$('#advanced-search').hidden=!discover;syncAdvancedControls();$('#category-browser').hidden=!discover;$('#menu-categories').hidden=!menu;$('#catalog-pagination').hidden=!discover||catalogState!=='ready';
 const stats=Portfolio.totals(fragrances.map(f=>MarketPrices.apply(f)));
 const change=n=>(n>=0?'+':'−')+money(Math.abs(n));
 const tone=n=>n>=0?'positive':'negative';
 if(dashboard||view==='owned'){const insights=HomeDashboard.insights(fragrances.map(f=>MarketPrices.apply(f)),money,esc);$('#overview').innerHTML=insights.cards;$('#collection-insights').innerHTML=insights.breakdown;}
 $('#bottles').textContent=stats.bottles;$('#wishlist').textContent=fragrances.filter(f=>f.status==='wishlist').length;$('#total').textContent=stats.pricedBottles?money(stats.remainingValue):'—';$('#coverage').textContent=stats.pricedBottles?`${stats.pricedBottles} of ${stats.bottles} bottles priced${stats.pricedBottles<stats.bottles?' · Partial total':''}. Adjusted for liquid remaining.`:'No eligible prices yet.';
 if(menu||dashboard)HomeDashboard.render({items:fragrances,catalog,photoManifest,money,esc});
 if(menu){$('#collection').innerHTML='';return;}
 const query=$('#search').value.toLowerCase();let items=fragrances.filter(f=>(dashboard?f.status==='owned':view===f.status)&&`${f.brand} ${f.name}`.toLowerCase().includes(query));
 const sort=$('#sort').value;items.sort((a,b)=>sort==='value'?(Portfolio.metrics(MarketPrices.apply(b)).remainingValue??-1)-(Portfolio.metrics(MarketPrices.apply(a)).remainingValue??-1):sort==='price-asc'?(Portfolio.metrics(MarketPrices.apply(a)).remainingValue??Infinity)-(Portfolio.metrics(MarketPrices.apply(b)).remainingValue??Infinity):sort==='brand'?a.brand.localeCompare(b.brand)||a.name.localeCompare(b.name):a.name.localeCompare(b.name));
 if(discover){renderCatalog();return;}
$('#count').textContent=`${items.length} fragrance${items.length===1?'':'s'}`;
 $('#collection').innerHTML=items.length?items.map(f=>{const p=Pricing.value(MarketPrices.apply(f).offers),m=Portfolio.metrics(MarketPrices.apply(f));return `<article class="card">${referencePhoto(f)}<span class="brand-name">${esc(Catalog.brand(f))}</span><h3>${esc(f.name)}</h3>${(view==='discover'||f.catalogId)?`<a class="detail-link" href="#fragrance/${esc(f.catalogId||f.id)}">Explore fragrance →</a>`:''}<p class="meta">${esc(f.concentration)} · ${f.size} mL · ${f.type==='tester'?'Tester':'Standard'}<br>${f.status==='owned'?'Owned':'Wishlist'} · Quantity ${f.quantity}</p><div class="fill-level"><div><span style="width:${m.ratio*100}%"></span></div><small>${Portfolio.remaining(f)} / ${f.size} mL per bottle · ${(m.ratio*100).toFixed(0)}% left</small></div><div class="value"><small>${p.kind==='retail'?'Average retail price':'Average bottle price'}</small><strong>${p.price===null?'Not priced':money(p.price)}</strong><small>${p.count?`${p.count} eligible source${p.count===1?'':'s'} · Lowest ${money(p.lowest)}`:'Market price pending.'}</small><small class="remaining-value">Remaining value: ${m.remainingValue===null?'Not priced':money(m.remainingValue)}</small></div><div class="card-actions"><button data-action="prices" data-id="${esc(f.id)}">Seller prices</button>${f.status==='wishlist'?`<button class="primary" data-action="own" data-id="${esc(f.id)}">Move to collection</button>`:''}<button data-action="edit" data-id="${esc(f.id)}">Edit</button><button data-action="remove" data-id="${esc(f.id)}">Remove</button></div></article>`;}).join(''):`<div class="empty"><p class="eyebrow">A collection of your own</p><h2>${query?'No matches found.':'Your shelf starts here.'}</h2><p>${query?'Try another fragrance or brand.':'Find a fragrance in the library. Available seller prices link automatically to its exact bottle size.'}</p><button class="primary" id="empty-add">${view==='wishlist'?'Add to wishlist':'Add to collection'}</button></div>`;
 $('#empty-add')?.addEventListener('click',()=>openPicker());
}
let pickerStatus='owned',pickerPage=1;
function openPicker(){
 if(!canEdit())return;pickerStatus=view==='wishlist'?'wishlist':'owned';pickerPage=1;
 $('#picker-title').textContent=pickerStatus==='wishlist'?'Add to wishlist':'Add to collection';$('#picker-query').value='';renderPicker();$('#fragrance-picker').showModal();$('#picker-query').focus();
}
function renderPicker(){
 const results=$('#picker-results');$('#picker-pagination').hidden=true;
 if(catalogState!=='ready'){$('#picker-count').textContent=catalogState==='error'?'The library could not load.':'Loading the fragrance library…';results.innerHTML=catalogState==='error'?'<button id="picker-retry" type="button">Retry library</button>':'';$('#picker-retry')?.addEventListener('click',()=>{loadCatalog();renderPicker();});return;}
 const search=Catalog.search(catalog.filter(f=>MarketPrices.complete(f)),$('#picker-query').value);const page=Catalog.page(search.items,pickerPage,12);pickerPage=page.current;
 $('#picker-count').textContent=`${page.total.toLocaleString()} matching fragrance${page.total===1?'':'s'} · ${search.fuzzy?'Closest spelling matches · ':''}Choose your bottle`;
 results.innerHTML=page.items.length?page.items.map(f=>{const photo=PhotoStandards.approved(f,photoManifest);return `<article class="picker-item"><button type="button" class="picker-choice" data-pick="${esc(f.id)}" aria-label="${pickerStatus==='wishlist'?'Add to wishlist:':'Add to collection:'} ${esc(f.brand+' '+f.name+' '+(f.sizeMl?f.sizeMl+' mL':''))}">${photo?`<img src="${esc(photo.url)}" alt="" loading="lazy">`:'<span class="picker-placeholder" aria-hidden="true">FL</span>'}<span><small>${esc(Catalog.brand(f))}</small><strong>${esc(f.name)}</strong><span>${esc(f.concentration||'Confirm concentration')}${f.sizeMl?' · '+esc(f.sizeMl)+' mL':''}</span><em>${pickerStatus==='wishlist'?'Add to wishlist':'Add to collection'} →</em><span>${catalogPriceLabel(f)}</span></span></button>${photo?`<small class="picker-credit">${safeURL(photo.sourceUrl)?`<a href="${esc(safeURL(photo.sourceUrl))}" target="_blank" rel="noopener noreferrer">${esc(photo.credit||'Photo source')}</a>`:esc(photo.credit||'Product photo')}${['CC BY-SA 3.0','CC-BY-SA-3.0'].includes(photo.license)?' · <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 3.0</a>':''}</small>`:''}<a class="picker-explore detail-link" href="#fragrance/${esc(f.id)}" data-explore>Explore notes & story →</a></article>`;}).join(''):'<div class="picker-empty"><h3>No matches yet.</h3><p>Try the fragrance or brand name, or use Add manually below.</p></div>';
 $('#picker-pagination').hidden=page.pages<=1;$('#picker-previous').disabled=page.current===1;$('#picker-next').disabled=page.current===page.pages;$('#picker-page').textContent=`${page.current} / ${page.pages}`;
}
let pickerSearchTimer;$('#picker-query').oninput=()=>{clearTimeout(pickerSearchTimer);pickerSearchTimer=setTimeout(()=>{pickerPage=1;renderPicker();},140);};
$('#picker-previous').onclick=()=>{pickerPage--;renderPicker();};$('#picker-next').onclick=()=>{pickerPage++;renderPicker();};
$('#picker-results').onclick=e=>{if(e.target.closest('[data-explore]')){$('#fragrance-picker').close();return;}const choice=e.target.closest('[data-pick]');if(!choice)return;const seed=resolveCatalog(choice.dataset.pick);if(!seed||!canEdit())return;$('#fragrance-picker').close();addCatalogFragrance(seed,pickerStatus);};
$('#picker-results').addEventListener('error',e=>{if(e.target.tagName==='IMG')e.target.hidden=true;},true);
$('#picker-manual').onclick=()=>{$('#fragrance-picker').close();openEditor();$('#fragrance-form').elements.status.value=pickerStatus;updateEditorStatus();};
function updateEditorStatus(){const form=$('#fragrance-form'),wishlist=form.elements.status.value==='wishlist';$('#fragrance-submit').textContent=active?'Save changes':wishlist?'Add to wishlist':'Add to collection';}
function syncRemaining(source='number'){
 const form=$('#fragrance-form'),size=Number(form.elements.size.value),input=form.elements.remainingMl,slider=$('#remaining-slider');
 if(source==='slider')input.value=slider.value;
 const fill=RuntimeData.remaining(size,input.value);slider.disabled=!(size>0);slider.max=size>0?String(size):'100';slider.value=String(fill.amount);input.max=size>0?String(size):'2000';
 slider.setAttribute('aria-valuetext',fill.amount+' mL, '+fill.percent+'% remaining');
 $('#remaining-output').textContent=size>0?fill.amount+' / '+size+' mL · '+fill.percent+'%':'Set the bottle size first';
 document.querySelectorAll('[data-fill]').forEach(button=>{button.disabled=!(size>0);button.setAttribute('aria-pressed',String(size>0&&Math.abs(fill.amount-size*Number(button.dataset.fill)/100)<.051));});
 const old=fragrances.find(f=>f.id===active),matches=old&&['brand','name','concentration','size','type'].every(k=>String(old[k])===form.elements[k].value),price=matches?Pricing.value(MarketPrices.apply(old).offers).price:null;
 $('#remaining-estimate').textContent=price===null?'Remaining value follows the current market estimate.':money(price*(fill.amount/size)*Number(form.elements.quantity.value||1))+' remaining market value · '+money(price*(1-fill.amount/size)*Number(form.elements.quantity.value||1))+' of liquid used at today’s price.';
}
$('#remaining-slider').oninput=()=>syncRemaining('slider');
for(const field of ['remainingMl','size','brand','name','concentration','type','quantity'])$('#fragrance-form').elements[field].addEventListener('input',()=>syncRemaining());
document.querySelectorAll('[data-fill]').forEach(button=>button.onclick=()=>{const form=$('#fragrance-form');form.elements.remainingMl.value=String(Math.round(Number(form.elements.size.value)*Number(button.dataset.fill)/100*10)/10);syncRemaining();});
function openEditor(f){if(!canEdit())return;selectedCatalog=null;$('#editor-reference').hidden=!f?.catalogId;active=f?.id||null;const form=$('#fragrance-form');form.reset();$('#editor-error').hidden=true;form.querySelector('h2').textContent=f?'Edit fragrance':'Confirm your fragrance';if(!f&&view==='wishlist')form.elements.status.value='wishlist';if(f)for(const k of ['brand','name','concentration','size','type','status','quantity','remainingMl'])form.elements[k].value=f[k]??'';const price=Pricing.value(f?MarketPrices.apply(f).offers:[]).price;$('#editor-market-summary').textContent=price===null?'A market estimate will appear when matching seller prices are available.':`Current average bottle price: ${money(price)}. Linked seller prices update automatically.`;updateEditorStatus();syncRemaining();$('#editor').showModal();}
$('#fragrance-form').elements.status.onchange=updateEditorStatus;
$('#add').onclick=()=>openPicker();document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>document.getElementById(b.dataset.close).close());
$('#fragrance-form').onsubmit=e=>{e.preventDefault();if(!canEdit())return;const data=new FormData(e.target);const old=fragrances.find(f=>f.id===active);const f={id:active||id(),brand:data.get('brand').trim(),name:data.get('name').trim(),concentration:data.get('concentration'),size:Number(data.get('size')),type:data.get('type'),status:data.get('status'),quantity:Number(data.get('quantity')),paid:old?.paid??null,audience:old?.audience||'',offers:old?.offers.map(o=>({...o}))||[],remainingMl:data.get('remainingMl')===''?Number(data.get('size')):Number(data.get('remainingMl')),priceHistory:old?.priceHistory?JSON.parse(JSON.stringify(old.priceHistory)):[]};if(selectedCatalog&&selectedCatalog.brand===f.brand&&selectedCatalog.name===f.name)f.catalogId=selectedCatalog.id;else if(old?.catalogId&&old.brand===f.brand&&old.name===f.name)f.catalogId=old.catalogId;
 const changed=old&&['brand','name','concentration','size','type'].some(k=>old[k]!==f[k]);if(changed&&f.offers.length){if(!confirm('Changing the fragrance variant clears its seller offers. Continue?'))return;f.offers=[];f.priceHistory=[];}if(changed)f.priceHistory=[];try{validate([f]);}catch(err){$('#editor-error').textContent=err.message;$('#editor-error').hidden=false;return;}capturePrice(f);if(old)fragrances[fragrances.indexOf(old)]=f;else fragrances.push(f);const saved=save();$('#editor').close();if(saved)say('Fragrance updated.');render();};
function renderOffers(){const f=fragrances.find(f=>f.id===active);$('#price-title').textContent=f.name+' · Where to buy';$('#variant').textContent=`${f.brand} · ${f.concentration} · ${f.size} mL`;const rows=FragranceDetails.sellerLinks(f,MarketPrices.apply(f).offers);$('#offer-list').innerHTML=rows.length?rows.map(o=>`<div class="offer"><strong>${esc(o.seller)} · ${o.current?money(o.price):'Check seller price'}</strong><small>${o.current?'In stock when checked':o.stock===false?'Out of stock when checked':'Availability needs a fresh check'}${o.checked?' · '+esc(o.checked):''}</small>${o.priceNote?`<small>${esc(o.priceNote)}</small>`:''}<a href="${esc(o.url)}" target="_blank" rel="noopener noreferrer">View seller listing ↗</a></div>`).join(''):'<p>Matching seller listings are not available yet.</p>';}
function catalogPriceLabel(f){if(priceState==='loading')return 'Loading market prices…';if(priceState==='error')return 'Prices unavailable';const p=catalogQuotes.get(f.id)||Pricing.value(MarketPrices.offers(f));return p.price===null?'Price pending':`${money(p.price)} · ${p.kind==='retail'?'Official retail':'Market estimate'} · ${p.count} source${p.count===1?'':'s'}`;}
function addCatalogFragrance(seed,status='owned'){
 if(!seed||!canEdit())return;
 if(!MarketPrices.complete(seed)){openEditor();selectedCatalog=seed;const form=$('#fragrance-form');form.elements.brand.value=seed.brand;form.elements.name.value=seed.name;form.elements.concentration.value=seed.concentration||'';form.elements.size.value=seed.sizeMl||'';form.elements.status.value=status;updateEditorStatus();syncRemaining();$('#editor-reference').hidden=false;return;}
 const duplicate=fragrances.find(f=>f.status===status&&MarketPrices.key(f)===MarketPrices.key(seed));
 if(duplicate){say(`${seed.name} is already in your ${status==='wishlist'?'wishlist':'collection'}. Edit it to update quantity.`);return;}
 const f={id:id(),catalogId:seed.id,brand:seed.brand,name:seed.name,concentration:seed.concentration,size:seed.sizeMl,type:seed.type||'standard',audience:seed.audience||'',status,quantity:1,paid:null,remainingMl:seed.sizeMl,offers:[],priceHistory:[]};
 try{validate([f]);}catch(err){say(err.message);return;}
 capturePrice(f);fragrances.push(f);const saved=save();render();if(saved)say(`${seed.name} · ${seed.sizeMl} mL added to your ${status==='wishlist'?'wishlist':'collection'}.`);
}
let previewRecord=null;
function showPhoto(record){
 const photo=PhotoStandards.approved(record,photoManifest);if(!photo)return;
 previewRecord=record;$('#photo-explore').href='#fragrance/'+record.id;$('#photo-add').textContent=MarketPrices.complete(record)?'Add to collection':'Add manually';$('#photo-wishlist').hidden=!MarketPrices.complete(record);$('#photo-brand').textContent=Catalog.brand(record);$('#photo-title').textContent=record.name;
 $('#photo-large').src=photo.url;$('#photo-large').alt=record.brand+' '+record.name;
 $('#photo-details').textContent=[record.concentration,record.sizeMl?record.sizeMl+' mL':record.quantity].filter(Boolean).join(' · ');
 const source=safeURL(photo.sourceUrl);$('#photo-source').hidden=!source;if(source)$('#photo-source').href=source;
 $('#photo-dialog').showModal();
}
$('#photo-add').onclick=()=>{$('#photo-dialog').close();addCatalogFragrance(previewRecord);};
$('#photo-wishlist').onclick=()=>{$('#photo-dialog').close();addCatalogFragrance(previewRecord,'wishlist');};
$('#collection').onclick=e=>{const preview=e.target.closest('[data-photo]');if(preview){const record=resolveCatalog(preview.dataset.photo);if(record)showPhoto(record);return;}if(!canEdit())return;const choice=e.target.closest('[data-catalog]');if(choice){addCatalogFragrance(resolveCatalog(choice.dataset.catalog),choice.dataset.status);return;}const b=e.target.closest('button[data-action]');if(!b)return;const f=fragrances.find(f=>f.id===b.dataset.id);if(b.dataset.action==='own'){if(fragrances.some(other=>other.status==='owned'&&MarketPrices.key(other)===MarketPrices.key(f))){say('This bottle is already in your collection.');return;}f.status='owned';capturePrice(f);const saved=save();render();if(saved)say(f.name+' moved to your collection.');return;}if(b.dataset.action==='edit')openEditor(f);if(b.dataset.action==='remove'&&confirm(`Remove ${f.name} from your collection?`)){fragrances=fragrances.filter(x=>x.id!==f.id);save();render();}if(b.dataset.action==='prices'){active=f.id;renderOffers();$('#prices').showModal();}};
let discoverSearchTimer;$('#search').oninput=()=>{clearTimeout(discoverSearchTimer);discoverSearchTimer=setTimeout(()=>{catalogPage=1;if(view==='discover')updateBrowseRoute();render();},140);};$('#catalog-brand').onchange=()=>{catalogBrand=$('#catalog-brand').value;catalogPage=1;updateBrowseRoute();render();};$('#previous-page').onclick=()=>{catalogPage--;render();};$('#next-page').onclick=()=>{catalogPage++;render();};$('#collection').addEventListener('load',e=>{if(e.target.tagName==='IMG'&&e.target.dataset.approvedPhoto&&(e.target.naturalWidth<300||e.target.naturalHeight<400)){e.target.closest('.product-photo').innerHTML=bottleArt();}},true);$('#collection').addEventListener('error',e=>{if(e.target.tagName==='IMG'){const figure=e.target.closest('.product-photo');figure.innerHTML=bottleArt()+'<figcaption>Photo unavailable</figcaption>'; }},true);$('#sort').onchange=()=>{catalogPage=1;render();};
let detailId='',detailBack='discover';
function navigate(){closeSuggestions();const route=location.hash.slice(1).split('?')[0];if(route.startsWith('fragrance/')){if(['menu','owned','wishlist','discover'].includes(view))detailBack=view;detailId=route.slice(10);view='fragrance';$('#fragrance-picker').close();$('#photo-dialog').close();}else view=['menu','owned','discover','wishlist'].includes(route)?route:'menu';$('#search').value=view==='discover'?(new URLSearchParams(location.hash.split('?')[1]||'').get('q')||''):'';if(view==='discover'){const params=new URLSearchParams(location.hash.split('?')[1]||'');catalogCategory=Catalog.categoryDefinitions.some(c=>c.id===params.get('category'))?params.get('category'):'all';catalogBrand=params.get('brand')||'';lastDiscoverRoute=location.hash.slice(1);}catalogPage=1;render();if(view==='fragrance'){$('#fragrance-detail-title')?.focus({preventScroll:true});window.scrollTo(0,0);}}

function renderFragrancePage(){
 const page=$('#fragrance-detail');
 if(catalogState==='loading'){page.innerHTML='<p class="detail-loading" role="status">Loading fragrance details…</p>';return;}
 const f=resolveCatalog(detailId);
 if(!f){page.innerHTML=`<div class="empty"><h2>${catalogState==='error'?'The fragrance library could not load.':'This fragrance is not in the library.'}</h2><a class="detail-link" href="#discover">Back to Discover →</a>${catalogState==='error'?'<button type="button" id="detail-retry">Retry library</button>':''}</div>`;$('#detail-retry')?.addEventListener('click',loadCatalog);return;}
 const profilePending=loadDetailProfile(f);
 const offers=MarketPrices.offers(f),profile=FragranceDetails.profile(f),p=FragranceDetails.priceEvidence(f,offers),rows=FragranceDetails.sellerLinks(f,offers);
 const signed=n=>(n<0?'−':n>0?'+':'')+money(Math.abs(n));
 const notes=profile?['top','heart','base','featured'].filter(k=>profile.notes?.[k]?.length).map(k=>`<div class="note-group note-stage"><div><h3>${({top:'Top notes',heart:'Heart notes',base:'Base notes',featured:'Featured notes'})[k]}</h3><small>${({top:'The first impression',heart:'The heart of the scent',base:'The lasting foundation',featured:'Published scent impressions'})[k]}</small></div><div class="note-tags">${profile.notes[k].map(n=>`<span>${esc(n)}</span>`).join('')}</div></div>`).join(''):'';
 const variants=FragranceDetails.bottleVariants(f,catalog);
 const matching=fragrances.filter(item=>MarketPrices.key(item)===MarketPrices.key(f)),owned=matching.filter(item=>item.status==='owned'),wished=matching.some(item=>item.status==='wishlist');
 const tracked=owned.map(item=>{const m=Portfolio.metrics(MarketPrices.apply(item));return `<article class="tracked-bottle"><div><strong>${Portfolio.remaining(item)} / ${item.size} mL left</strong><p>${item.quantity} bottle${item.quantity===1?'':'s'} · Remaining value ${m.remainingValue===null?'not priced':money(m.remainingValue)}</p><small>Market ${m.marketChange===null?'pending':signed(m.marketChange)} · Value used ${m.usageValue===null?'pending':money(m.usageValue)}${m.firstTracked?' · Since '+esc(m.firstTracked):''}</small></div><button type="button" data-detail-edit="${esc(item.id)}">Update remaining mL</button></article>`;}).join('');
 const checked=p.oldest?(p.oldest===p.newest?p.oldest:p.oldest+' – '+p.newest):null;
 page.innerHTML=`<a href="#${esc(detailBack==='discover'?lastDiscoverRoute:detailBack)}" class="detail-back">← Back to ${detailBack==='wishlist'?'wishlist':detailBack==='owned'?'collection':detailBack==='menu'?'menu':'Discover'}</a>
 <div class="detail-hero"><div class="detail-visual">${referencePhoto(f)}</div><div class="detail-intro"><p class="eyebrow">${esc(Catalog.brand(f))}</p><h1 id="fragrance-detail-title" tabindex="-1">${esc(profile?.name||f.name)}</h1><p class="detail-variant">${esc(f.concentration||'Concentration not confirmed')}${f.sizeMl?' · '+esc(f.sizeMl)+' mL':''} · ${f.type==='tester'?'Tester':'Standard bottle'}${f.audience?' · '+esc(f.audience==='women'?"Women's version":f.audience==='men'?"Men’s version":'Unisex'):''}</p>${owned.length?'<span class="library-state">In your collection</span>':wished?'<span class="library-state">On your wishlist</span>':''}<p class="detail-description">${esc(profile?.summary||'Explore this exact bottle, its available scent notes, and the latest checked seller listings.')}</p>
 ${variants.length>1?`<div class="bottle-variants" aria-label="Other bottle sizes"><small>Bottle size</small><div>${variants.map(v=>`<a href="#fragrance/${esc(v.id)}" ${v.sizeMl===f.sizeMl?'aria-current="true"':''}>${v.sizeMl} mL</a>`).join('')}</div></div>`:''}
 <div class="detail-price"><small>${p.kind==='retail'?'Average official retail price':'Average market price'} · USD</small><strong>${p.price===null?'Price pending':money(p.price)}</strong><span>${p.count?p.count+' seller'+(p.count===1?'':'s')+' · '+(p.count>1?'Range '+money(p.lowest)+' – '+money(p.highest):'Single-seller snapshot'):'No current eligible seller prices'}</span>${checked?`<span>Checked ${esc(checked)}${p.perMl!==null?' · '+money(p.perMl)+' / mL':''}</span>`:''}</div>
 <div class="card-actions"><button class="primary" type="button" id="detail-add">${owned.length?'Already in collection':MarketPrices.complete(f)?'Add to collection':'Add manually'}</button>${MarketPrices.complete(f)?`<button type="button" id="detail-wishlist">${wished?'On your wishlist':'Add to wishlist'}</button>`:''}<a class="detail-link" href="#detail-sellers" id="detail-buy-jump">Compare sellers ↓</a></div>
 <div class="detail-facts">${profile?.launchYear?`<span>Release year<strong>${esc(profile.launchYear)}</strong></span>`:''}${profile?.creator?`<span>Creator<strong>${esc(profile.creator)}</strong></span>`:''}</div></div></div>
 <nav class="detail-sections" aria-label="Fragrance sections"><a href="#detail-notes-title" data-section-jump="detail-notes-title">Scent notes</a><a href="#detail-story-title" data-section-jump="detail-story-title">The story</a><a href="#detail-sellers" data-section-jump="detail-sellers">Seller prices</a>${owned.length?'<a href="#detail-owned" data-section-jump="detail-owned">Your bottles</a>':''}</nav>
 ${owned.length?`<section class="detail-owned" id="detail-owned" aria-labelledby="detail-owned-title"><p class="eyebrow">Your shelf</p><h2 id="detail-owned-title">Track this bottle</h2>${tracked}<p class="hint">Values follow the exact size and bottle type. Your changes save automatically.</p></section>`:''}
 <div class="detail-editorial"><section aria-labelledby="detail-notes-title"><p class="eyebrow">The composition</p><h2 id="detail-notes-title" tabindex="-1">Discover the notes</h2>${profilePending?'<p role="status">Loading scent notes…</p>':notes||'<p>Verified scent notes have not been added for this version yet.</p>'}<p class="hint">Notes describe scent impressions and accords, not the full ingredient list.</p></section><section aria-labelledby="detail-story-title"><p class="eyebrow">Behind the fragrance</p><h2 id="detail-story-title" tabindex="-1">Its story</h2><p>${esc(profile?.story||'A sourced story for this exact fragrance is still being researched.')}</p>${profile?`<details class="detail-sources"><summary>Profile sources</summary>${profile.sources.map(s=>{const url=FragranceDetails.cleanLink(s.url);return url?`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(s.label)} ↗</a><small>Profile checked ${esc(s.checked)}</small>`:'';}).join('')}</details>`:''}</section></div>
 <section id="detail-sellers" class="detail-sellers" aria-labelledby="detail-sellers-title" tabindex="-1"><div class="section-heading"><div><p class="eyebrow">Same bottle. Clearer comparison.</p><h2 id="detail-sellers-title">Where to buy</h2></div><span class="beta-badge">Direct store links</span></div><p class="hint">Compare ${esc(f.concentration||'this concentration')}${f.sizeMl?' · '+f.sizeMl+' mL':''} · ${f.type==='tester'?'tester':'standard bottle'}. Links go directly to sellers; Polo Studios earns no commission.</p>
 <div class="price-evidence" aria-label="Market price evidence"><div><small>Average</small><strong>${p.price===null?'Pending':money(p.price)}</strong></div><div><small>Lowest tracked price</small><strong>${p.lowest===null?'Pending':money(p.lowest)}</strong></div><div><small>Included sellers</small><strong>${p.count}</strong></div><div><small>Checked</small><strong>${checked?esc(checked):'Awaiting prices'}</strong></div></div>
 <div class="seller-grid">${rows.length?rows.map(o=>`<article class="seller-card ${o.current&&o.price===p.lowest?'seller-best':''}"><span class="seller-status">${o.current?(o.price===p.lowest?'Lowest tracked price':'Included in average'):'Excluded from average'}</span><h3>${esc(o.seller)}</h3><p>${esc(f.concentration||'Confirm concentration')}${f.sizeMl?' · '+f.sizeMl+' mL':''} · ${f.type==='tester'?'Tester':'Standard'}</p><strong>${o.current?money(o.price):'Check seller price'}</strong>${o.current?`<span class="seller-relative">${f.sizeMl?money(o.price/f.sizeMl)+' / mL · ':''}${Math.abs(o.price-p.price)<.005?'At the average':Math.abs((o.price/p.price-1)*100).toFixed(1)+'% '+(o.price<p.price?'below':'above')+' average'}</span>`:''}<small>${o.current?'In stock when checked':o.stock===false?'Out of stock when checked':o.checked?'Price needs a fresh check':'Availability not checked'}${o.checked?' · '+esc(o.checked):''}</small>${o.priceNote?`<small class="seller-coupon">${esc(o.priceNote)}</small>`:''}<a class="seller-buy ${o.current?'primary':''}" href="${esc(o.url)}" target="_blank" rel="noopener noreferrer" aria-label="View listing at ${esc(o.seller)}">${o.current?'View offer':'View seller listing'} ↗</a></article>`).join(''):'<p>Exact retailer listings have not been linked for this bottle yet.</p>'}</div>
 <details class="estimate-method"><summary>How this market estimate is calculated</summary><p>The arithmetic average uses the latest reviewed, matching, in-stock USD offer from each seller, checked within ${Pricing.MAX_AGE_DAYS} days. Out-of-stock and expired offers are excluded. Public coupon conditions appear with each offer. Shipping and tax are excluded; confirm the final price and bottle at checkout.</p></details></section>`;
 $('#detail-add').disabled=owned.length>0;$('#detail-add').onclick=()=>addCatalogFragrance(f);
 if($('#detail-wishlist')){$('#detail-wishlist').disabled=wished;$('#detail-wishlist').onclick=()=>addCatalogFragrance(f,'wishlist');}
 const jump=target=>{const el=document.getElementById(target);el.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});el.focus({preventScroll:true});};
 $('#detail-buy-jump').onclick=e=>{e.preventDefault();jump('detail-sellers');};
 page.querySelectorAll('[data-section-jump]').forEach(a=>a.onclick=e=>{e.preventDefault();jump(a.dataset.sectionJump);});
 page.querySelectorAll('[data-detail-edit]').forEach(button=>button.onclick=()=>{if(canEdit())openEditor(fragrances.find(item=>item.id===button.dataset.detailEdit));});
 page.querySelector('[data-photo]')?.addEventListener('click',()=>showPhoto(f));
 page.querySelector('img')?.addEventListener('error',e=>{e.target.closest('.product-photo').innerHTML=bottleArt();});
}

let suggestionTimer,suggestionIndex=-1;
function closeSuggestions(){clearTimeout(suggestionTimer);$('#global-suggestions').hidden=true;$('#global-query').setAttribute('aria-expanded','false');$('#global-query').removeAttribute('aria-activedescendant');suggestionIndex=-1;}
function renderSuggestions(){
 const input=$('#global-query'),query=input.value.trim(),list=$('#global-suggestions');suggestionIndex=-1;input.removeAttribute('aria-activedescendant');
 if(query.length<2||catalogState!=='ready'){closeSuggestions();return;}
 const search=Catalog.search(catalog,query),items=search.items.slice(0,6);
 list.innerHTML=items.map((f,i)=>{const photo=PhotoStandards.approved(f,photoManifest);return '<a id="suggestion-'+i+'" role="option" aria-selected="false" tabindex="-1" href="#fragrance/'+esc(f.id)+'">'+(photo?'<img src="'+esc(photo.url)+'" alt="">':'<span class="suggestion-art" aria-hidden="true">FL</span>')+'<span><small>'+esc(Catalog.brand(f))+'</small><strong>'+esc(f.name)+'</strong><span>'+esc(f.concentration||'Confirm concentration')+(f.sizeMl?' · '+f.sizeMl+' mL':'')+(f.type==='tester'?' · Tester':'')+(f.audience?' · '+esc(f.audience):'')+'</span></span><em>'+catalogPriceLabel(f)+'</em></a>';}).join('');
 $('#global-search-status').textContent=items.length?(search.fuzzy?'Closest spelling matches. ':'')+search.items.length+' matching bottle variants. Use arrow keys to choose, or Enter to see all.':'No matches. Try a fragrance, brand, or bottle size.';
 list.hidden=!items.length;input.setAttribute('aria-expanded',String(items.length>0));
}
$('#global-query').addEventListener('input',()=>{clearTimeout(suggestionTimer);closeSuggestions();suggestionTimer=setTimeout(renderSuggestions,140);});
$('#global-query').addEventListener('focus',renderSuggestions);
$('#global-query').addEventListener('keydown',event=>{
 const list=$('#global-suggestions'),options=[...list.querySelectorAll('[role=option]')];
 if(event.key==='Escape'){closeSuggestions();return;}
 if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();if(list.hidden)renderSuggestions();const options=[...list.querySelectorAll('[role=option]')];if(!options.length)return;suggestionIndex=(suggestionIndex+(event.key==='ArrowDown'?1:options.length-1)+options.length)%options.length;options.forEach((a,i)=>a.setAttribute('aria-selected',String(i===suggestionIndex)));$('#global-query').setAttribute('aria-activedescendant',options[suggestionIndex].id);}
 if(event.key==='Enter'&&!list.hidden&&suggestionIndex>=0&&options[suggestionIndex]){event.preventDefault();const hash=options[suggestionIndex].hash;closeSuggestions();location.hash=hash;}
 if(event.key==='Tab')closeSuggestions();
});
$('#global-suggestions').addEventListener('click',()=>closeSuggestions());
document.addEventListener('click',event=>{if(!event.target.closest('#global-search'))closeSuggestions();});
$('#global-search').onsubmit=e=>{e.preventDefault();const query=$('#global-query').value.trim();closeSuggestions();location.hash='discover'+(query?'?q='+encodeURIComponent(query):'');navigate();};

window.addEventListener('hashchange',navigate);
{const before=JSON.stringify(fragrances);fragrances.forEach(f=>capturePrice(f));if(JSON.stringify(fragrances)!==before)save();}
navigate();
loadCatalog();

function canEdit(){if(!CollectionAccount.canEdit()){say('Wait for your account collection to load, or retry the connection.');return false;}return true;}
CollectionAccount.initialize({validate,getCollection:()=>fragrances,onCollection:items=>{fragrances=items;const previous=JSON.stringify(fragrances);fragrances.forEach(f=>capturePrice(f));if(JSON.stringify(fragrances)!==previous)save();render();},onState:()=>{},onNotice:say});

for(const id of ['catalog-concentration','catalog-size','catalog-ownership','catalog-min-price','catalog-max-price'])document.getElementById(id).addEventListener(id.includes('price')||id==='catalog-size'?'input':'change',()=>{catalogPage=1;render();});
$('#catalog-clear').onclick=()=>{for(const id of ['search','catalog-brand','catalog-concentration','catalog-size','catalog-ownership','catalog-min-price','catalog-max-price'])document.getElementById(id).value='';catalogCategory='all';catalogBrand='';catalogPage=1;updateBrowseRoute();render();};

// FragBot only receives public catalog data. Account credentials, saved bottles,
// collection storage, and mutation functions are intentionally absent.
window.FragBotLibrary=Object.freeze({
 snapshot:()=>({state:catalogState,priceState,records:catalog.map(f=>{
  const photo=PhotoStandards.approved(f,photoManifest),offers=MarketPrices.offers(f);
  return {id:f.id,brand:Catalog.brand(f),name:f.name,concentration:f.concentration,sizeMl:f.sizeMl,type:f.type,audience:f.audience,barcode:f.barcode,barcodes:f.barcodes,category:Catalog.category(f),photo:photo?{url:photo.url,credit:photo.credit,sourceUrl:photo.sourceUrl,license:photo.license}:null,quote:FragranceDetails.priceEvidence(f,offers),sellers:FragranceDetails.sellerLinks(f,offers),profile:FragranceDetails.profile(f)};
 })}),
 async prepareProfiles(ids){
  if(!runtimeCatalog||catalogState!=='ready')return;
  const records=ids?ids.map(resolveCatalog).filter(Boolean):catalog;
  records.forEach(loadDetailProfile);
  const buckets=[...new Set(records.flatMap(f=>(f.sourceIds||[f.id]).map(RuntimeData.bucket)))];
  await Promise.all(buckets.map(bucket=>profileLoads.get(bucket)?.promise).filter(Boolean));
 }
});
