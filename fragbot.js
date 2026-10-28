/* Dedicated first-party chat UI. Conversation stays in memory on this page. */
(()=>{
 'use strict';if(document.getElementById('fragbot-widget'))return;
 const host=document.createElement('div');host.id='fragbot-widget';
 host.innerHTML=`<button class="fragbot-launch" type="button" aria-label="Open FragBot" aria-haspopup="dialog" aria-expanded="false"><span class="fragbot-mark" aria-hidden="true">F<span>·</span>B</span><span>Ask FragBot</span></button><dialog class="fragbot-dialog" aria-labelledby="fragbot-title" aria-describedby="fragbot-description"><header class="fragbot-header"><div class="fragbot-mark" aria-hidden="true">F<span>·</span>B</div><div><h2 id="fragbot-title">FragBot</h2><p>Your fragrance companion</p></div><button class="fragbot-close" type="button" aria-label="Close FragBot">×</button></header><div class="fragbot-toolbar"><span id="fragbot-description">Discover. Compare. Collect.</span><button class="fragbot-clear" type="button">New chat</button></div><div class="fragbot-log" role="log" aria-label="FragBot conversation" aria-live="polite" aria-relevant="additions"></div><p class="fragbot-status" role="status" aria-live="polite"></p><form class="fragbot-form"><label class="visually-hidden" for="fragbot-question">Ask FragBot about a fragrance</label><textarea id="fragbot-question" rows="2" maxlength="600" placeholder="Find a fragrance, compare bottles, ask about notes…" required></textarea><button type="submit" aria-label="Send to FragBot">↑</button></form><p class="fragbot-footnote">Answers grounded in library data. Not a live web search.</p></dialog>`;
 document.body.append(host);
 const dialog=host.querySelector('dialog'),launch=host.querySelector('.fragbot-launch'),log=host.querySelector('.fragbot-log'),form=host.querySelector('form'),input=host.querySelector('textarea'),send=form.querySelector('button'),status=host.querySelector('.fragbot-status');
 let context={ids:[]},busy=false,generation=0,uiLanguage='en';
 const tr=(en,es)=>uiLanguage==='es'?es:en;
 function localize(lang){uiLanguage=lang;host.querySelector('.fragbot-header p').textContent=tr('Your fragrance companion','Tu compañero de perfumes');host.querySelector('.fragbot-clear').textContent=tr('New chat','Nuevo chat');host.querySelector('.fragbot-footnote').textContent=tr('Answers grounded in library data. Not a live web search.','Respuestas basadas en la biblioteca. Sin búsqueda web en vivo.');input.placeholder=tr('Find a fragrance, compare bottles, ask about notes…','Busca perfumes, compara frascos o pregunta por notas…');}
 const el=(tag,className,text)=>{const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=String(text);return node;};
 function safeLink(value){try{const url=new URL(value,location.href);if(url.protocol==='https:'&&!url.username&&!url.password)return url.href;}catch{}return null;}
 function link(label,href,className=''){
  const safe=safeLink(href);if(!safe)return null;const node=el('a',className,label);node.href=href;
  if(!href.startsWith('#')){node.target='_blank';node.rel='noopener noreferrer';}
  node.addEventListener('click',()=>{if(href.startsWith('#'))dialog.close();});return node;
 }
 function chips(questions,parent){
  if(!questions?.length)return;const row=el('div','fragbot-chips');
  for(const question of questions){const button=el('button','',question);button.type='button';button.addEventListener('click',()=>ask(question));row.append(button);}parent.append(row);
 }
 function message(text,who){
  const article=el('article','fragbot-message fragbot-'+who);article.append(el('small','fragbot-speaker',who==='user'?tr('You','Tú'):'FragBot'),el('p','fragbot-text',text));log.append(article);
  while(log.children.length>40)log.firstElementChild.remove();return article;
 }
 function card(record,parent,comparison=false,reason=''){
  const box=el('section','fragbot-card'),top=el('div','fragbot-card-top');
  if(record.photo&&safeLink(record.photo.url)){
   const img=el('img');img.src=record.photo.url;img.alt=record.brand+' '+record.name;img.width=56;img.height=76;img.loading='lazy';img.addEventListener('error',()=>img.remove(),{once:true});top.append(img);
  }
  const info=el('div');info.append(el('small','',record.brand),el('h3','',record.name),el('p','',[(record.sizeMl?record.sizeMl+' mL':null),record.concentration,record.type==='tester'?'Tester':null].filter(Boolean).join(' · ')));
  const quote=record.quote;info.append(el('strong','',Number.isFinite(quote?.price)?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(quote.price)+tr(' · checked estimate',' · estimado verificado'):tr('Fresh price unavailable','Precio reciente no disponible')));top.append(info);box.append(top);
  if(comparison){
   const notes=Object.entries(record.profile?.notes||{}).filter(([,values])=>values?.length);
   for(const [group,values] of notes)box.append(el('p','fragbot-comparison-notes',({top:'Top',heart:'Heart',base:'Base'}[group]||group)+': '+values.join(', ')));
   if(!notes.length)box.append(el('p','fragbot-comparison-notes','Notes not yet listed for this version.'));
  }
  const actions=el('div','fragbot-card-actions'),explore=link(tr('Open fragrance ↗','Abrir perfume ↗'),'#fragrance/'+record.id);if(explore)actions.append(explore);
  const askButton=el('button','',tr('Ask about this bottle','Preguntar por este frasco'));askButton.type='button';askButton.addEventListener('click',()=>{if(busy)return;context={...context,ids:[record.id]};delete context.preferences;ask(tr('Tell me about this fragrance','Dime sobre este perfume'));});actions.append(askButton);box.append(actions);if(reason)box.append(el('p','fragbot-reason',reason));
  if(record.photo?.credit){
   const credit=el('small','fragbot-credit'),source=link('Photo: '+record.photo.credit,record.photo.sourceUrl||'');if(source)credit.append(source);
   if(['CC BY-SA 3.0','CC-BY-SA-3.0'].includes(record.photo.license)){credit.append(' · ');const license=link('CC BY-SA 3.0','https://creativecommons.org/licenses/by-sa/3.0/');if(license)credit.append(license);}if(credit.textContent)box.append(credit);
  }
  parent.append(box);
 }
 function comparisonTable(records,parent){
  const wrap=el('div','fragbot-compare-scroll');wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label',tr('Fragrance comparison','Comparación de perfumes'));
  const table=el('table','fragbot-compare'),head=el('thead'),row=el('tr');row.append(el('th','',tr('Bottle','Frasco')));
  for(const record of records){const th=el('th','',record.brand+' · '+record.name);th.scope='col';row.append(th);}head.append(row);table.append(head);
  const body=el('tbody');
  const fields=[['Concentration','Concentración',r=>r.concentration],['Size','Tamaño',r=>r.sizeMl+' mL'],['Estimate','Estimado',r=>Number.isFinite(r.quote?.price)?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(r.quote.price):tr('Unavailable','No disponible')],['Checked','Revisión',r=>r.quote?.newest||'—'],['Listed notes','Notas publicadas',r=>Object.values(r.profile?.notes||{}).flat().join(', ')||tr('Not listed','Sin notas publicadas')]];
  for(const [en,es,value] of fields){const line=el('tr'),label=el('th','',tr(en,es));label.scope='row';line.append(label);for(const record of records)line.append(el('td','',value(record)));body.append(line);}table.append(body);wrap.append(table);parent.append(wrap);
 }
 function display(reply){
  localize(reply.context?.language||uiLanguage);const article=message(reply.text,'assistant');if(reply.comparison)comparisonTable(reply.cards,article);for(const record of reply.cards||[])card(record,article,false,reply.reasons?.[record.id]||'');
  const links=el('div','fragbot-answer-links');for(const entry of reply.links||[]){const node=link(entry.label,entry.href);if(node)links.append(node);}if(links.childElementCount)article.append(links);
  if(reply.sources?.length){const sources=el('details','fragbot-sources');sources.append(el('summary','',tr('Answer sources','Fuentes de la respuesta')));for(const source of reply.sources){const node=link(source.label||'Fragrance source',source.url);if(node)sources.append(node);}article.append(sources);}
  chips(reply.suggestions,article);context=reply.context||context;article.scrollIntoView({block:'start',behavior:'instant'});
 }
 async function ask(question){
  if(busy||!question?.trim())return;question=question.trim().slice(0,600);busy=true;send.disabled=true;input.value='';const turn=++generation;
  const user=message(question,'user');user.scrollIntoView({block:'nearest',behavior:'instant'});status.textContent=tr('Searching the fragrance library…','Buscando en la biblioteca…');
  try{
   const api=window.FragBotLibrary;let data=api?.snapshot()||{state:'loading',records:[]};
   const plan=FragBotDialogue.prepare(question,data,context);context=plan.context;localize(plan.lang);
   if(data.state==='ready'&&(plan.load||plan.loadAll)){
    const matches=plan.request.query?FragBotCore.find(data.records,plan.request.query):[];
    const ids=plan.loadAll||plan.request.compare?null:matches.length?matches.slice(0,5).map(row=>row.id):context.ids;
    status.textContent=tr('Checking the library’s listed notes…','Consultando las notas publicadas…');
    await api.prepareProfiles(ids?.length?ids:null);data=api.snapshot();
   }
   if(turn===generation)display(FragBotDialogue.answer(question,data,context));
  }catch{
   if(turn===generation)display({text:tr('I couldn’t finish that lookup. Try again, or open Discover to search the catalog directly.','No pude completar la consulta. Intenta de nuevo o abre Discover para buscar directamente.'),links:[{label:'Open Discover',href:'#discover'}],context});
  }finally{if(turn===generation){busy=false;send.disabled=false;status.textContent='';input.focus({preventScroll:true});}}
 }
 function welcome(){display(FragBotDialogue.answer(uiLanguage==='es'?'hola':'hello',{state:'ready',records:[]},{ids:[],language:uiLanguage}));}
 launch.addEventListener('click',()=>{if(!log.childElementCount)welcome();dialog.showModal();launch.setAttribute('aria-expanded','true');input.focus();});
 host.querySelector('.fragbot-close').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',()=>{launch.setAttribute('aria-expanded','false');launch.focus({preventScroll:true});});
 host.querySelector('.fragbot-clear').addEventListener('click',()=>{generation++;busy=false;send.disabled=false;context={ids:[],language:uiLanguage};input.value='';log.replaceChildren();status.textContent='';welcome();input.focus();});
 form.addEventListener('submit',event=>{event.preventDefault();ask(input.value);});
 input.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();ask(input.value);}});
})();
