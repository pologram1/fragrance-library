/* A read-only example: reuses the collection calculator without storing items. */
(function(root){
 'use strict';
 function calculate(remainingMl,price){
  if(!Number.isFinite(remainingMl)||remainingMl<0||remainingMl>100||!Number.isFinite(price)||price<=0)throw new RangeError('Invalid sample bottle.');
  const now=Date.now(),date=new Date(now).toISOString().slice(0,10);
  return Portfolio.metrics({size:100,remainingMl,quantity:1,paid:null,priceHistory:[{date,price:100}],offers:[{seller:'Illustrative example',url:'https://example.com/sample',price,currency:'USD',checked:date,reviewed:true,matching:true,stock:true,kind:'discount'}]},now);
 }
 if(typeof module!=='undefined'&&module.exports){module.exports={calculate};return;}
 const dialog=document.getElementById('value-demo');if(!dialog)return;
 const remaining=document.getElementById('demo-remaining'),price=document.getElementById('demo-price');
 const money=value=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(value);
 function render(){
  const result=calculate(Number(remaining.value),Number(price.value));
  document.getElementById('demo-remaining-label').textContent=remaining.value+' mL';
  document.getElementById('demo-price-label').textContent=money(Number(price.value));
  document.getElementById('demo-results').innerHTML=[['Remaining value',result.remainingValue],['Market movement',result.marketChange],['Value used',result.usageValue],['Net value change',result.netChange]].map(([label,value])=>'<div><small>'+label+'</small><strong>'+money(value)+'</strong></div>').join('');
 }
 document.querySelectorAll('[data-open-value-demo]').forEach(button=>button.addEventListener('click',()=>{render();dialog.showModal();}));
 document.getElementById('close-value-demo').addEventListener('click',()=>dialog.close());
 document.getElementById('demo-explore').addEventListener('click',()=>{dialog.close();location.hash='discover';});
 remaining.addEventListener('input',render);price.addEventListener('input',render);
})(typeof globalThis!=='undefined'?globalThis:this);
