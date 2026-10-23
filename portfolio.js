(function(root){
'use strict';
function remaining(f){return f.remainingMl===undefined?f.size:f.remainingMl;}
function validate(f){
 if(f.remainingMl!==undefined&&(!Number.isFinite(f.remainingMl)||f.remainingMl<0||f.remainingMl>f.size))return 'Remaining mL must be between zero and bottle size.';
 if(f.priceHistory!==undefined&&(!Array.isArray(f.priceHistory)||f.priceHistory.length>366||f.priceHistory.some(p=>!p||!/^\d{4}-\d{2}-\d{2}$/.test(p.date)||!Number.isFinite(Date.parse(p.date))||!Number.isFinite(p.price)||p.price<=0)))return 'Invalid price history.';
 return null;
}
function metrics(f,now=Date.now()){
 const price=Pricing.value(f.offers,now).price,q=f.quantity,ratio=remaining(f)/f.size;
 const history=f.priceHistory||[],baseline=history[0]?.price??null;
 const left=price===null?null:price*ratio*q;
 const market=price===null||baseline===null?null:(price-baseline)*ratio*q;
 const consumed=baseline===null?null:baseline*(1-ratio)*q;
 const net=market===null?null:market-consumed;
 return {price,ratio,baselinePrice:baseline,baselineValue:baseline===null?null:baseline*q,firstTracked:history[0]?.date||null,remainingMl:remaining(f)*q,usedMl:(f.size-remaining(f))*q,
 remainingValue:left,fullValue:price===null?null:price*q,marketChange:market,usageValue:consumed,netChange:net,
 purchaseCost:f.paid===null?null:f.paid*q,purchaseChange:left===null||f.paid===null?null:left-f.paid*q,
 purchasePercent:left===null||!f.paid?null:(left/(f.paid*q)-1)*100};
}
function capture(f,now=Date.now()){
 const price=Pricing.value(f.offers,now).price;
 if(price===null)return;
 const date=new Date(now).toISOString().slice(0,10);
 f.priceHistory=f.priceHistory||[];
 const last=f.priceHistory[f.priceHistory.length-1];
 // Preserve the first observed baseline, including multiple updates on the first day.
 if(last?.date===date&&f.priceHistory.length>1)last.price=price;
 else if(!last||last.price!==price)f.priceHistory.push({date,price});
 if(f.priceHistory.length>366)f.priceHistory.splice(1,f.priceHistory.length-366);
}
function totals(items,now=Date.now()){
 const owned=items.filter(f=>f.status==='owned');
 const out={bottles:0,remainingMl:0,usedMl:0,remainingValue:0,pricedBottles:0,purchaseCost:0,paidBottles:0,
 purchaseChange:0,comparableCost:0,comparableBottles:0,marketChange:0,usageValue:0,netChange:0,trackedBottles:0,usageBottles:0,volumeMl:0,fullValue:0,trackedBaselineValue:0};
 for(const f of owned){const m=metrics(f,now);out.bottles+=f.quantity;out.remainingMl+=m.remainingMl;out.usedMl+=m.usedMl;
 out.volumeMl+=f.size*f.quantity;
 if(m.remainingValue!==null){out.remainingValue+=m.remainingValue;out.fullValue+=m.fullValue;out.pricedBottles+=f.quantity;}
 if(m.purchaseCost!==null){out.purchaseCost+=m.purchaseCost;out.paidBottles+=f.quantity;}
 if(m.purchaseChange!==null){out.purchaseChange+=m.purchaseChange;out.comparableCost+=m.purchaseCost;out.comparableBottles+=f.quantity;}
 if(m.usageValue!==null){out.usageValue+=m.usageValue;out.usageBottles+=f.quantity;}
 if(m.netChange!==null){out.marketChange+=m.marketChange;out.netChange+=m.netChange;out.trackedBaselineValue+=m.baselineValue;out.trackedBottles+=f.quantity;}}
 out.netPercent=out.trackedBaselineValue?out.netChange/out.trackedBaselineValue*100:null;
 out.fillPercent=out.volumeMl?out.remainingMl/out.volumeMl*100:null;
 out.purchasePercent=out.comparableCost?out.purchaseChange/out.comparableCost*100:null;return out;
}
const api={remaining,validate,metrics,capture,totals};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.Portfolio=api;
})(typeof globalThis!=='undefined'?globalThis:this);
