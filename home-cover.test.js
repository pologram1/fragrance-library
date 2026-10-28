'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {safeLink,announcements}=require('./home-cover');
const now=Date.parse('2026-10-28T12:00:00Z');
test('event banners respect publication windows and require explicit enabled state',()=>{
 const event={id:'expo',enabled:true,title:'Community fragrance event',href:'https://example.com/event',startsAt:'2026-10-28T12:00:00Z',endsAt:'2026-10-29T12:00:00Z'};
 assert.equal(announcements({announcements:[event]},now).length,1);
 for(const patch of [{enabled:false},{title:''},{startsAt:'2026-10-28T12:00:01Z'},{endsAt:'2026-10-28T12:00:00Z'},{startsAt:'bad-date'},{startsAt:'2026-10-28T12:00:00'},{href:'javascript:alert(1)'}])assert.equal(announcements({announcements:[{...event,...patch}]},now).length,0);
 assert.equal(announcements({announcements:[event,event]},now).length,1);
 assert.equal(announcements({announcements:[null,{},event]},now).length,1);
 assert.deepEqual(announcements({},now),[]);
});
test('campaign links allow real app routes and HTTPS destinations only',()=>{
 for(const link of ['#discover','#discover?category=niche','#fragrance/studio-example','#owned','https://example.com/event'])assert.equal(safeLink(link),link);
 for(const link of ['javascript:alert(1)','http://example.com','https://name:secret@example.com','//example.com','file:///secret',null])assert.equal(safeLink(link),null);
});
