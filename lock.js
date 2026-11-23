/* App lock: a short PIN opens the app; every saved record is encrypted (AES-GCM) with a random data key that is itself wrapped by a key derived from the PIN. */
(function(){
var DBN="yoman",ITER=310000,MINL=4,MAXL=6,RELOCK_MS=30000,LS_F="yoman.lockFails",LS_U="yoman.lockUntil";
var te=new TextEncoder(),td=new TextDecoder();
function openDb(){return new Promise(function(res,rej){var r=indexedDB.open(DBN,2);r.onupgradeneeded=function(){var d=r.result;if(!d.objectStoreNames.contains("docs"))d.createObjectStore("docs");if(!d.objectStoreNames.contains("meta"))d.createObjectStore("meta")};r.onsuccess=function(){res(r.result)};r.onerror=function(){rej(r.error)}})}
var dbp=null;window.yomanIdb=function(){return dbp||(dbp=openDb())};
function metaGet(){return window.yomanIdb().then(function(d){return new Promise(function(res){var q=d.transaction("meta","readonly").objectStore("meta").get("lock");q.onsuccess=function(){res(q.result||null)};q.onerror=function(){res(null)}})})}
function metaPut(v){return window.yomanIdb().then(function(d){return new Promise(function(res,rej){var tx=d.transaction("meta","readwrite");tx.objectStore("meta").put(v,"lock");tx.oncomplete=res;tx.onerror=function(){rej(tx.error)}})})}
function kek(pin,salt,iter){return crypto.subtle.importKey("raw",te.encode(pin),"PBKDF2",!1,["deriveKey"]).then(function(k){return crypto.subtle.deriveKey({name:"PBKDF2",salt:salt,iterations:iter,hash:"SHA-256"},k,{name:"AES-GCM",length:256},!1,["wrapKey","unwrapKey"])})}
function wrap(dk,pin){var salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));return kek(pin,salt,ITER).then(function(k){return crypto.subtle.wrapKey("raw",dk,k,{name:"AES-GCM",iv:iv})}).then(function(w){return{v:1,salt:salt,iv:iv,iter:ITER,wrapped:w,len:pin.length}})}
function unwrap(m,pin,extractable){return kek(pin,m.salt,m.iter).then(function(k){return crypto.subtle.unwrapKey("raw",m.wrapped,k,{name:"AES-GCM",iv:m.iv},{name:"AES-GCM",length:256},!!extractable,["encrypt","decrypt"])})}
var dataKey=null,meta=null,resolveReady,locked=!0;
var ready=new Promise(function(r){resolveReady=r});
function encRec(obj){var iv=crypto.getRandomValues(new Uint8Array(12));return crypto.subtle.encrypt({name:"AES-GCM",iv:iv},dataKey,te.encode(JSON.stringify(obj))).then(function(ct){return{e:1,iv:iv,ct:ct}})}
function isEnc(r){return!!(r&&r.e===1&&r.iv&&r.ct)}
function decRec(r){if(!isEnc(r))return Promise.resolve({v:r,legacy:!0});return crypto.subtle.decrypt({name:"AES-GCM",iv:r.iv},dataKey,r.ct).then(function(p){return{v:JSON.parse(td.decode(p)),legacy:!1}})}
/* ---------- UI ---------- */
var css='#ylock{position:fixed;inset:0;z-index:2147483647;background:var(--bg,#F6F6FB);color:var(--ink,#1A1B2E);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;padding:24px 16px calc(24px + env(safe-area-inset-bottom,0px));font-family:"IBM Plex Sans Hebrew",system-ui,sans-serif;direction:rtl;-webkit-user-select:none;user-select:none}'+
'#ylock .yl-logo{width:56px;height:56px;border-radius:16px;background:var(--brand,#4A44D4);display:grid;place-items:center;color:#fff}'+
'#ylock h1{margin:0;font-size:20px;font-weight:600;text-align:center}#ylock .yl-sub{margin:-8px 0 0;font-size:14px;color:var(--muted,#555872);text-align:center;max-width:300px;line-height:1.5}'+
'#ylock .yl-dots{display:flex;gap:14px;direction:ltr;min-height:16px}#ylock .yl-dots i{width:14px;height:14px;border-radius:50%;border:2px solid var(--brand,#4A44D4);box-sizing:border-box}#ylock .yl-dots i.on{background:var(--brand,#4A44D4)}'+
'#ylock .yl-err{min-height:20px;margin:0;font-size:14px;color:var(--spend,#B83A27);text-align:center}'+
'#ylock .yl-pad{display:grid;grid-template-columns:repeat(3,72px);gap:14px 22px;direction:ltr}'+
'#ylock .yl-pad button{width:72px;height:72px;border-radius:50%;border:0;background:var(--surface,#fff);color:inherit;font-size:26px;font-weight:500;line-height:1;font-family:inherit;box-shadow:0 1px 2px rgba(0,0,0,.08);cursor:pointer;touch-action:manipulation}'+
'#ylock .yl-pad button:active{background:var(--line,#E4E4EE)}#ylock .yl-pad button.yl-ghost{background:transparent;box-shadow:none;font-size:15px}#ylock .yl-pad button:disabled{opacity:.35}'+
'#ylock .yl-link{background:none;border:0;color:var(--brand,#4A44D4);font-size:14px;font-weight:500;font-family:inherit;padding:12px;min-height:44px;cursor:pointer}'+
'#ylock .yl-box{max-width:320px;text-align:center;display:flex;flex-direction:column;gap:12px;font-size:14px;line-height:1.6}'+
'#ylock .yl-danger{background:var(--spend,#B83A27);color:#fff;border:0;border-radius:12px;min-height:48px;padding:0 20px;font-size:15px;font-weight:600;font-family:inherit;cursor:pointer}'+
'#ylock .shake{animation:ylshake .35s}@keyframes ylshake{20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}'+
'@media (prefers-color-scheme:dark){#ylock{background:var(--bg,#12131F);color:var(--ink,#ECECF6)}#ylock .yl-pad button{background:var(--surface,#1E2033)}}'+
'html.ylocked #root{visibility:hidden}';
var lockIcon='<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
function el(){var e=document.getElementById("ylock");if(e)return e;var st=document.createElement("style");st.textContent=css;document.head.appendChild(st);e=document.createElement("div");e.id="ylock";e.setAttribute("role","dialog");e.setAttribute("aria-modal","true");document.body.appendChild(e);return e}
function whenBody(f){if(document.body)f();else document.addEventListener("DOMContentLoaded",f)}
function show(){document.documentElement.classList.add("ylocked");return el()}
function hide(){var e=document.getElementById("ylock");if(e)e.remove();document.documentElement.classList.remove("ylocked")}
/* generic PIN pad. opts: title, sub, len (fixed length → auto submit) or free (MINL..MAXL with confirm key), onDone(pin, ui) */
function pad(opts){var e=show(),pin="";
 e.innerHTML='<div class="yl-logo">'+lockIcon+'</div><h1></h1><p class="yl-sub"></p><div class="yl-dots"></div><p class="yl-err" aria-live="polite"></p><div class="yl-pad"></div>'+(opts.foot||"");
 e.querySelector("h1").textContent=opts.title;var sub=e.querySelector(".yl-sub");if(opts.sub)sub.textContent=opts.sub;else sub.remove();
 var dots=e.querySelector(".yl-dots"),err=e.querySelector(".yl-err"),grid=e.querySelector(".yl-pad"),busy=!1;
 function draw(){var n=opts.len||Math.max(MINL,pin.length);dots.innerHTML="";for(var i=0;i<n;i++){var d=document.createElement("i");if(i<pin.length)d.className="on";dots.appendChild(d)}if(ok)ok.disabled=pin.length<MINL}
 var keys=["1","2","3","4","5","6","7","8","9",opts.len?"":"ok","0","del"],ok=null;
 keys.forEach(function(k){var b=document.createElement("button");b.type="button";
  if(k===""){b.className="yl-ghost";b.disabled=!0;b.style.visibility="hidden"}
  else if(k==="del"){b.className="yl-ghost";b.textContent="⌫";b.setAttribute("aria-label","מחיקה");b.onclick=function(){if(!busy){pin=pin.slice(0,-1);draw()}}}
  else if(k==="ok"){b.className="yl-ghost";b.textContent="המשך";ok=b;b.onclick=function(){if(!busy&&pin.length>=MINL)submit()}}
  else{b.textContent=k;b.onclick=function(){if(busy)return;var max=opts.len||MAXL;if(pin.length>=max)return;pin+=k;draw();err.textContent="";if(pin.length===max)submit()}}
  grid.appendChild(b)});
 function submit(){busy=!0;var p=pin;Promise.resolve(opts.onDone(p,ui)).then(function(){busy=!1})}
 var ui={el:e,fail:function(msg){pin="";draw();err.textContent=msg||"";dots.classList.remove("shake");void dots.offsetWidth;dots.classList.add("shake")},
  msg:function(m){err.textContent=m},disable:function(on){grid.querySelectorAll("button").forEach(function(b){if(b.style.visibility!=="hidden")b.disabled=on})}};
 document.onkeydown=function(ev){if(!document.getElementById("ylock"))return;if(/^[0-9]$/.test(ev.key)){var b=[].find.call(grid.children,function(x){return x.textContent===ev.key});b&&b.click()}else if(ev.key==="Backspace"){grid.children[11].click()}else if(ev.key==="Enter"&&ok){ok.click()}};
 draw();if(opts.after)opts.after(e,ui);return ui}
