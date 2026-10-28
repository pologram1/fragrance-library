/* Bilingual conversation, preference clarification, and sourced explanations. */
(function(root){
 'use strict';
 const Core=typeof module!=='undefined'&&module.exports?require('./fragbot-core'):root.FragBotCore;
 const norm=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n);
 function language(text,previous='en'){
  if(/\b(espanol|spanish)\b/.test(norm(text)))return 'es';
  if(/\b(english|ingles)\b/.test(norm(text)))return 'en';
  if(/[¿¡ñ]/i.test(text)||/\b(hola|quiero|busco|busca|notas|tiene|cuanto|cuesta|parecido|parecidos|parecida|parecidas|similares|recomiendame|recomienda|para|trabajo|calor|presupuesto|hasta|menos|coco|vainilla|dulce|fresco|amaderado|comparar|compara|historia|comprar|coleccion|ayuda|que|este|esta)\b/.test(norm(text)))return 'es';
  if(/\b(hello|find|recommend|compare|notes|what|where|story|fresh|sweet|budget|under|work|hot)\b/.test(norm(text)))return 'en';return previous;
 }
 function canonical(text){return norm(text).replace(/\bque notas tiene\b/g,'notes of').replace(/\ba que huele\b/g,'notes of').replace(/\bcuanto cuesta\b/g,'price of').replace(/\b(?:cual es )?(?:su |la )?historia(?: de)?\b/g,'story of').replace(/\bdonde (?:lo )?(?:puedo )?comprar\b/g,'where to buy').replace(/\b(?:que )?notas (?:tiene|son)\b/g,'notes').replace(/\b(?:de este|de esta|este|esta|sus|su)\b/g,'this').replace(/\bbuscame\b/g,'find').replace(/\bcompara(?:r)?\b/g,'compare');}
 function prepare(text,data,context={}){
  const lang=language(text,context.language||'en'),question=canonical(text);
  const next={...context,language:lang,ids:context.ids||[]};
  if(data.pageId&&data.pageId!==context.pageId){next.ids=[data.pageId];next.pageId=data.pageId;delete next.preferences;}
  const request=Core.parse(question),similar=/\b(similar|similares|parecido|parecidos|parecida|parecidas|like this)\b/.test(norm(text));
  return {lang,question,context:next,request,similar,loadAll:similar||request.intent==='recommend'&&(request.requestedNotes.length>0||request.noteTerms.length>0)||/\b(recommend|recomienda|quiero|busco|trabajo|calor|work|hot)\b/.test(norm(text)),load:Core.needsProfiles(question)||similar||/\b(notas|historia)\b/.test(norm(text))};
 }
 function notes(row){return [...new Set(Object.values(row.profile?.notes||{}).flat().filter(n=>typeof n==='string'))];}
 function answer(text,data,context={}){
  const p=prepare(text,data,context),es=p.lang==='es',ctx=p.context,records=data.records||[],t=norm(text);
  const say=(en,sp,extra={})=>({text:es?sp:en,cards:[],links:[],sources:[],suggestions:[],...extra,context:{...ctx,...extra.context,language:p.lang}});
  if(/^(hola|hello|hi|help|ayuda|what can you do|que puedes hacer|espanol|english|ingles)$/.test(t))return say('I’m FragBot. Ask me to find a bottle, compare fragrances, or match listed notes to your preferences. I use library data, not live web search.','Soy FragBot. Puedo buscar frascos, comparar perfumes y encontrar notas que coincidan con tus preferencias. Uso datos de la biblioteca; no hago búsquedas web en vivo.',{suggestions:es?['Busco algo fresco para trabajar en el calor de Puerto Rico','¿Qué notas tiene Asad Bourbon?','Compara Sauvage vs Aventus']:['Find something fresh for work in hot weather','What are the notes of Asad Bourbon?','Compare Sauvage vs Aventus']});
  if(data.state!=='ready')return say('The catalog is not ready. Try again in a moment.','El catálogo no está listo. Intenta de nuevo en un momento.');
  if(p.similar){
   const seed=records.find(row=>row.id===ctx.ids[0]);
   if(!seed)return say('Which fragrance should I use as the reference? Open a bottle or search its name first.','¿Qué perfume quieres usar como referencia? Abre un frasco o busca su nombre primero.');
   const sourceNotes=notes(seed),keys=new Set(sourceNotes.map(norm));
   if(!keys.size)return say('This version has no listed notes yet, so I cannot justify a similarity match.','Esta versión todavía no tiene notas publicadas; no puedo justificar una comparación por similitud.',{cards:[seed]});
   const ranked=records.filter(row=>!(row.brand===seed.brand&&row.name===seed.name)).map(row=>({row,shared:notes(row).filter(n=>keys.has(norm(n)))})).filter(item=>item.shared.length).sort((a,b)=>b.shared.length-a.shared.length).slice(0,4);
   return say('These share listed notes with '+seed.brand+' '+seed.name+'. Shared notes do not mean they smell identical.','Estos comparten notas publicadas con '+seed.brand+' '+seed.name+'. Eso no significa que huelan igual.',{cards:ranked.map(item=>item.row),reasons:Object.fromEntries(ranked.map(item=>[item.row.id,(es?'Notas compartidas: ':'Shared notes: ')+item.shared.join(', ')])),suggestions:[]});
  }
  const recommendation=!p.request.compare&&(p.request.intent==='recommend'||/\b(recommend|suggest|recomienda|recomiendame|quiero|busco|something|algo)\b/.test(t)||ctx.preferences&&/^\s*(?:\$?\d+(?:\.\d+)?|fresh|sweet|woody|fresco|dulce|amaderado|hasta.*|under.*)\s*$/.test(t));
  if(recommendation){
   const pref={...ctx.preferences};
   if(p.request.maxPrice!==null)pref.budget=p.request.maxPrice;
   else if(ctx.preferences&&/^\s*\$?\d+(?:\.\d+)?\s*$/.test(t))pref.budget=Number(t.replace('$',''));
   if(p.request.category)pref.category=p.request.category;
   if(/\b(fresh|fresco|calor|hot|summer|verano|trabajo|work|office|oficina)\b/.test(t))pref.style='fresh';
   if(/\b(sweet|dulce)\b/.test(t))pref.style='sweet';if(/\b(woody|amaderado)\b/.test(t))pref.style='woody';
   if(/\b(night|noche|winter|invierno|warm|calido)\b/.test(t)&&!pref.style)pref.style='warm';
   if(p.request.requestedNotes.length)pref.notes=p.request.requestedNotes;
   if(/\b(work|office|trabajo|oficina)\b/.test(t))pref.occasion=es?'trabajo':'work';
   if(/\b(calor|hot|puerto rico|summer|verano)\b/.test(t))pref.climate=es?'clima cálido':'warm weather';
   ctx.preferences=pref;
   if(pref.budget===undefined)return say('What is your budget per bottle in USD? I’ll keep your scent preferences for the next answer.','¿Cuál es tu presupuesto por frasco en USD? Conservaré tus preferencias para la próxima respuesta.',{context:{preferences:pref},suggestions:['$50','$100','$150']});
   if(!pref.style&&!pref.notes?.length)return say('Do you prefer fresh, sweet, or woody scents?','¿Prefieres aromas frescos, dulces o amaderados?',{context:{preferences:pref},suggestions:es?['Fresco','Dulce','Amaderado']:['Fresh','Sweet','Woody']});
   const query='Recommend '+(pref.category||'')+' fragrances '+(pref.notes||[pref.style]).join(' ')+' under $'+pref.budget,request=Core.parse(query),found=Core.recommend(records,request).slice(0,4);
   const groups={fresh:['bergamot','lemon','lime','grapefruit','mint','marine','aquatic'],sweet:['vanilla','caramel','tonka','praline','honey','cacao'],woody:['cedar','sandalwood','vetiver','oud','wood'],warm:['amber','vanilla','cinnamon','cardamom','nutmeg']};
   const terms=pref.notes||groups[pref.style]||[];
   const reasons=Object.fromEntries(found.map(row=>[row.id,(es?'Coincide por notas publicadas: ':'Matches listed notes: ')+notes(row).filter(note=>terms.some(term=>norm(note).includes(term))).join(', ')+'. '+(es?'Estimado verificado: ':'Checked estimate: ')+money(row.quote.price)+(row.quote.newest?' · '+row.quote.newest:'')+'.']));
   return say(found.length?'These match your preferences and budget. Occasion and climate are search preferences, not a wear-performance guarantee.':'No verified matches fit those preferences and budget. Try a higher budget or another scent direction.',found.length?'Estas opciones coinciden con tus preferencias y presupuesto. La ocasión y el clima orientan la búsqueda; no garantizan cómo se comportará el perfume.':'No hay coincidencias verificadas con esas preferencias y presupuesto. Prueba un presupuesto mayor u otro tipo de aroma.',{cards:found,reasons,context:{preferences:pref},suggestions:es?['Hasta $100','Hasta $150']:['Under $100','Under $150']});
  }
  // The original engine continues handling exact identities, freshness, and FAQs.
  const result=Core.answer(p.question,data,ctx);result.context={...ctx,...result.context,language:p.lang};
  if(es){
   const faq=Core.FAQs.find(item=>item.text===result.text);
   const help=[
    'EDT, EDP, parfum y extrait son formatos que pueden tener fórmulas y notas distintas. La concentración por sí sola no garantiza mayor duración. Compara siempre la versión y el tamaño exactos.',
    'Las notas de salida describen la apertura; las de corazón, el desarrollo; y las de fondo, la base. Son impresiones aromáticas, no una lista completa de ingredientes.',
    'Valor restante = estimado actual del frasco completo × mL restantes ÷ tamaño × cantidad. El valor usado mide consumo al primer precio registrado; el movimiento de mercado mide cambios de precio sobre el líquido restante. No son ganancias de reventa.',
    'El estimado promedia la última oferta verificada, disponible y en USD de cada vendedor, para el mismo tamaño, concentración y tipo de frasco. Solo incluye revisiones de los últimos siete días. No incluye envío ni impuestos.',
    'Usa Sign in o Sign up en la cabecera. La colección y la lista de deseos se guardan automáticamente cuando tu cuenta termina de cargar.',
    'Abre un perfume y pulsa Add to wishlist. También puedes buscar desde Wishlist. Para tenerlo en tu colección, usa Add to collection.',
    'Busca el perfume, abre el frasco exacto y pulsa Add to collection. En My collection puedes actualizar los mL restantes. Te guío, pero el chat no añade, borra ni cambia tus frascos.',
    'The Fragrance Library es un proyecto de Polo Studios, fundado por Miguel A. De Jesus en Puerto Rico. Soy FragBot, su asistente de perfumes.',
    'Niche perfumes agrupa casas especializadas; designer perfumes, casas de moda y belleza; y Arabic perfumes, las casas agrupadas en esa categoría. No son garantías de calidad, duración o precio.',
    'Guarda los perfumes cerrados, de pie, lejos del sol directo y de cambios fuertes de temperatura. Sigue las instrucciones del fabricante.',
    'La duración, proyección y estela varían. La biblioteca no tiene pruebas controladas de duración; no inventaré horas ni prometeré que un perfume dure más que otro.'
   ];
   if(faq)result.text=help[Core.FAQs.indexOf(faq)];
   else if(result.comparison)result.text='Estos son los frascos exactos que encontré. Compara sus notas publicadas, concentración, tamaño y precios verificados. No puedo garantizar cuál te gustará más.';
   else if(result.cards.length===1){
    const row=result.cards[0],profile=row.profile;result.text=row.brand+' · '+row.name+' — '+row.sizeMl+' mL · '+row.concentration+'.';
    if(p.request.intent==='notes'){const lines=Object.entries(profile?.notes||{}).filter(([,v])=>v?.length).map(([key,values])=>({top:'Salida',heart:'Corazón',base:'Fondo'}[key]||key)+': '+values.join(', '));result.text+='\n\n'+(lines.length?lines.join('\n'):'Todavía no hay notas verificadas para esta versión.');}
    else if(p.request.intent==='story')result.text+='\n\n'+(profile?.story?'Historia publicada (texto original de la fuente):\n'+profile.story:'Todavía no hay una historia con fuentes para esta versión.');
    else if(['price','sellers'].includes(p.request.intent))result.text+='\n\n'+(Number.isFinite(row.quote?.price)?'Estimado verificado: '+money(row.quote.price)+' · '+row.quote.count+' vendedores. Última revisión incluida: '+(row.quote.newest||'sin fecha')+'.':'No hay un estimado reciente verificado para este frasco.')+' Confirma el precio final, envío e impuestos con el vendedor.';
    else result.text+='\n\nPuedes consultar sus notas, historia y vendedores. Los detalles originales de las fuentes pueden estar en inglés.';
   }else if(result.cards.length)result.text='Encontré varias coincidencias. Revisa nombre, concentración y tamaño. Elige «Preguntar por este frasco» para precisar la conversación.';
   else result.text='No pude verificar esa respuesta o perfume. Escribe marca y nombre, una nota como coco o vainilla, o elige un frasco de la biblioteca. No inventaré datos.';
   result.suggestions=result.cards.length===1?['¿Qué notas tiene este?','Su historia','¿Dónde lo puedo comprar?']:['Buscar Asad Bourbon','¿Qué puedes hacer?'];
   result.links=(result.links||[]).map(link=>({...link,label:link.label.replace('Open my collection','Abrir mi colección').replace('Search fragrances','Buscar perfumes').replace('Open my wishlist','Abrir mis deseos').replace('Search the full library','Buscar en la biblioteca').replace('Open Discover','Abrir Discover').replace('check listing','consultar tienda')}));
  }
  if(!result.cards.length&&!Core.FAQs.some(faq=>faq.text===result.text)&&p.request.query){
   const words=p.request.query.split(' ');const close=words.length>1?Core.find(records,words.slice(-2).join(' ')).slice(0,3):[];
   if(close.length){result.cards=close;result.text=es?'No encontré una coincidencia exacta. ¿Te refieres a uno de estos frascos?':'No exact match. Did you mean one of these bottles?';}
  }
  return result;
 }
 const api={language,canonical,prepare,answer};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FragBotDialogue=api;
})(typeof globalThis!=='undefined'?globalThis:this);
