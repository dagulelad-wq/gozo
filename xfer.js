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
function sheet(html){var s=document.createElement("div");s.setAttribute("dir","rtl");s.className="scrim xf-scrim";s.innerHTML='<div class="sheet xf-sheet" role="dialog" aria-modal="true">'+html+'</div>';document.body.appendChild(s);s.addEventListener("click",function(e){if(e.target===s)s.remove()});s.querySelector("[data-x]").onclick=function(){s.remove()};return s}
var head=function(t){return'<div class="sheet-head"><h2>'+t+'</h2><button type="button" class="icon-btn" data-x aria-label="סגירה">✕</button></div>'};
var LS_B="gozo.lastBackup",LS_SN="gozo.backupSnooze";
function lsg(k){try{return+localStorage.getItem(k)||0}catch(e){return 0}}function lss(k,v){try{localStorage.setItem(k,String(v))}catch(e){}}
function markBackup(){lss(LS_B,Date.now());var b=document.querySelector(".bk-bar");if(b)b.remove();try{window.dispatchEvent(new Event("gozo-backup"))}catch(e){}}
function exportSheet(mode){var bk=mode==="backup";
 var s=sheet(head(bk?"גיבוי לדרייב":"שליחה למכשיר אחר")+'<p class="sheet-text">'+(bk?'בחר סיסמה לקובץ הגיבוי, ובחלון שייפתח בחר את Google Drive ואת התיקייה.<br>כדי לשחזר, בעמוד "נתונים וגיבוי" לוחצים "שחזור מגיבוי" ומקלידים את אותה סיסמה.':'בחר סיסמה. הנתונים יישמרו בקובץ מוצפן, ואותו תשלח לעצמך (וואטסאפ, מייל, דרייב). במכשיר השני בוחרים "קבלה ממכשיר אחר" ומקלידים את אותה סיסמה.')+'</p><label class="xf-l">סיסמה<input class="text-input" id="xf-pw" type="password" autocomplete="new-password" minlength="8" placeholder="לפחות 8 תווים, לא קוד הפתיחה"></label><p class="xf-err" hidden></p><div class="sheet-actions"><button type="button" class="btn btn-primary" id="xf-go">'+(bk?"צור גיבוי ושמור":"צור קובץ ושלח")+'</button></div>');
 var label=bk?"צור גיבוי ושמור":"צור קובץ ושלח",pw=s.querySelector("#xf-pw"),err=s.querySelector(".xf-err"),go=s.querySelector("#xf-go");pw.focus();
 var file=null,name="";
 function download(){var u=URL.createObjectURL(file),a=document.createElement("a");a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(u)},4000);markBackup();go.textContent="הקובץ נשמר בהורדות";go.disabled=!0;setTimeout(function(){s.remove()},1800)}
 function fail(e){err.hidden=!1;err.innerHTML='החלון נסגר בלי לשמור'+(e&&e.name&&e.name!=="AbortError"?' ('+e.name+')':'')+'. אפשר לנסות שוב, או <button type="button" class="xf-dl">להוריד את הקובץ לטלפון</button> ולהעלות אותו לדרייב ידנית.';var d=err.querySelector(".xf-dl");if(d)d.onclick=download}
 /* step 2: a fresh tap opens the share sheet right away (Android needs the tap to be recent) */
 function share(){err.hidden=!0;err.className="xf-err";navigator.share({files:[file],title:bk?"גיבוי Gozo":"Gozo"}).then(function(){markBackup();s.remove()},fail)}
 go.onclick=function(){if(file){if(navigator.canShare&&navigator.canShare({files:[file]}))share();else download();return}
  if((pw.value||"").length<MINPW){err.hidden=!1;err.textContent="הסיסמה צריכה להיות לפחות 8 תווים.";return}go.disabled=!0;go.textContent="מצפין…";
  window.yomanStore.all().then(function(d){return pack(d,pw.value)}).then(function(bytes){name=(bk?"gozo-backup-":"gozo-")+new Date().toISOString().slice(0,10)+".yoman";file=new File([bytes],name,{type:"application/octet-stream"});
   pw.disabled=!0;go.disabled=!1;
   if(navigator.canShare&&navigator.canShare({files:[file]})){go.textContent=bk?"הקובץ מוכן · שמירה בדרייב":"הקובץ מוכן · שליחה";err.hidden=!1;err.className="xf-ok";err.textContent="הקובץ הוצפן. לחץ על הכפתור כדי לבחור איפה לשמור.";}
   else download()}).catch(function(){err.hidden=!1;err.textContent="משהו השתבש ביצירת הקובץ. נסה שוב.";go.disabled=!1;go.textContent=label})}}