/* throttle wrong attempts: 5 free, then 30s doubling up to 15 min */
function lsGet(k){try{return+localStorage.getItem(k)||0}catch(e){return 0}}
function lsSet(k,v){try{v?localStorage.setItem(k,String(v)):localStorage.removeItem(k)}catch(e){}}
function waitLeft(){return Math.max(0,lsGet(LS_U)-Date.now())}
function countdown(ui){var t=setInterval(function(){var w=waitLeft();if(!document.getElementById("ylock")){clearInterval(t);return}if(w<=0){clearInterval(t);ui.disable(!1);ui.msg("");return}ui.disable(!0);ui.msg("יותר מדי ניסיונות. נסה שוב בעוד "+Math.ceil(w/1000)+" שניות.")},500)}
function badTry(ui){var f=lsGet(LS_F)+1;lsSet(LS_F,f);if(f>=5){lsSet(LS_U,Date.now()+Math.min(900000,30000*Math.pow(2,f-5)));ui.fail("");countdown(ui)}else ui.fail("קוד שגוי")}
var forgot='<button type="button" class="yl-link" data-forgot>שכחתי את הקוד</button>';
function forgotScreen(back){var e=show();e.innerHTML='<div class="yl-logo">'+lockIcon+'</div><h1>שכחת את הקוד?</h1><div class="yl-box"><p style="margin:0">הנתונים במכשיר מוצפנים בקוד, ולכן אין דרך לשחזר אותו. אפשר למחוק הכל מהמכשיר הזה ולטעון מחדש מקובץ גיבוי (קובץ ‎.yoman ששמרת).</p><button type="button" class="yl-danger" data-wipe>מחיקת כל הנתונים במכשיר</button><button type="button" class="yl-link" data-back>חזרה</button></div>';
 e.querySelector("[data-back]").onclick=back;var w=e.querySelector("[data-wipe]"),armed=!1;
 w.onclick=function(){if(!armed){armed=!0;w.textContent="בטוח? לחץ שוב למחיקה";return}w.disabled=!0;w.textContent="מוחק…";wipe()}}
