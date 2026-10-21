'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const MarketPrices=require('./market-prices.js'),Pricing=require('./pricing.js');global.Pricing=Pricing;const Portfolio=require('./portfolio.js');
const today=new Date().toISOString().slice(0,10);
const seed={id:'studio-test-bottle',brand:'Example',name:'Amber',concentration:'Eau de Parfum',sizeMl:50};
const offer={seller:'Reference seller',price:70,currency:'USD',url:'https://example.com/bottle-50',kind:'discount',checked:today,stock:true,reviewed:true,matching:true};
function configure(){MarketPrices.configure({products:[{...seed,catalogId:seed.id,type:'standard',offers:[offer]}]});}
test('shared prices match the exact size, concentration and bottle type without mutating private data',()=>{
 configure();const f={...seed,size:50,offers:[],remainingMl:25,status:'owned',quantity:1,paid:null};
 assert.equal(Pricing.value(MarketPrices.apply(f).offers).price,70);assert.equal(Portfolio.metrics(MarketPrices.apply(f)).remainingValue,35);assert.deepEqual(f.offers,[]);
 for(const variant of [{sizeMl:100},{concentration:'Eau de Toilette'},{type:'tester'},{name:'Amber Intense'}])assert.equal(MarketPrices.offers({...f,...variant}).length,0);
 assert.equal(MarketPrices.complete(seed),true);assert.equal(MarketPrices.complete({...seed,sizeMl:null}),false);
 MarketPrices.configure({products:[{...seed,type:'standard',offers:[{...offer,checked:'2000-01-01'}]}]});assert.equal(Pricing.value(MarketPrices.offers(seed)).price,null);
 MarketPrices.configure({products:[{...seed,type:'standard',offers:[{...offer,stock:false}]}]});assert.equal(Pricing.value(MarketPrices.offers(seed)).price,null);
});
test('one click saves to the requested list without an editor or purchase price and prevents duplicate entries',()=>{
 configure();const script=fs.readFileSync(__dirname+'/app.js','utf8');const section=script.slice(script.indexOf('function catalogPriceLabel('),script.indexOf('let previewRecord='));
 let saves=0;const items=[];const sandbox={MarketPrices,Pricing,fragrances:items,canEdit:()=>true,id:()=>String(items.length),validate:rows=>{assert.equal(rows[0].size,50);assert.equal(rows[0].paid,null);},capturePrice:f=>Portfolio.capture(MarketPrices.apply(f)),save:()=>{saves++;return true;},render(){},say(){},CollectionAccount:{hasUser:()=>false},money:String,openEditor:()=>assert.fail('Known variants must save directly')};
 vm.createContext(sandbox);vm.runInContext(section,sandbox);sandbox.addCatalogFragrance(seed,'wishlist');assert.equal(items[0].status,'wishlist');assert.equal(saves,1);
 sandbox.addCatalogFragrance(seed,'wishlist');assert.equal(items.length,1);assert.equal(saves,1);
 sandbox.addCatalogFragrance(seed,'owned');assert.equal(items[1].status,'owned');assert.equal(saves,2);
 sandbox.canEdit=()=>false;sandbox.addCatalogFragrance({...seed,name:'Another'},'owned');assert.equal(items.length,2);
});
test('app controls and script dependencies are present in the deployed page and workflow',()=>{
 const html=fs.readFileSync(__dirname+'/index.html','utf8'),script=fs.readFileSync(__dirname+'/app.js','utf8');
 for(const [,id] of script.matchAll(/\$\('#([a-z0-9-]+)'\)/g)){if(['empty-add','catalog-manual','retry-catalog','picker-retry'].includes(id))continue;assert.ok(html.includes(`id="${id}"`)||script.includes(`id="${id}"`),`Missing UI control ${id}`);}
 assert.ok(html.includes('src="market-prices.js'));assert.ok(fs.readFileSync(__dirname+'/.github/workflows/pages.yml','utf8').includes('market-prices.js'));
});
