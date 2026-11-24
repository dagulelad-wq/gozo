/* Demo data for "show a friend" mode: a made-up family, generated on the device, never derived from real data.
   Loaded only into memory; the storage layer does not open the real database while demo mode is on. */
(function(){
function rnd(seed){return function(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}}
function pad(n){return String(n).padStart(2,"0")}
window.gozoDemoDocs=function(){
 var r=rnd(20261124),now=new Date(),cy=now.getFullYear(),cm=now.getMonth(),today=now.getDate();
 var R=function(a,b){return Math.round(a+r()*(b-a))},pick=function(a){return a[Math.floor(r()*a.length)]};
 var tx=[],inc=[],n=0;
 function ym(i){var d=new Date(cy,cm-i,1);return d.getFullYear()+"-"+pad(d.getMonth()+1)}
 function add(list,date,merchant,category,amount,card,extra){var o={id:"demo-"+(++n),date:date,merchant:merchant,category:category,card:card||"",type:card==="בנק"||!card?"":"רגילה",amount:Math.round(amount*100)/100,billingDate:date,notes:"",method:card==="בנק"?"חשבון בנק":card?"כרטיס":"חשבון בנק",project:""};for(var k in extra)o[k]=extra[k];list.push(o)}
 var cards=["4410","7782"];
 for(var i=11;i>=0;i--){
  var m=ym(i),last=i===0?today:28,mon=+m.slice(5,7),summer=mon>=6&&mon<=9,winter=mon===12||mon<=2;
  var d=function(day){day=Math.min(day,last);return m+"-"+pad(Math.max(1,day))};
  var ok=function(day){return i>0||day<=today};
  // income
  if(ok(1))add(inc,d(1),"משכורת · חברת אורבן טק","משכורת",R(16800,17400));
  if(ok(10))add(inc,d(10),"משכורת · משרד החינוך","משכורת",R(11900,12600));
  if(ok(20))add(inc,d(20),"קצבת ילדים","קצבת ילדים",304);
  if(mon===4&&ok(15))add(inc,d(15),"החזר מס הכנסה","החזרים",2860);
  // fixed
  if(ok(1))add(tx,d(1),"בנק הדוגמה · משכנתא","דיור",5240,"בנק");
  if(ok(3))add(tx,d(3),"עיריית הדוגמה · ארנונה","דיור",860,"בנק");
  if(ok(5))add(tx,d(5),"גן הדסים","גני ילדים",3100,"בנק");
  if(ok(8))add(tx,d(8),"הלוואה לרכב","הלוואות",940,"בנק");
  if(ok(10))add(tx,d(10),"הראל · ביטוח בריאות","ביטוח",318,cards[0]);
  if(ok(10))add(tx,d(10),"מגדל · ביטוח רכב","ביטוח",246,cards[0]);
  if(ok(12))add(tx,d(12),"מתנ״ס · חוג כדורגל","חוגי ילדים",180,cards[1]);
  if(ok(14))add(tx,d(14),"בזק · אינטרנט","שירותי תקשורת",99,cards[0]);
  if(ok(14))add(tx,d(14),"פרטנר · סלולר","שירותי תקשורת",118,cards[0]);
  if(ok(15))add(tx,d(15),"Netflix","פנאי, בידור וספורט",55,cards[1]);
  if(ok(15))add(tx,d(15),"Spotify","פנאי, בידור וספורט",24,cards[1]);
  if(ok(16))add(tx,d(16),"מכון כושר אקטיב","פנאי, בידור וספורט",199,cards[0]);
  if(mon%2===1&&ok(18))add(tx,d(18),"חברת החשמל","דיור",summer?R(780,980):winter?R(620,760):R(330,450),"בנק");
  if(mon%2===0&&ok(18))add(tx,d(18),"תאגיד המים","דיור",R(170,260),"בנק");
  // variable
  ["שופרסל דיל","רמי לוי","יוחננוף","שופרסל דיל"].forEach(function(s,k){var day=3+k*7;if(ok(day))add(tx,d(day),s,"מזון וצריכה",R(320,780),pick(cards))});
  for(var k=0;k<R(3,6);k++){var day=R(1,28);if(ok(day))add(tx,d(day),pick(["מכולת השכונה","פירות וירקות השוק","מאפיית הכפר"]),"מזון וצריכה",R(40,190),pick(cards))}
  for(var k=0;k<R(4,8);k++){var day=R(1,28);if(ok(day))add(tx,d(day),pick(["ארומה","קפה גרג","פיצה בית","שווארמה הכיכר","סושי בר","גלידה ממן"]),"מסעדות, קפה וברים",R(28,210),pick(cards))}
  for(var k=0;k<3;k++){var day=4+k*9;if(ok(day))add(tx,d(day),pick(["פז","סונול","דלק"]),"תחבורה ורכבים",R(220,390),pick(cards))}
  if(r()<.25){var day=R(5,25);if(ok(day))add(tx,d(day),"מוסך השרון","תחבורה ורכבים",R(650,2300),cards[0])}
  for(var k=0;k<R(1,3);k++){var day=R(1,28);if(ok(day))add(tx,d(day),"סופר-פארם","רפואה ובתי מרקחת",R(45,240),pick(cards))}
  if(r()<.6){var day=R(1,28);if(ok(day))add(tx,d(day),pick(["H&M","זארה","קסטרו","שילב"]),"אופנה",R(140,620),pick(cards))}
  if(r()<.35){var day=R(1,28);if(ok(day))add(tx,d(day),pick(["איקאה","ACE","הום סנטר"]),"עיצוב הבית",R(90,900),pick(cards))}
  if(r()<.4){var day=R(1,28);if(ok(day))add(tx,d(day),pick(["סינמה סיטי","פארק המים","לונה פארק"]),"פנאי, בידור וספורט",R(120,420),pick(cards))}
  if(r()<.3){var day=R(1,28);if(ok(day))add(tx,d(day),"טויס אר אס","צעצועים",R(80,350),pick(cards))}
  if(mon===8&&ok(12)){add(tx,d(12),"אל על · כרטיסי טיסה","טיסות ותיירות",4180,cards[0]);add(tx,d(13),"Booking.com","טיסות ותיירות",2650,cards[0])}
  if(mon===4&&ok(20))add(tx,d(20),"צימר בגליל","טיסות ותיירות",1480,cards[1]);
 }
 var palette=["#3ECF8E","#FF6B5E","#F2C94C","#5B8DEF","#B36BFF","#FF9F43","#2EC4B6","#E76F9F","#8D99AE","#6C5CE7","#00B894","#E17055","#0984E3","#FDCB6E","#636E72"];
 function cats(list){var s=[];list.forEach(function(t){if(s.indexOf(t.category)<0)s.push(t.category)});return s.map(function(c,i){return{name:c,color:palette[i%palette.length]}})}
 var monthsBack=function(k){return ym(k)};
 var cycles=[[5,6500],[4,9200],[3,0],[2,7000],[1,5500]].map(function(p){var y=monthsBack(p[0]);return{ym:y,date:y+"-24",balance:null,cushion:25000,total:p[1],parts:p[1]>0?[{key:"long",label:"לטווח ארוך",amount:p[1],dest:1,destName:"מניות וקרנות סל · אלטשולר"}]:[]}});
 var cashDaily={};for(var k=40;k>=0;k-=3){var dd=new Date(now.getTime()-k*864e5);cashDaily[dd.toISOString().slice(0,10)]=R(28000,52000)}
 var trip=ym(-4),tripId=777001;
 var j={transactions:tx,categories:cats(tx),merchantOverrides:{},noteOverrides:{},fixedOverrides:{},avgExcludedOverrides:{},
  incomeTransactions:inc,incomeCategories:cats(inc),incomeMerchantOverrides:{},incomeNoteOverrides:{},incomeAvgExcludedOverrides:{},
  cardNames:{"4410":"ויזה","7782":"מקס"},importLog:[],budgets:{"מזון וצריכה":3600,"מסעדות, קפה וברים":900,"גני ילדים":3100,"דיור":7600,"ביטוח":600,"תחבורה ורכבים":1600,"פנאי, בידור וספורט":650,"אופנה":600},
  goals:[{id:tripId,name:"✈️ טיול משפחתי",kind:"project",target:15000,saved:4000,due:trip,monthly:2750}],investPlan:0,
  investments:[{id:1,name:"מניות וקרנות סל · אלטשולר",value:184000,monthly:2000},{id:2,name:"קרן השתלמות",type:"hishtalmut",value:142000,monthly:0},{id:3,name:"קרן כספית (קרן חירום)",type:"emergency",value:78000,monthly:0},{id:4,name:"חיסכון לילדים · נועה",type:"kids",value:18000,monthly:0},{id:5,name:"חיסכון לילדים · איתי",type:"kids",value:9000,monthly:0},{id:6,name:"קופת גמל להשקעה",value:52000,monthly:0}],
  recurring:[],portfolio:null,txKinds:{},kindRules:{},pension:null,
  cash:{balance:R(36000,44000),cushion:25000,asOf:new Date(now.getTime()-2*864e5).toISOString().slice(0,10),source:"bank",daily:cashDaily},
  cycles:cycles,cycleDest:{long:1},cardCharges:[],fixedCfg:null,cqPlans:[{id:888001,ym:trip,emoji:"✈️",name:"טיול משפחתי",amount:15000,goalId:tripId}],
  migrations:{mortgage:!0,kidsSplit:!0,cycles2026:!0,mortgage2:!0}};
 var docs={},s=JSON.stringify(j);
 docs["household/expense-dashboard-v1"]={gen:"demo",n:1,savedAt:now.toISOString()};
 docs["household/expense-dashboard-v1~demo~0"]={s:s};
 var plus=function(days){return new Date(now.getTime()+days*864e5).toISOString().slice(0,10)};
 docs["carmod_cars/car1"]={name:"הרכב המשפחתי",model:"Kia Sportage 2020",plate:"12-345-67",costs:{license:1450,service:900,tiresFront:780,tiresRear:780},dates:{license:plus(140),serviceLast:plus(-200),tiresFront:plus(-400),tiresRear:plus(-400)},notes:{service:"טיפול 60,000"}};
 docs["carmod_cars/car2"]={name:"הקטנה",model:"Hyundai i10 2018",plate:"98-765-43",costs:{license:1100,service:650},dates:{license:plus(40),serviceLast:plus(-330)},notes:{}};
 docs["visual_mod/main"]={bed:{base:{t:300000,v:420000},mattress:{t:80000,v:78000},monthly:20000,pillow:{t:25000,v:30000}},example:!1,tree:{deposit:4000,goals:[{d:trip,n:"טיול משפחתי",s:4000,t:15000},{d:"2029-06",n:"רכב חדש",s:12000,t:90000}]},trips:[{d:trip,n:"טיול משפחתי",s:4000,t:15000}]};
 return docs};
})();
