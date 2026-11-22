/* Device transfer: encrypted backup file + password. No server involved. */
(function(){
var MAGIC="YOMAN1",MAGIC2="YOMAN2",ITER2=600000,MINPW=8;
function enc(s){return new TextEncoder().encode(s)}
function key(pw,salt,it){return crypto.subtle.importKey("raw",enc(pw),"PBKDF2",!1,["deriveKey"]).then(function(k){return crypto.subtle.deriveKey({name:"PBKDF2",salt:salt,iterations:it||250000,hash:"SHA-256"},k,{name:"AES-GCM",length:256},!1,["encrypt","decrypt"])})}
function pack(docs,pw){var salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12)),body=enc(JSON.stringify({app:"yoman",v:1,at:new Date().toISOString(),docs:docs}));
 return key(pw,salt,ITER2).then(function(k){return crypto.subtle.encrypt({name:"AES-GCM",iv:iv},k,body)}).then(function(ct){var m=enc(MAGIC2),h=m.length,out=new Uint8Array(h+4+16+12+ct.byteLength);out.set(m,0);new DataView(out.buffer).setUint32(h,ITER2);out.set(salt,h+4);out.set(iv,h+20);out.set(new Uint8Array(ct),h+32);return out})}
function hasMagic(b,m){for(var i=0;i<m.length;i++)if(b[i]!==m[i])return!1;return!0}
function unpack(buf,pw){var b=new Uint8Array(buf),m1=enc(MAGIC),m2=enc(MAGIC2),h=m1.length,salt,iv,ct,it;
 if(b[0]===123){var j=JSON.parse(new TextDecoder().decode(b));return Promise.resolve(j)}
 if(hasMagic(b,m2)){it=new DataView(b.buffer,b.byteOffset).getUint32(h);if(it<100000||it>5000000)return Promise.reject(new Error("format"));salt=b.slice(h+4,h+20);iv=b.slice(h+20,h+32);ct=b.slice(h+32)}
 else if(hasMagic(b,m1)){it=250000;salt=b.slice(h,h+16);iv=b.slice(h+16,h+28);ct=b.slice(h+28)}
 else return Promise.reject(new Error("format"));
 return key(pw,salt,it).then(function(k){return crypto.subtle.decrypt({name:"AES-GCM",iv:iv},k,ct)}).then(function(p){return JSON.parse(new TextDecoder().decode(p))},function(){var e=new Error("password");throw e})}
function sheet(html){var s=document.createElement("div");s.className="scrim xf-scrim";s.innerHTML='<div class="sheet xf-sheet" role="dialog" aria-modal="true">'+html+'</div>';document.body.appendChild(s);s.addEventListener("click",function(e){if(e.target===s)s.remove()});s.querySelector("[data-x]").onclick=function(){s.remove()};return s}
var head=function(t){return'<div class="sheet-head"><h2>'+t+'</h2><button type="button" class="icon-btn" data-x aria-label="סגירה">✕</button></div>'};
window.xferSend=function(){var s=sheet(head("שליחה למכשיר אחר")+'<p class="sheet-text">בחר סיסמה. הנתונים יישמרו בקובץ מוצפן, ואותו תשלח לעצמך (וואטסאפ, מייל, דרייב). במכשיר השני בוחרים "קבלה ממכשיר אחר" ומקלידים את אותה סיסמה.</p><label class="xf-l">סיסמה<input class="text-input" id="xf-pw" type="password" autocomplete="new-password" minlength="8" placeholder="לפחות 8 תווים, לא קוד הפתיחה"></label><p class="xf-err" hidden></p><div class="sheet-actions"><button type="button" class="btn btn-primary" id="xf-go">צור קובץ ושלח</button></div>');
 var pw=s.querySelector("#xf-pw"),err=s.querySelector(".xf-err"),go=s.querySelector("#xf-go");pw.focus();
 go.onclick=function(){if((pw.value||"").length<MINPW){err.hidden=!1;err.textContent="הסיסמה צריכה להיות לפחות 8 תווים.";return}go.disabled=!0;go.textContent="מצפין…";
  window.yomanStore.all().then(function(d){return pack(d,pw.value)}).then(function(bytes){var name="gozo-"+new Date().toISOString().slice(0,10)+".yoman",file=new File([bytes],name,{type:"application/octet-stream"});
   if(navigator.canShare&&navigator.canShare({files:[file]}))return navigator.share({files:[file],title:"Gozo"}).catch(function(){}).then(function(){s.remove()});
   var u=URL.createObjectURL(file),a=document.createElement("a");a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(u)},4000);
   go.textContent="הקובץ נשמר בהורדות";setTimeout(function(){s.remove()},1500)}).catch(function(){err.hidden=!1;err.textContent="משהו השתבש ביצירת הקובץ. נסה שוב.";go.disabled=!1;go.textContent="צור קובץ ושלח"})}};
window.xferRecv=function(){var s=sheet(head("קבלה ממכשיר אחר")+'<p class="sheet-text">בחר את הקובץ שקיבלת והקלד את הסיסמה. כל הנתונים במכשיר הזה יוחלפו בנתונים מהקובץ.</p><input type="file" id="xf-file" class="text-input" accept=".yoman,.json,application/octet-stream,application/json"><label class="xf-l">סיסמה<input class="text-input" id="xf-pw" type="password" autocomplete="current-password"></label><p class="xf-err" hidden></p><div class="sheet-actions"><button type="button" class="btn btn-primary" id="xf-go">טען נתונים</button></div>');
 var f=s.querySelector("#xf-file"),pw=s.querySelector("#xf-pw"),err=s.querySelector(".xf-err"),go=s.querySelector("#xf-go"),bad=function(t){err.hidden=!1;err.textContent=t;go.disabled=!1;go.textContent="טען נתונים"};
 go.onclick=function(){var file=f.files&&f.files[0];if(!file)return bad("צריך לבחור קובץ.");go.disabled=!0;go.textContent="פותח…";
  file.arrayBuffer().then(function(b){return unpack(b,pw.value||"")}).then(function(j){if(!j||j.app!=="yoman"||!j.docs)throw new Error("format");var n=Object.keys(j.docs).length;
   go.textContent="מחליף…";return window.yomanStore.replace(j.docs).then(function(){go.textContent="נטען. מרענן…";setTimeout(function(){location.reload()},500)})}).catch(function(e){bad(e&&e.message==="password"?"הסיסמה לא נכונה, או שהקובץ פגום.":"זה לא קובץ גיבוי של Gozo.")})}};
})();
(function(){function add(){var h=document.querySelector(".empty-hero");if(!h||h.querySelector(".xf-empty"))return;var b=document.createElement("button");b.type="button";b.className="btn btn-line xf-empty";b.textContent="יש לי נתונים ממכשיר אחר";b.onclick=function(){window.xferRecv()};h.appendChild(b)}
new MutationObserver(add).observe(document.documentElement,{subtree:!0,childList:!0})})();