function wipe(){lsSet(LS_F,0);lsSet(LS_U,0);var go=function(){var r=indexedDB.deleteDatabase(DBN);r.onsuccess=r.onerror=r.onblocked=function(){location.reload()}};if(dbp)dbp.then(function(d){d.close();go()},go);else go()}
function unlockScreen(onOk){var ui=pad({title:"Gozo",sub:"הקלד את הקוד",len:meta.len,foot:forgot,
  onDone:function(p,ui){if(waitLeft()>0){countdown(ui);ui.fail("");return}return unwrap(meta,p,!1).then(function(k){lsSet(LS_F,0);lsSet(LS_U,0);onOk(k)},function(){badTry(ui)})},
  after:function(e,ui){e.querySelector("[data-forgot]").onclick=function(){forgotScreen(function(){unlockScreen(onOk)})};if(waitLeft()>0)countdown(ui)}})}
function setupScreen(title,sub,onPin){var first=null;
 function step1(){pad({title:title,sub:sub,onDone:function(p){first=p;step2()}})}
 function step2(){pad({title:"הקלד שוב את הקוד",sub:"לאימות",len:first.length,foot:'<button type="button" class="yl-link" data-back>התחל מחדש</button>',
  onDone:function(p,ui){if(p!==first){ui.fail("הקודים לא תואמים");return}ui.disable(!0);ui.msg("שומר…");return onPin(p)},
  after:function(e){e.querySelector("[data-back]").onclick=step1}})}
 step1()}
/* ---------- flow ---------- */
function start(){metaGet().then(function(m){meta=m;
 if(m){unlockScreen(function(k){dataKey=k;locked=!1;hide();resolveReady()});return}
 setupScreen("בחר קוד לפתיחת Gozo","4 עד 6 ספרות. תצטרך אותו בכל פתיחה. אם תשכח אותו, אפשר לשחזר רק מקובץ גיבוי.",function(p){
  return crypto.subtle.generateKey({name:"AES-GCM",length:256},!0,["encrypt","decrypt"]).then(function(dk){return wrap(dk,p).then(function(w){return metaPut(w).then(function(){meta=w;return unwrap(w,p,!1)})})}).then(function(k){dataKey=k;locked=!1;hide();resolveReady()})})})}
whenBody(start);
/* lock again when returning after RELOCK_MS in the background */
var hiddenAt=0;
document.addEventListener("visibilitychange",function(){if(locked||!meta)return;if(document.hidden){hiddenAt=Date.now();return}
 if(hiddenAt&&Date.now()-hiddenAt>RELOCK_MS){locked=!0;unlockScreen(function(){locked=!1;hide()})}hiddenAt=0});
window.yomanLock={ready:ready,encrypt:encRec,decrypt:decRec,isEncrypted:isEnc,
 changePin:function(){if(locked||!meta)return;
  pad({title:"החלפת קוד",sub:"הקלד את הקוד הנוכחי",len:meta.len,foot:'<button type="button" class="yl-link" data-cancel>ביטול</button>',
   onDone:function(p,ui){return unwrap(meta,p,!0).then(function(ext){
    setupScreen("בחר קוד חדש","4 עד 6 ספרות",function(np){return wrap(ext,np).then(function(w){return metaPut(w).then(function(){meta=w;hide()})})})},function(){badTry(ui)})},
   after:function(e){e.querySelector("[data-cancel]").onclick=hide}})}};
})();
