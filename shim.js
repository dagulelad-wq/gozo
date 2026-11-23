/* Local storage layer: replaces Claude's cloud store. Everything stays on this device (IndexedDB). */
(function(){
var ST="docs",mem=new Map(),ready,docL=new Map(),colL=new Map();
var L=window.yomanLock;function getIdb(){return window.yomanIdb()}
function load(){return getIdb().then(function(d){return new Promise(function(res){var raw=[],tx=d.transaction(ST,"readonly"),rq=tx.objectStore(ST).openCursor();rq.onsuccess=function(){var c=rq.result;if(c){raw.push([c.key,c.value]);c.continue()}else res(raw)};rq.onerror=function(){res(raw)}})}).then(function(raw){
 return Promise.all(raw.map(function(kv){return L.decrypt(kv[1]).then(function(r){mem.set(kv[0],r.v);if(r.legacy)persist(kv[0],r.v)},function(){})}))}).catch(function(){})}
/* writes are encrypted and serialized so a later write can never land before an earlier one */
var q=Promise.resolve();
function persist(path,val){q=q.then(function(){return(val===undefined?Promise.resolve(undefined):L.encrypt(val)).then(function(rec){return getIdb().then(function(d){return new Promise(function(res){var tx=d.transaction(ST,"readwrite");rec===undefined?tx.objectStore(ST).delete(path):tx.objectStore(ST).put(rec,path);tx.oncomplete=res;tx.onerror=res})})})}).catch(function(){});return q}
function parent(p){var i=p.lastIndexOf("/");return p.slice(0,i)}
function snapDoc(p){var v=mem.get(p);return{id:p.slice(p.lastIndexOf("/")+1),exists:v!==undefined,data:function(){return v===undefined?undefined:JSON.parse(JSON.stringify(v))},metadata:{fromCache:!1,hasPendingWrites:!1}}}
function snapCol(c,q){var ds=[];mem.forEach(function(v,k){if(parent(k)===c)ds.push(k)});ds.sort();var docs=ds.map(snapDoc);
 if(q){(q.w||[]).forEach(function(w){docs=docs.filter(function(d){var x=(d.data()||{})[w[0]];switch(w[1]){case"==":return x===w[2];case"!=":return x!==w[2];case"<":return x<w[2];case"<=":return x<=w[2];case">":return x>w[2];case">=":return x>=w[2];case"in":return w[2].indexOf(x)>-1;case"not-in":return w[2].indexOf(x)<0;case"array-contains":return Array.isArray(x)&&x.indexOf(w[2])>-1}return!0})});
  if(q.o){var f=q.o[0],dir=q.o[1]==="desc"?-1:1;docs.sort(function(a,b){var x=(a.data()||{})[f],y=(b.data()||{})[f];return x===y?0:(x===undefined?1:y===undefined?-1:(x<y?-dir:dir))})}if(q.l)docs=docs.slice(0,q.l)}
 return{docs:docs,size:docs.length,empty:!docs.length,docChanges:function(){return docs.map(function(d,i){return{type:"added",doc:d,oldIndex:-1,newIndex:i}})},metadata:{fromCache:!1,hasPendingWrites:!1}}}
function notify(p){(docL.get(p)||[]).forEach(function(f){try{f(snapDoc(p))}catch(e){}});var c=parent(p);(colL.get(c)||[]).forEach(function(o){try{o.f(snapCol(c,o.q))}catch(e){}})}
function write(p,v){if(v===undefined)mem.delete(p);else mem.set(p,JSON.parse(JSON.stringify(v)));notify(p);return persist(p,v)}
function merge(a,b){var o=Object.assign({},a);Object.keys(b).forEach(function(k){var v=b[k];if(v&&typeof v==="object"&&!Array.isArray(v)&&o[k]&&typeof o[k]==="object"&&!Array.isArray(o[k]))o[k]=merge(o[k],v);else o[k]=v});return o}
function rid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,8)}
function docRef(p){return{id:p.slice(p.lastIndexOf("/")+1),path:p,
 get:function(){return ready.then(function(){return snapDoc(p)})},
 set:function(v){return ready.then(function(){return write(p,v)})},
 update:function(v){return ready.then(function(){if(!mem.has(p)){var e=new Error("missing");e.code="invalid_argument";throw e}return write(p,merge(mem.get(p),v))})},
 delete:function(){return ready.then(function(){return write(p,undefined)})},
 onSnapshot:function(f){var a=docL.get(p)||[];a.push(f);docL.set(p,a);ready.then(function(){f(snapDoc(p))});return function(){var b=docL.get(p)||[];docL.set(p,b.filter(function(x){return x!==f}))}},
 collection:function(x){return colRef(p+"/"+x)},
 acquire:function(o){return Promise.resolve({acquired:!0,holder:o&&o.holder})}}}
