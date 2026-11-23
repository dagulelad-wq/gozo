/* Network first for the app's own files, so index.html and the scripts always come from the same version.
   The cache is only a fallback for offline use. Google Fonts are cache first. */
const C="yoman-v15",SHELL=["./","index.html","lock.js","shim.js","xfer.js","xlsx.full.min.js","manifest.webmanifest","icon-192.png","icon-512.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(SHELL.map(u=>new Request(u,{cache:"reload"})))).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{const r=e.request;if(r.method!=="GET")return;const u=new URL(r.url);
 if(u.origin===location.origin){const key=r.mode==="navigate"?"index.html":r;
  e.respondWith(fetch(r,{cache:"no-cache"}).then(res=>{if(res.ok){const cp=res.clone();caches.open(C).then(c=>c.put(key,cp))}return res}).catch(()=>caches.match(key).then(m=>m||caches.match("index.html"))));return}
 if(u.host.includes("fonts.g")){e.respondWith(caches.match(r).then(m=>m||fetch(r).then(res=>{const cp=res.clone();caches.open(C).then(c=>c.put(r,cp));return res})))}});
