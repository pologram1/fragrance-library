'use strict';
const fs=require('node:fs'),path=require('node:path');
const Catalog=require('../catalog'),Photos=require('../photo-standards'),Market=require('../market-prices'),Pricing=require('../pricing'),Runtime=require('../runtime-data');
function build(root=path.resolve(__dirname,'..')){
 const read=name=>JSON.parse(fs.readFileSync(path.join(root,'data',name+'.json'),'utf8'));
 const base=read('catalog'),manifest=read('photos'),retailer=read('retailer-catalog');
 const original=[...base.fragrances,...(manifest.additionalRecords||[]),...retailer.fragrances];
 const rows=original.map(f=>{const identity=manifest.photos[f.id]?.review?.productIdentity;return identity?{...f,concentration:f.concentration||identity.concentration,sizeMl:f.sizeMl||identity.sizeMl}:f;});
 const prepared=Catalog.prepare(rows,{imageAvailable:f=>Boolean(Photos.approved(f,manifest))});
 Market.configureCatalog(prepared.records);Market.configure({products:[...read('prices').products,...read('retailer-prices').products]});
 const target=path.join(root,'data/runtime');fs.mkdirSync(path.join(target,'profiles'),{recursive:true});
 const write=(file,data)=>fs.writeFileSync(path.join(target,file+'.json'),JSON.stringify(data));
 const fields=['id','brand','name','displayBrand','concentration','sizeMl','quantity','sourceUrl','barcode','audience','type','sourceIds'];
 const photos={};for(const f of rows){const p=Photos.approved(f,manifest);if(p){photos[f.id]=Object.fromEntries(['status','url','width','height','sourceUrl','credit','license','checks','composition','sourceKind'].filter(k=>p[k]!==undefined).map(k=>[k,p[k]]));photos[f.id].review=Object.fromEntries(['reviewedBy','sourceSha256','policyVersion','identityConfirmed','productIdentity','editorialCompositionConfirmed'].filter(k=>p.review[k]!==undefined).map(k=>[k,p.review[k]]));}}
 const fragrances=prepared.records.map(f=>{const row=Object.fromEntries(fields.filter(k=>f[k]!==undefined).map(k=>[k,f[k]]));const barcodes=[...new Set(f.sourceRecords.map(r=>r.barcode).filter(code=>code&&code!==f.barcode))];if(barcodes.length)row.barcodes=barcodes;if(f.sizeMl)delete row.quantity;return row;});
 fragrances.sort((a,b)=>Number(Boolean(photos[b.id]))-Number(Boolean(photos[a.id]))||a.brand.localeCompare(b.brand)||a.name.localeCompare(b.name));
 write('browse',{version:1,metadata:{...base.metadata,merged:prepared.merged},records:Runtime.packCatalog(fragrances),photos});
 write('prices',Runtime.packPrices(prepared.records.map(f=>[f.id,Pricing.latest(Market.offers(f))])));
 const buckets=Array.from({length:32},()=>[]);
 for(const profile of [...read('retailer-profiles').profiles,...read('fragrance-profiles').profiles])for(const bucket of new Set(profile.catalogIds.map(Runtime.bucket)))buckets[Number(bucket)].push(profile);
 buckets.forEach((profiles,i)=>write('profiles/'+String(i).padStart(2,'0'),{profiles}));
 const conflicts=rows.flatMap(f=>{const issues=Catalog.listingConflicts(f);return issues.length?[{id:f.id,name:f.name,sourceUrl:f.sourceUrl,issues}]:[];});
 const report={records:fragrances.length,sourceRecords:rows.length,merged:prepared.merged,approvedPhotos:Object.keys(photos).length,cleanedNames:original.filter(f=>Catalog.cleanName(f)!==f.name).length,conflicts};
 write('quality-report',report);return report;
}
if(require.main===module){const report=build();console.log(JSON.stringify({...report,conflicts:report.conflicts.length}));}
module.exports={build};