function colRef(c,q){q=q||{};var self={path:c,
 doc:function(id){return docRef(c+"/"+(id||rid()))},
 add:function(v){var r=docRef(c+"/"+rid());return r.set(v).then(function(){return r})},
 where:function(a,o,b){return colRef(c,Object.assign({},q,{w:(q.w||[]).concat([[a,o,b]])}))},
 orderBy:function(f,d){return colRef(c,Object.assign({},q,{o:[f,d]}))},
 limit:function(n){return colRef(c,Object.assign({},q,{l:n}))},
 get:function(){return ready.then(function(){return snapCol(c,q)})},
 onSnapshot:function(f){var o={f:f,q:q},a=colL.get(c)||[];a.push(o);colL.set(c,a);ready.then(function(){f(snapCol(c,q))});return function(){var b=colL.get(c)||[];colL.set(c,b.filter(function(x){return x!==o}))}}};return self}
ready=L.ready.then(load);
var DB={doc:docRef,collection:colRef};
var USER={isOwner:function(){return!0},canEdit:function(){return!0},can:function(){return!0},id:function(){return Promise.resolve("local")},me:function(){return Promise.resolve({id:"local",name:""})},profiles:function(){return Promise.resolve({})},search:function(){return Promise.resolve([])}};
window.claude={use:function(n){return ready.then(function(){return n==="db"?DB:n==="user"?USER:null})}};
/* export / import of every document, used by device transfer */
window.yomanStore={all:function(){return ready.then(function(){var o={};mem.forEach(function(v,k){o[k]=v});return o})},
 replace:function(docs){return L.ready.then(function(){var ks=Object.keys(docs);return Promise.all(ks.map(function(k){return L.encrypt(docs[k])})).then(function(recs){return getIdb().then(function(d){return new Promise(function(res,rej){var tx=d.transaction(ST,"readwrite"),os=tx.objectStore(ST);os.clear();ks.forEach(function(k,i){os.put(recs[i],k)});tx.oncomplete=res;tx.onerror=function(){rej(tx.error)}})})})})}};
if(navigator.storage&&navigator.storage.persist)navigator.storage.persist().catch(function(){});
/* updates: the app checks for a new version whenever it comes to the front; the menu has a manual check */
var manualUpd=!1;
function bar(){if(document.querySelector(".upd-bar"))return;var b=document.createElement("div");b.className="upd-bar";b.setAttribute("role","status");b.innerHTML='<span>יש גרסה חדשה של Gozo</span><button type="button">רענון</button>';b.querySelector("button").onclick=function(){location.reload()};document.body.appendChild(b)}
function toast(t){var b=document.createElement("div");b.className="upd-bar";b.innerHTML="<span></span>";b.firstChild.textContent=t;document.body.appendChild(b);setTimeout(function(){b.remove()},2500)}
window.gozoUpdate=function(){manualUpd=!0;if(!("serviceWorker"in navigator))return location.reload();
 navigator.serviceWorker.getRegistration().then(function(r){if(!r)return location.reload();
  return r.update().then(function(){var w=r.installing||r.waiting;if(!w){toast("זו הגרסה האחרונה ("+(window.GOZO_V||"")+"). מרענן…");setTimeout(function(){location.reload()},900);return}
   setTimeout(function(){location.reload()},4000)})}).catch(function(){location.reload()})};
if("serviceWorker"in navigator){var hadCtl=!!navigator.serviceWorker.controller;
 navigator.serviceWorker.addEventListener("controllerchange",function(){if(!hadCtl){hadCtl=!0;return}if(manualUpd)location.reload();else bar()});
 window.addEventListener("load",function(){navigator.serviceWorker.register("sw.js").catch(function(){})});
 document.addEventListener("visibilitychange",function(){if(document.hidden)return;navigator.serviceWorker.getRegistration().then(function(r){r&&r.update().catch(function(){})})})}
})();
