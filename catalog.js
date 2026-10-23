(function(root){
 'use strict';
 const normalize=s=>String(s??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const words=s=>normalize(s).replace(/&/g,' and ').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
 const brands={'christian dior':'Dior','christian dior dior':'Dior','dior':'Dior','lattafa':'Lattafa','lataffa':'Lattafa','lattafa perfumes':'Lattafa','maison francis kurkdjian':'Maison Francis Kurkdjian','francis kurkdjian':'Maison Francis Kurkdjian','mfk':'Maison Francis Kurkdjian','ysl':'Yves Saint Laurent','yves saint laurent':'Yves Saint Laurent','dolce and gabbana':'Dolce & Gabbana','jean paul gaultier':'Jean Paul Gaultier','bond no 9':'Bond No. 9','bond no9':'Bond No. 9','bond 9':'Bond No. 9','bdk':'BDK Parfums','bdk parfums':'BDK Parfums','by kilian':'Kilian','kilian':'Kilian','ds and durga':'D.S. & Durga','ds durga':'D.S. & Durga','d s and durga':'D.S. & Durga'};
 function brand(record){if(typeof record==='object'&&record.displayBrand)return record.displayBrand;const value=typeof record==='string'?record:record.brand;if(!String(value||'').trim())return '';return brands[words(value)]||String(value||'').trim().split(/\s+/).map(w=>w===w.toLowerCase()||w===w.toUpperCase()&&w.length>3?w[0].toUpperCase()+w.slice(1).toLowerCase():w).join(' ');}
 function brandKey(record){return words(brand(record));}
 const categoryDefinitions=[
  {id:'all',label:'All fragrances',description:'Explore every house in the library.'},
  {id:'niche',label:'niche perfumes',description:'Discover perfume houses and distinctive scent collections.',brands:['Creed','Amouage','Maison Francis Kurkdjian','Parfums de Marly','Xerjoff','Nishane','Initio','Initio Parfums Prives','Byredo','Diptyque','Le Labo','BDK Parfums','Montale','Mancera','Giardini Di Toscana','Tiziana Terenzi','Orto Parisi','Nasomatto','Serge Lutens','Frederic Malle','Editions de Parfums Frederic Malle','Imaginary Authors','D.S. & Durga','Maison Crivelli','Roja','Roja Parfums','Clive Christian','Goldfield & Banks','Essential Parfums','Liquides Imaginaires','Les Liquides Imaginaires','Atelier Des Ors','Ateliers Des Ors','Fragrance Du Bois','Acqua di Parma','Memo','Memo Paris','Histoires de Parfums','Kerosene','Electimuss','Boadicea The Victorious','Widian','Sospiro','Zoologist','Vilhelm Parfumerie','Kilian','Maison Mataha','M. Micallef','M.Micallef','The House Of Oud','The Merchant Of Venice','Lorenzo Pazzaglia','Ormonde Jayne','Stephane Humbert Lucas','Ex Nihilo','Ex Nihilo Paris']},
  {id:'designer',label:'designer perfumes',description:'Explore fragrances from fashion, beauty, and luxury houses.',brands:['Dior','Chanel','Yves Saint Laurent','Giorgio Armani','Emporio Armani','Giorgio Armani, Emporio Armani','Jean Paul Gaultier','Versace','Prada','Gucci','Dolce & Gabbana','Burberry','Tom Ford','Hermes','Givenchy','Valentino','Viktor & Rolf','Coach','Montblanc','Hugo Boss','Boss','Azzaro','Paco Rabanne','Rabanne','Ralph Lauren','Lacoste','Issey Miyake','Calvin Klein','Bvlgari','Carolina Herrera','Jimmy Choo','Ferragamo','Salvatore Ferragamo','Narciso Rodriguez','Chloe','Mugler','Thierry Mugler','Diesel','DKNY','Donna Karan','Boucheron','Lancome','Louis Vuitton','Balmain','Balenciaga','Cartier','Dunhill']},
  {id:'arabic',label:'Arabic perfumes',description:'Explore Arabic perfume houses and their fragrances.',brands:['Lattafa','Maison Alhambra','Afnan','Armaf','Al Haramain','Rasasi','Ajmal','Swiss Arabian','Paris Corner','Fragrance World','French Avenue','Khadlaj','Ahmed Al Maghribi','Arabiyat Prestige','Al Wataniah','Grandeur','Emper','Al Rehab','Ard Al Zaafaran','Orientica','Zimaya','Dumont','Maison Asrar','Riiffs','Riffs','Pendora Scents','Arabian Oud','Arabian Eagle','Rihanah','Hamidi','Borouj','FOMO','Bharara','Al Absar','Gulf Orchid','Aromatix']}
 ];
 const categoryMap=new Map(categoryDefinitions.flatMap(c=>(c.brands||[]).map(b=>[brandKey(b),c.id])));
 function category(record){return categoryMap.get(brandKey(record))||'other';}
 function categoryBrands(records,selected='all'){
  const counts=new Map();for(const row of records){if(selected!=='all'&&category(row)!==selected)continue;const key=brandKey(row),entry=counts.get(key)||{name:brand(row),count:0};entry.count++;counts.set(key,entry);}return [...counts.values()].sort((a,b)=>a.name.localeCompare(b.name));
 }
 function audience(f){
  const explicit=words(f.audience||f.gender||'');if(['women','woman','female','for women'].includes(explicit))return 'women';if(['men','man','male','for men'].includes(explicit))return 'men';if(explicit==='unisex')return 'unisex';
  let path='';try{path=new URL(f.sourceUrl||'').pathname;}catch{}
  const text=words(f.name)+' '+words(path);
  if(/\b(woman|women|femme|for her|pour elle)\b/.test(text))return 'women';
  if(/\b(man|men|homme|for him|pour lui)\b/.test(text))return 'men';
  return '';
 }
 function bottleType(f){if(f.type)return f.type;let path='';try{path=new URL(f.sourceUrl||'').pathname;}catch{}return /\btester\b/.test(words(f.name+' '+path))?'tester':'standard';}
 function identity(f){
  if(!f.concentration||!Number.isFinite(f.sizeMl)||f.sizeMl<=0)return 'unconfirmed|'+f.id;
  let name=words(f.name).replace(/\b(\d+)\s+(am|pm)\b/g,'$1$2');const prefixes=[words(f.brand),brandKey(f)];for(const prefix of prefixes)if(name.startsWith(prefix+' ')){name=name.slice(prefix.length+1);break;}
  return [brandKey(f),name,words(f.concentration),f.sizeMl,bottleType(f),audience(f)].join('|');
 }
 function prepare(records,{imageAvailable=()=>false}={}){
  const groups=new Map(),aliases=new Map(),labels=new Map();
  for(const record of records){const key=brandKey(record),label=brand(record),previous=labels.get(key);if(!previous||label.localeCompare(previous)<0)labels.set(key,label);}
  for(const record of records){const row={...record,displayBrand:labels.get(brandKey(record)),audience:audience(record),type:bottleType(record)},key=identity(row);if(!groups.has(key))groups.set(key,[]);if(!groups.get(key).some(f=>f.id===row.id))groups.get(key).push(row);}
  const result=[];
  for(const members of groups.values()){
   members.sort((a,b)=>Number(imageAvailable(b))-Number(imageAvailable(a))||a.id.localeCompare(b.id));const first=members[0],row={...first,sourceIds:members.map(f=>f.id),sourceRecords:members};
   result.push(row);for(const member of members)aliases.set(member.id,row);
  }
  return {records:result,aliases,merged:records.length-result.length};
 }
 const cached=new WeakMap();
 function indexed(f){if(cached.has(f))return cached.get(f);const text=words([brand(f),f.brand,f.name,audience(f),bottleType(f),f.barcode||'',...(f.sourceRecords||[]).map(r=>r.barcode||'')].join(' ')).replace(/\b(\d+)\s+(am|pm)\b/g,'$1$2'),tokens=[...new Set(text.split(' '))];let name=words(f.name);for(const prefix of [words(f.brand),brandKey(f)])if(name.startsWith(prefix+' ')){name=name.slice(prefix.length+1);break;}const item={text,tokens,nameLength:name.split(' ').length};cached.set(f,item);return item;}
 function distance(a,b,max){
  if(Math.abs(a.length-b.length)>max)return max+1;
  let previous=Array.from({length:b.length+1},(_,i)=>i),before;
  for(let i=1;i<=a.length;i++){const current=[i];for(let j=1;j<=b.length;j++){current[j]=Math.min(current[j-1]+1,previous[j]+1,previous[j-1]+Number(a[i-1]!==b[j-1]));if(before&&i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])current[j]=Math.min(current[j],before[j-2]+1);}before=previous;previous=current;}
  return previous[b.length];
 }
 function search(records,query=''){
  let size=null,concentration=null,raw=normalize(query).replace(/\b(\d+(?:[.]\d+)?)\s*ml\b/g,(_,n)=>{size=Number(n);return ' ';});
  let text=words(raw).replace(/\b(\d+)\s+(am|pm)\b/g,'$1$2').replace(/\b(mfk|ysl|jpg)\b/g,a=>({mfk:'maison francis kurkdjian',ysl:'yves saint laurent',jpg:'jean paul gaultier'})[a]);
  text=text.replace(/\beau de (parfum|toilette|cologne)\b/g,(_,c)=>{concentration={parfum:'Eau de Parfum',toilette:'Eau de Toilette',cologne:'Eau de Cologne'}[c];return ' ';});
  text=text.replace(/\b(edp|edt|edc|extrait)\b/g,(_,c)=>{concentration={edp:'Eau de Parfum',edt:'Eau de Toilette',edc:'Eau de Cologne',extrait:'Extrait de Parfum'}[c];return ' ';});
  let gender='',tester=false;text=text.replace(/\b(women|woman|men|man|unisex)\b/g,(_,value)=>{gender={women:'women',woman:'women',men:'men',man:'men',unisex:'unisex'}[value];return ' ';}).replace(/\btester\b/g,()=>{tester=true;return ' ';});
  const terms=text.trim().split(/\s+/).filter(Boolean),candidates=records.filter(f=>(size===null||Number(f.sizeMl??f.size)===size)&&(!concentration||f.concentration===concentration)&&(!gender||audience(f)===gender)&&(!tester||bottleType(f)==='tester'));
  const match=fuzzy=>candidates.map(f=>{const index=indexed(f);let score=0;for(const term of terms){let best=Infinity;for(const token of index.tokens){if(token===term)best=Math.min(best,0);else if(token.startsWith(term))best=Math.min(best,1);else if(token.includes(term))best=Math.min(best,2);else if(fuzzy&&term.length>=4&&!/\d/.test(term)){const limit=term.length>=7?2:1,d=distance(term,token,limit);if(d<=limit)best=Math.min(best,4+d);}}if(best===Infinity)return null;score+=best;}return {record:f,score:score+index.nameLength*.01};}).filter(Boolean).sort((a,b)=>a.score-b.score||a.record.name.localeCompare(b.record.name));
  const exact=match(false),fuzzy=exact.length===0&&terms.length>0;return {items:(fuzzy?match(true):exact).map(r=>r.record),fuzzy};
 }
 function filter(records,{query='',brand='',category:categoryFilter='all',concentration='',ownership='',inCollection=()=>false,inWishlist=()=>false,minPrice='',maxPrice='',getPrice=()=>null,imagesOnly=false,imageAvailable=f=>Boolean(f.image)}={}){
  const lower=minPrice!==''&&Number.isFinite(Number(minPrice))?Number(minPrice):null,upper=maxPrice!==''&&Number.isFinite(Number(maxPrice))?Number(maxPrice):null;
  return search(records,query).items.filter(f=>{
   if(categoryFilter!=='all'&&category(f)!==categoryFilter)return false;
   if(brand&&brandKey(f)!==brandKey(brand)||concentration&&f.concentration!==concentration||imagesOnly&&!imageAvailable(f))return false;
   if(ownership==='owned'&&!inCollection(f)||ownership==='not-owned'&&inCollection(f)||ownership==='wishlist'&&!inWishlist(f))return false;
   if(lower!==null||upper!==null){const price=getPrice(f);if(!Number.isFinite(price)||lower!==null&&price<lower||upper!==null&&price>upper)return false;}
   return true;
  });
 }
 function page(records,index=1,size=24){
  const pages=Math.max(1,Math.ceil(records.length/size)),current=Math.min(pages,Math.max(1,index));
  return {items:records.slice((current-1)*size,current*size),current,pages,total:records.length};
 }
 const api={normalize,filter,page,brand,brandKey,audience,bottleType,identity,prepare,search,categoryDefinitions,category,categoryBrands};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.Catalog=api;
})(typeof globalThis!=='undefined'?globalThis:this);
