/* Free, catalog-grounded conversation engine. No remote language model, API key,
   collection writes, or fabricated fragrance facts. UI rendering is separate. */
(function(root){
 'use strict';
 const Catalog=typeof module!=='undefined'&&module.exports?require('./catalog.js'):root.Catalog;
 const normalize=text=>Catalog.normalize(text).replace(/[^a-z0-9$]+/g,' ').trim().replace(/\s+/g,' ');
 const money=value=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(value);
 const filler=new Set(('a an the for of in on me my i you your it its this that these those and or to about please can could would will do does is are what which where when who was were released launched created made designed perfumer creator launch year how much tell show find search looking look want need get give know some any fragrance fragrances perfume perfumes cologne colognes bottle bottles smell smells scent scents notes note price prices cost costs buy buying sold seller sellers history story details information recommend recommendation recommendations with have has like similar vs versus compare cheaper cheapest expensive best good something un una el la los las de del en por para mi mis tu tus que cual cuales como cuanto cuesta precio precios notas nota busca buscar buscame muestra muestrame dime quiero necesito recomienda recomiendame fragancia fragancias colonia colonias perfume perfumes comprar compara su sus este esta eso sobre huele olor quisiera porfavor').split(' '));
 const noteGroups={sweet:['vanilla','caramel','tonka','praline','honey','cacao'],fresh:['bergamot','lemon','lime','grapefruit','mint','marine','aquatic'],woody:['cedar','sandalwood','vetiver','oud','wood'],floral:['rose','jasmine','iris','neroli','tuberose'],warm:['amber','vanilla','cinnamon','cardamom','nutmeg'],tropical:['coconut','pineapple','mango','passion fruit'],dulce:['vanilla','caramel','tonka','honey'],fresco:['bergamot','lemon','lime','mint'],amaderado:['cedar','sandalwood','vetiver','oud'],tropicales:['coconut','pineapple','mango']};
 const aliases={vainilla:'vanilla',coco:'coconut',pina:'pineapple',rosa:'rose',jazmin:'jasmine',canela:'cinnamon',limon:'lemon',bergamota:'bergamot',cuero:'leather',ambar:'amber',madera:'wood',verano:'fresh',summer:'fresh',invierno:'warm',winter:'warm'};
 const FAQs=[
  {match:/\b(edp.*edt|edt.*edp|concentration|concentracion|eau de toilette.*eau de parfum|eau de parfum.*eau de toilette)\b/,text:'EDT, EDP, parfum, and extrait describe fragrance formats. Their exact concentration varies by brand, and different versions can have different notes. A higher concentration does not guarantee longer wear. I keep their bottle sizes and seller prices separate.',suggestions:['Find Dior Sauvage EDP 100ml','Compare Sauvage vs Aventus']},
  {match:/\b(top notes|heart notes|base notes|piramide|notas de salida|notas de corazon|notas de fondo)\b/,text:'Top notes describe the opening impression, heart notes the developing character, and base notes the lasting foundation. They are scent descriptions, not a complete ingredient list. Tell me a fragrance name to see its listed notes.',suggestions:['What are the notes of Asad Bourbon?','Find fragrances with coconut']},
  {match:/\b(remaining|usage|used|ml left|money lost|value used|liquido|consumo|mililitros)\b/,text:'Remaining value = the current full-bottle market estimate × remaining mL ÷ bottle size × quantity. Market movement tracks price changes on the liquid left; value used tracks consumption at the first recorded price. These are replacement estimates, not resale earnings. Open My collection to update remaining mL.',links:[{label:'Open my collection',href:'#owned'}]},
  {match:/\b(market value|market price|average price|average calculated|price calculated|valor de mercado|precio promedio|precio de mercado)\b/,text:'The library averages the latest matching, reviewed, in-stock USD offer from each seller, checked within the last seven days. Size, concentration, and bottle type must match. Tax and shipping are excluded. Expired or missing offers are not treated as zero. Ask for a fragrance to see its checked estimate.',suggestions:['How much is Asad Bourbon?']},
  {match:/\b(sign in|sign up|log in|login|register|account|cuenta|registrar|iniciar sesion)\b/,text:'Use Sign in or Sign up in the header. Your collection and wishlist save automatically after your account loads. You can also browse without an account. If an account cannot load or save, keep the page open and follow its connection message rather than clearing your saved data.',suggestions:['How do I add to my collection?']},
  {match:/\b(wishlist|wish list|lista de deseos)\b/,text:'Open a fragrance and choose Add to wishlist. You can also use Add to wishlist in the Wishlist tab to search the catalog. To own it later, open the fragrance and choose Add to collection.',links:[{label:'Open my wishlist',href:'#wishlist'}]},
  {match:/\b(my collection|add.*collection|save.*collection|mi coleccion|agregar.*coleccion|anadir.*coleccion)\b/,text:'Search for a fragrance, open the exact bottle, and choose Add to collection. You can update its remaining mL from My collection. Signed-in collections save automatically. I can guide you, but I do not add, remove, or change bottles through chat.',links:[{label:'Open my collection',href:'#owned'},{label:'Search fragrances',href:'#discover'}]},
  {match:/\b(who made|who created|founder|polo studios|creador|fundador)\b/,text:'The Fragrance Library is a Polo Studios project, founded by Miguel A. De Jesus in Puerto Rico. I’m FragBot, the library’s dedicated fragrance companion.'},
  {match:/\b(what is niche|niche vs designer|designer vs niche|que es nicho|niche.*mean|arabic.*mean)\b/,text:'The library uses niche perfumes for specialist fragrance houses, designer perfumes for fashion/beauty houses, and Arabic perfumes for the Arabic-house browsing group. These are browsing categories, not guarantees of quality, price, origin of manufacture, or how a scent will wear.',links:[{label:'Explore niche perfumes',href:'#discover?category=niche'},{label:'Explore designer perfumes',href:'#discover?category=designer'},{label:'Explore Arabic perfumes',href:'#discover?category=arabic'}]},
  {match:/\b(store.*perfume|store.*fragrance|storage|guardar.*perfume|conservar.*perfume)\b/,text:'Keep fragrances tightly closed, upright, and away from direct sunlight and major heat changes. A cool, dry cupboard is usually more suitable than a sunny windowsill or hot car. Follow any storage instructions on the packaging.'},
  {match:/\b(longevity|last longer|long lasting|projection|sillage|duracion|estela)\b/,text:'Wear time, projection, and sillage vary with the formula, application, skin, and conditions. This library does not have controlled wear-test results, so I won’t invent an hours-long rating or promise one fragrance will outlast another. Try a sample when wear performance matters.'}
 ];
 function parse(text){
  const normalized=normalize(text),budget=/\b(?:under|below|less than|up to|menos de|hasta|debajo de)\s*\$?\s*(\d+(?:\.\d+)?)/i.exec(text)||/\$(\d+(?:\.\d+)?)/.exec(text);
  const maxPrice=budget?Number(budget[1]):null;
  const category=/\b(niche|nicho)\b/.test(normalized)?'niche':/\b(designer|disenador)\b/.test(normalized)?'designer':/\b(arabic|arabe|arabes)\b/.test(normalized)?'arabic':null;
  const compare=/\b(?:compare|compara)\s+(.+?)\s+(?:vs\.?|versus|with|and|con|y)\s+(.+)[?!.]*$/i.exec(text)||/^(.+?)\s+(?:vs\.?|versus)\s+(.+)$/i.exec(text);
  let intent=compare?'compare':/\b(notes|notas|smell|huele|composition|composicion)\b/.test(normalized)?'notes':/\b(story|history|historia|creator|perfumer|perfumista|launch|launched|released|created|who made|lanzamiento)\b/.test(normalized)?'story':/\b(price|prices|cost|costs|cuesta|precio|precios|how much)\b/.test(normalized)?'price':/\b(buy|sellers|where.*find|comprar|tiendas)\b/.test(normalized)?'sellers':/\b(recommend|suggest|recomienda|recomiendame|similar|under|below|menos de|hasta)\b/.test(normalized)?'recommend':'search';
  const noteTerms=Object.keys(noteGroups).filter(term=>new RegExp('\\b'+term+'\\b').test(normalized));
  const requestedNotes=Object.keys(aliases).filter(term=>new RegExp('\\b'+term+'\\b').test(normalized)).map(term=>aliases[term]);
  const directNotes=['vanilla','coconut','pineapple','mango','rose','jasmine','oud','leather','amber','cacao','tobacco','cinnamon','bergamot','iris','vetiver','sandalwood','mint','cherry','caramel','tonka'];
  requestedNotes.push(...directNotes.filter(term=>new RegExp('\\b'+term+'\\b').test(normalized)));
  if((requestedNotes.length||noteTerms.length)&&!compare&&!/\b(?:notes of|notas de)\b/.test(normalized))intent='recommend';
  let cleaned=text.replace(/\b(?:top|heart|base)\s+notes\b/gi,'notes').replace(/\b(?:under|below|less than|up to|menos de|hasta|debajo de)\s*\$?\s*\d+(?:\.\d+)?/gi,' ').replace(/\$\d+(?:\.\d+)?/g,' ');
  const query=normalize(cleaned).split(' ').filter(word=>!filler.has(word)&&!['niche','nicho','designer','disenador','arabic','arabe','arabes'].includes(word)).join(' ');
  return {normalized,query,intent,category,maxPrice,compare:compare?[compare[1],compare[2]]:null,requestedNotes:[...new Set(requestedNotes)],noteTerms};
 }
 function find(records,query){
  const matches=Catalog.search(records,query).items;
  // Prefer the named fragrance over flankers when the whole name is known.
  // Size/concentration constraints have already been applied by Catalog.search.
  const title=normalize(query).replace(/\b(?:eau de parfum|eau de toilette|eau de cologne|extrait de parfum|edp|edt|edc|parfum|extrait|tester|men|women|unisex)\b/g,' ').replace(/\b\d+(?:\.\d+)?\s*ml\b/g,' ').replace(/\s+/g,' ').trim();
  const exact=matches.filter(row=>{const brand=normalize(row.brand);let name=normalize(row.name);if(name.startsWith(brand+' '))name=name.slice(brand.length+1);return title===name||title===brand+' '+name;});
  return exact.length?exact:matches;
 }
 function notesText(row){return Object.values(row.profile?.notes||{}).flat().map(normalize).join(' ');}
 function recommend(records,request){
  const wanted=[...request.requestedNotes,...request.noteTerms.flatMap(term=>noteGroups[term]||[])];
  return records.filter(row=>(!request.category||row.category===request.category)&&(request.maxPrice===null||Number.isFinite(row.quote?.price)&&row.quote.price<=request.maxPrice))
   .map(row=>({row,score:wanted.filter(note=>notesText(row).includes(note)).length})).filter(item=>!wanted.length||item.score>0)
   .sort((a,b)=>b.score-a.score||Number(Boolean(b.row.photo))-Number(Boolean(a.row.photo))||(a.row.quote?.price??Infinity)-(b.row.quote?.price??Infinity)).map(item=>item.row);
 }
 function needsProfiles(text){const request=parse(text);return ['notes','story','compare','recommend'].includes(request.intent)||/\b(tell|dime).*\b(about|sobre)\b/.test(request.normalized);}
 function answer(text,data,context={ids:[]}){
  const request=parse(text),records=data?.records||[];
  const reply=(message,extra={})=>({text:message,cards:[],links:[],sources:[],suggestions:[],context,...extra});
  if(!request.normalized||/^(hi|hello|hey|hola|help|ayuda|what can you do|who are you|que puedes hacer)$/.test(request.normalized))return reply('I’m FragBot, your Fragrance Library companion. I can find bottles, compare fragrances, explain listed notes and checked prices, and help you use your collection. I answer from this library’s data; I don’t browse the whole web or generate unsupported facts.',{suggestions:['Find Dior Sauvage EDP 100ml','Recommend Arabic perfumes under $60','Compare Sauvage vs Aventus','What are the notes of Asad Bourbon?']});
  // A named-fragrance query takes priority over general help wording.
  const matches=request.query?find(records,request.query):[];
  const named=matches.length>0&&request.query.length>0;
  const faq=FAQs.find(item=>item.match.test(request.normalized));
  if(faq&&(faq===FAQs[0]||!named&&!request.compare))return reply(faq.text,{links:faq.links||[],suggestions:faq.suggestions||[]});
  if(data?.state!=='ready')return reply(data?.state==='error'?'The fragrance catalog could not load. Your collection is still available. Try the library again, then ask me to search.':'The fragrance library is still loading. Try your question again in a moment.',{links:[{label:'Open Discover',href:'#discover'}]});
  let found=[];
  if(request.compare){
   const choices=request.compare.map(query=>find(records,parse(query).query||query));
   if(choices.some(list=>!list.length))return reply('I couldn’t identify both fragrances. Try “Compare Sauvage EDP 100ml vs Aventus EDP 100ml” or search each bottle first.',{cards:choices.flatMap(list=>list.slice(0,2))});
   const pick=list=>list.find(row=>row.sizeMl===100&&row.type!=='tester')||list[0];found=choices.map(pick);
   if(found[0].id===found[1].id)return reply('Both names matched the same bottle. Give me two different names or specify their concentrations.',{cards:[found[0]]});
   return reply('Here are the exact bottles I matched. Compare their listed notes and current replacement-price estimates below; I won’t guess which lasts longer or which you’ll prefer.',{cards:found,comparison:true,context:{ids:found.map(row=>row.id)}});
  }
  if(request.intent==='recommend'&&(request.requestedNotes.length||request.noteTerms.length||request.category||request.maxPrice!==null)){
   found=recommend(records,request);
   if(!found.length)return reply('I don’t have a verified match for those notes or that current-price budget. Try a broader note or a higher budget. Bottles without fresh prices are excluded from budget results.',{suggestions:['Find vanilla fragrances','Recommend Arabic perfumes under $100']});
   const noteBased=request.requestedNotes.length||request.noteTerms.length;
   return reply((noteBased?'These match the scent notes listed in the library.':'Here are matching bottles from the library.')+(request.maxPrice!==null?' Each has an eligible estimate at or below '+money(request.maxPrice)+'.':'')+' These are catalog matches, not a guarantee of personal preference.',{cards:found.slice(0,5),context:{ids:found.slice(0,5).map(row=>row.id)}});
  }
  const followUp=/\b(it|its|this|that|them|those|este|esta|su|sus)\b/.test(request.normalized)||['notes','notas','price','precio','story','historia','where to buy'].includes(request.normalized);
  found=named?matches:followUp?context.ids.map(id=>records.find(row=>row.id===id)).filter(Boolean):[];
  if(!found.length&&request.category)found=records.filter(row=>row.category===request.category);
  if(!found.length){
   if(faq)return reply(faq.text,{links:faq.links||[],suggestions:faq.suggestions||[]});
   return reply('I couldn’t verify that answer or fragrance in this library. Try a brand and fragrance name, a note such as coconut, or a budget such as “Arabic perfumes under $60.” I won’t invent a bottle or price.',{links:[{label:'Search the full library',href:'#discover?q='+encodeURIComponent(request.query||text)}],suggestions:['What can you do?','Find fragrances with coconut']});
  }
  found=found.slice(0,5);
  const detail=found.length===1,record=found[0],profile=record.profile;
  let message=detail?record.brand+' · '+record.name+' — '+record.sizeMl+' mL '+record.concentration+'.':'I found several matching fragrances or bottle versions. Check the name, size, and concentration, or choose “Ask about this bottle” for an exact match.';
  if(detail&&request.intent==='notes'){
   const parts=Object.entries(profile?.notes||{}).filter(([,values])=>values?.length).map(([group,values])=>({top:'Top',heart:'Heart',base:'Base'}[group]||group)+': '+values.join(', ')+'.');
   message+='\n\n'+(parts.length?parts.join('\n'):'Verified notes have not been added for this exact version yet.');
  }else if(detail&&request.intent==='story')message+='\n\n'+(profile?.story||'A sourced story has not been added for this exact version yet.');
  else if(detail&&['price','sellers'].includes(request.intent)){
   const quote=record.quote;
   message+='\n\n'+(quote?.price===null||!Number.isFinite(quote?.price)?'There is no eligible fresh market estimate for this bottle right now.':'The current checked estimate is '+money(quote.price)+' from '+quote.count+' eligible seller'+(quote.count===1?'':'s')+'.'+(quote.newest?' Latest included check: '+quote.newest+'.':''));
   message+=' Confirm the exact bottle and final checkout price with the seller; shipping and tax are excluded.';
  }else if(detail&&profile?.summary)message+='\n\n'+profile.summary;
  const sources=detail?(profile?.sources||[]).filter(source=>source.url).slice(0,3):[];
  const links=detail&&['price','sellers'].includes(request.intent)?(record.sellers||[]).slice(0,4).map(seller=>({label:seller.seller+(seller.current?' · '+money(seller.price):' · check listing'),href:seller.url})):[];
  return reply(message,{cards:found,links,sources,context:{ids:found.map(row=>row.id)},suggestions:detail?['What are its notes?','Tell me its story','Where can I buy it?']:[]});
 }
 const api={parse,find,recommend,needsProfiles,answer,FAQs};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FragBotCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
