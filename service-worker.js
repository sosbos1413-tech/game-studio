const CACHE='game-studio-pwa-v199';
const SHELL=['./','./index.html','./three.min.js','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{for(const key of await caches.keys()){if(key.startsWith('game-studio-pwa-')&&key!==CACHE)await caches.delete(key)}await self.clients.claim()})())});
self.addEventListener('message',event=>{if(event.data==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('fetch',event=>{
  const req=event.request;if(req.method!=='GET')return;
  const url=new URL(req.url);if(url.origin!==self.location.origin)return;
  if(req.headers.has('range'))return; // Do not interfere with streamed MP3 range requests.
  if(req.mode==='navigate'){
    event.respondWith((async()=>{try{const fresh=await fetch(req);const c=await caches.open(CACHE);c.put('./index.html',fresh.clone());return fresh}catch(e){return (await caches.match(req))||(await caches.match('./index.html'))}})());return;
  }
  if(/\.(?:png|webmanifest|js)$/i.test(url.pathname)){
    event.respondWith((async()=>{const hit=await caches.match(req);if(hit)return hit;const fresh=await fetch(req);if(fresh.ok)(await caches.open(CACHE)).put(req,fresh.clone());return fresh})());
  }
});
