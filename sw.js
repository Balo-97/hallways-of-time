const CACHE='hallways-of-time-v29';
const SHELL=['./','./vr/','./vr/museum.css','./vr/museum.js','./vr/journey-scene.js','./vr/grand-hall.js','./vr/origin.js','./vr/future-gallery.js','./vr/humanity-globe.js','./vr/coastlines.js','./vr/time-axis.js','./vr/sculptures.js','./vr/imagery.js','./vr/detail.js','./vr/native-plates.js','./data/image-credits.json','./credits.html','./data/events.json','./vendor/three.module.js','./vendor/three.core.js','./assets/icon-192.png','./assets/icon-512.png','./manifest.webmanifest'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('hallways-of-time-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
  event.respondWith(fetch(event.request).then(response=>{
    if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,copy)));}
    return response;
  }).catch(async()=>{
    const cached=await caches.match(event.request,{ignoreSearch:true});
    return cached||new Response('This exhibit has not been cached. Reconnect to load it.',{status:503,headers:{'Content-Type':'text/plain'}});
  }));
});
