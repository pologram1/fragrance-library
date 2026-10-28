const {test}=require('node:test'),assert=require('node:assert/strict'),Bot=require('./fragbot-dialogue');
const row=(id,name,price,notes)=>({id,name,brand:'Example',sizeMl:100,concentration:'Eau de Parfum',category:'designer',quote:{price,count:1,newest:'2026-10-27'},profile:{notes:{base:notes}}});
const data={state:'ready',records:[row('one','One',50,['Bergamot','Vanilla']),row('two','Two',70,['Bergamot','Cedar']),row('three','Three',null,['Bergamot'])]};
test('Spanish language persists through numeric follow-ups and switches explicitly to English',()=>{
 const first=Bot.answer('Busco algo fresco para trabajar en el calor de Puerto Rico',data);assert.match(first.text,/presupuesto/);assert.equal(first.context.language,'es');
 const second=Bot.answer('$60',data,first.context);assert.equal(second.context.language,'es');assert.deepEqual(second.cards.map(r=>r.id),['one']);assert.match(second.reasons.one,/Bergamot/);assert.match(second.reasons.one,/2026-10-27/);
 const third=Bot.answer('English',data,second.context);assert.equal(third.context.language,'en');
});
test('budget-only request asks scent direction and preserves category',()=>{
 const first=Bot.answer('Recommend designer perfumes under $60',data);assert.match(first.text,/fresh, sweet, or woody/);
 const next=Bot.answer('Fresh',data,first.context);assert.deepEqual(next.cards.map(r=>r.id),['one']);
});
test('viewed fragrance provides exact context, and page changes replace stale bottle context',()=>{
 const result=Bot.answer('¿Qué notas tiene este?',{...data,pageId:'one'});assert.match(result.text,/Bergamot, Vanilla/);assert.equal(result.context.language,'es');
 const moved=Bot.answer('¿Qué notas tiene este?',{...data,pageId:'two'},result.context);assert.match(moved.text,/Bergamot, Cedar/);assert.deepEqual(moved.context.ids,['two']);
});
test('similarity explains actual shared notes, excludes the reference, and handles unknown notes',()=>{
 const result=Bot.answer('Otros perfumes parecidos a este',{...data,pageId:'one'});assert(!result.cards.some(r=>r.id==='one'));assert.match(result.reasons.two,/Bergamot/);assert.match(result.text,/no significa que huelan igual/);
 const none=Bot.answer('Similar to this',{state:'ready',pageId:'empty',records:[row('empty','Empty',10,[])]});assert.match(none.text,/no listed notes/);
});
test('Spanish comparison and unknown-name clarification remain grounded',()=>{
 const compare=Bot.answer('Compara One vs Two',data);assert.equal(compare.comparison,true);assert.match(compare.text,/frascos exactos/);
 const unknown=Bot.answer('Busca xyz-no-existe',data);assert.equal(unknown.cards.length,0);assert.equal(unknown.context.language,'es');
});

test('clarifications skip profiles; numeric and style follow-ups load them when ready',()=>{
 const first=Bot.prepare('Busco algo fresco para trabajar en el calor de Puerto Rico',data);assert.equal(first.loadAll,false);assert.equal(first.load,false);
 const reply=Bot.answer('Busco algo fresco para trabajar en el calor de Puerto Rico',data);
 const next=Bot.prepare('$60',data,reply.context);assert.equal(next.loadAll,true);assert.equal(next.load,true);
 const budget=Bot.answer('Recommend designer perfumes under $60',data);assert.equal(Bot.prepare('Recommend designer perfumes under $60',data).loadAll,false);
 assert.equal(Bot.prepare('Fresh',data,budget.context).loadAll,true);
 const similar=Bot.prepare('Similar to this',data);assert.equal(similar.loadAll,false);assert.equal(similar.load,false);
 assert.equal(Bot.prepare('¿Qué notas tiene este?',{...data,pageId:'one'}).load,true);
});
