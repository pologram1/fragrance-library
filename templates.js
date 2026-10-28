/* These studies only change this preview. No account or app preferences change. */
(function(){
 'use strict';
 const studies={
  noir:{eyebrow:'01 / ATELIER NOIR',title:'Scent, with<br><em>substance.</em>',description:'A considered collection. A personal signature. Discover extraordinary fragrances and make room for what moves you.',note:'Charcoal, warm ivory, and understated brass. A quiet gallery for your collection.'},
  deco:{eyebrow:'02 / DECO VERT',title:'The art of<br><em>discovery.</em>',description:'Enter a world of remarkable houses and exceptional compositions. Your collection deserves a place with character.',note:'Forest green, champagne, and geometric arches. Architectural luxury with an Art Deco rhythm.'},
  editorial:{eyebrow:'03 / MAISON EDITORIAL',title:'A story in<br><em>every bottle.</em>',description:'Follow your curiosity through notes, houses, and memories. A fragrance journal that becomes your personal collection.',note:'Paper ivory, oxblood, and expressive serif type. The feel of an independent fragrance magazine.'}
 };
 function render(){
  const key=location.hash.slice(1),selected=studies[key]?key:'noir',study=studies[selected];
  document.body.dataset.style=selected;
  document.querySelectorAll('button[data-style]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.style===selected)));
  document.getElementById('study-eyebrow').textContent=study.eyebrow;
  document.getElementById('study-title').innerHTML=study.title;
  document.getElementById('study-description').textContent=study.description;
  document.getElementById('study-note').textContent=study.note;
 }
 document.querySelectorAll('button[data-style]').forEach(button=>button.addEventListener('click',()=>{location.hash=button.dataset.style;}));
 window.addEventListener('hashchange',render);render();
})();
