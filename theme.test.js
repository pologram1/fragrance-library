'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync(__dirname+'/theme.js','utf8');
function setup(saved,dark=false,blocked=false){
 const listeners={},buttonListeners={},attrs={},storage={value:saved};
 const button={setAttribute:(k,v)=>attrs[k]=v,addEventListener:(k,fn)=>buttonListeners[k]=fn};
 const status={textContent:''},root={dataset:{}};
 const media={matches:dark,addEventListener:(k,fn)=>listeners.system=fn};
 vm.runInNewContext(source,{document:{documentElement:root,getElementById:id=>id==='theme-toggle'?button:status,addEventListener:(k,fn)=>listeners.ready=fn},window:{matchMedia:()=>media,addEventListener:(k,fn)=>listeners[k]=fn},localStorage:{getItem(){if(blocked)throw Error();return storage.value;},setItem(k,v){if(blocked)throw Error();storage.value=v;}}});
 return {root,attrs,status,storage,media,listeners,click:()=>buttonListeners.click()};
}
test('first paint follows device; system changes follow until an explicit choice',()=>{
 const s=setup(null,true);assert.equal(s.root.dataset.theme,'dark');s.listeners.ready();assert.equal(s.attrs['aria-checked'],'true');
 s.media.matches=false;s.listeners.system();assert.equal(s.root.dataset.theme,'light');s.click();assert.equal(s.storage.value,'dark');
 s.listeners.system();assert.equal(s.root.dataset.theme,'dark');assert.equal(s.status.textContent,'Dark theme enabled.');
});
test('saved choice wins, toggles both ways, and syncs across tabs',()=>{
 const s=setup('light',true);assert.equal(s.root.dataset.theme,'light');s.listeners.ready();s.click();assert.equal(s.attrs['aria-checked'],'true');s.click();assert.equal(s.attrs['aria-checked'],'false');
 s.listeners.storage({key:'polo-fragrance-theme',newValue:'dark'});assert.equal(s.root.dataset.theme,'dark');
 s.media.matches=false;s.listeners.storage({key:null,newValue:null});assert.equal(s.root.dataset.theme,'light');
});
test('unavailable storage does not break switching',()=>{
 const s=setup(null,false,true);s.listeners.ready();s.click();assert.equal(s.root.dataset.theme,'dark');
});