window.xferSend=function(){exportSheet("send")};
window.xferBackup=function(){exportSheet("backup")};
window.xferRecv=function(){var s=sheet(head("קבלה ממכשיר אחר")+'<p class="sheet-text">בחר את הקובץ שקיבלת והקלד את הסיסמה. כל הנתונים במכשיר הזה יוחלפו בנתונים מהקובץ.</p><input type="file" id="xf-file" class="text-input" accept=".yoman,.json,.txt,application/octet-stream,application/json,text/plain"><label class="xf-l">סיסמה<input class="text-input" id="xf-pw" type="password" autocomplete="current-password"></label><p class="xf-err" hidden></p><div class="sheet-actions"><button type="button" class="btn btn-primary" id="xf-go">טען נתונים</button></div>');
 var f=s.querySelector("#xf-file"),pw=s.querySelector("#xf-pw"),err=s.querySelector(".xf-err"),go=s.querySelector("#xf-go"),bad=function(t){err.hidden=!1;err.textContent=t;go.disabled=!1;go.textContent="טען נתונים"};
 go.onclick=function(){var file=f.files&&f.files[0];if(!file)return bad("צריך לבחור קובץ.");go.disabled=!0;go.textContent="פותח…";
  file.arrayBuffer().then(function(b){return unpack(b,pw.value||"")}).then(function(j){if(!j||j.app!=="yoman"||!j.docs)throw new Error("format");var n=Object.keys(j.docs).length;
   go.textContent="מחליף…";return window.yomanStore.replace(j.docs).then(function(){go.textContent="נטען. מרענן…";setTimeout(function(){location.reload()},500)})}).catch(function(e){bad(e&&e.message==="password"?"הסיסמה לא נכונה, או שהקובץ פגום.":"זה לא קובץ גיבוי של Gozo.")})}};
})();
(function(){function add(){var h=document.querySelector(".empty-hero");if(!h||h.querySelector(".xf-empty"))return;var b=document.createElement("button");b.type="button";b.className="btn btn-line xf-empty";b.textContent="יש לי נתונים ממכשיר אחר";b.onclick=function(){window.xferRecv()};h.appendChild(b)}
new MutationObserver(add).observe(document.documentElement,{subtree:!0,childList:!0})})();

/* backup: a fixed card on the "data" page, and a gentle reminder on home after 20 days without a backup */
(function(){var DAY=864e5,LIMIT=20,busy=!1;
function lsg(k){try{return+localStorage.getItem(k)||0}catch(e){return 0}}function lss(k,v){try{localStorage.setItem(k,String(v))}catch(e){}}
function fmt(t){var d=new Date(t);return d.getDate()+"."+(d.getMonth()+1)+"."+d.getFullYear()}
function ago(t){var n=Math.floor((Date.now()-t)/DAY);return n<1?"היום":n===1?"אתמול":"לפני "+n+" ימים"}
function put(parent,node,before){busy=!0;parent.insertBefore(node,before);busy=!1}
function card(){var view=document.querySelector(".view");var c=document.querySelector(".bk-card");
 var isData=view&&view.querySelector(":scope > .kpi-row")&&view.querySelector(":scope > .page-head");
 if(!isData){if(c)c.remove();return}
 var last=lsg("gozo.lastBackup"),txt=last?"הגיבוי האחרון: "+fmt(last)+" ("+ago(last)+")":"עוד לא נעשה גיבוי. הנתונים שמורים רק במכשיר הזה.";
 if(c&&c.parentNode===view){var s=c.querySelector(".bk-s");if(s.textContent!==txt)s.textContent=txt;return}
 if(c)c.remove();c=document.createElement("section");c.className="card bk-card";
 c.innerHTML='<div class="bk-main"><h2 class="bk-h">גיבוי</h2><p class="bk-s"></p></div><div class="bk-acts"><button type="button" class="btn btn-primary" data-b>גיבוי לדרייב</button><button type="button" class="btn btn-line" data-r>שחזור מגיבוי</button></div>';
 c.querySelector(".bk-s").textContent=txt;c.querySelector("[data-b]").onclick=function(){window.xferBackup()};c.querySelector("[data-r]").onclick=function(){window.xferRecv()};
 var head=view.querySelector(":scope > .page-head");put(view,c,head.nextSibling)}
function reminder(){var hero=document.querySelector(".view > .card.hero"),bar=document.querySelector(".bk-bar");
 if(!hero){if(bar)bar.remove();return}var now=Date.now(),last=lsg("gozo.lastBackup"),first=lsg("gozo.firstSeen");
 if(!first){lss("gozo.firstSeen",now);first=now}
 var since=last||first,due=now-since>LIMIT*DAY&&now>lsg("gozo.backupSnooze");
 if(!due){if(bar)bar.remove();return}if(bar&&bar.nextElementSibling===hero)return;if(bar)bar.remove();
 bar=document.createElement("div");bar.className="bk-bar";bar.setAttribute("role","status");
 bar.innerHTML='<span class="bk-t"></span><button type="button" class="bk-go">לגיבוי</button><button type="button" class="bk-x" aria-label="לא עכשיו">✕</button>';
 bar.querySelector(".bk-t").textContent=last?"עברו "+Math.floor((now-last)/DAY)+" ימים מהגיבוי האחרון":"עדיין לא גיבית את הנתונים";
 bar.querySelector(".bk-go").onclick=function(){window.xferBackup()};
 bar.querySelector(".bk-x").onclick=function(){lss("gozo.backupSnooze",Date.now()+7*DAY);bar.remove()};
 put(hero.parentNode,bar,hero)}
function check(){if(busy)return;card();reminder()}
window.addEventListener("gozo-backup",check);
var t=0;new MutationObserver(function(){if(busy)return;clearTimeout(t);t=setTimeout(check,150)}).observe(document.documentElement,{subtree:!0,childList:!0})})();
