/* Vocābula engine: the word lists, the two schedulers (New: FSRS-6, Legacy: the first version) and the card picker.
   Runs in the browser and in Node (for tests), so it touches no page elements.

   Two schedulers, chosen on the home page. Every rating updates both, so switching loses nothing.
   New: FSRS-6 (Free Spaced Repetition Scheduler) through ts-fsrs, unmodified, the scheduler the Storm research picked:
   the best open scheduler at predicting recall on the largest open benchmark.
   Legacy: the first version's confidence-based repetition (see below).

   New shows whatever FSRS-6 says is due, earliest first, and a new word whenever nothing is due. It adds no rules
   of its own on top of ts-fsrs. */
var SETS = [
 {id:"1d", quiz:1, side:"door", cards:[
  ["annus -ī m.","year"],
  ["at, ast","but, however"],
  ["candidus -a -um","white, fair"],
  ["certāre, certāvisse, certātum","to decide by contest; fight, compete, vie"],
  ["dubius -a -um","doubtful"],
  ["sine dubiō","without a doubt, certainly"],
  ["dubitāre, dubitāvisse, dubitātum","hesitate, doubt"],
  ["lacrima, -ae, f.","tear (drop)"],
  ["āra -ae f.","altar"],
  ["haud","not at all, by no means"],
  ["lūna, -ae, f.","moon, night, month"],
  ["ferē","almost"],
  ["turba -ae f.","crowd, uproar"],
  ["turbāre, turbāvisse, turbātum","disturb, confuse"],
  ["vetāre, vetuisse, vetītum","to forbid"]]},
 {id:"1w", quiz:1, side:"window", cards:[
  ["atque / ac","and also, and"],
  ["campus, -ī, m.","plain, field, space"],
  ["statim","immediately"],
  ["fēmina, -ae, f.","female, woman"],
  ["ferrum -ī n.","iron, iron weapon (sword)"],
  ["forum -ī n.","market-place, forum"],
  ["membrum -ī n.","limb, member of the body"],
  ["nunc","now"],
  ["oppidum -ī n.","town"],
  ["saevus -a -um","fierce, raging, wrathful, savage"],
  ["stella -ae f.","star"],
  ["subitō","suddenly, unexpectedly"],
  ["tēlum -ī n.","missile, weapon, spear"],
  ["temptāre, temptāvisse, temptātum","try, test"],
  ["vīnum -ī n.","vine, wine"]]},
 {id:"2d", quiz:2, side:"door", cards:[
  ["cibus, -ī, m.","food"],
  ["manēre, mānsisse, mānsum","to remain, stay"],
  ["tenēre, tenuisse, tentum","to hold, restrain"],
  ["continēre, continuisse, contentum","contain, restrain"],
  ["pertinēre, pertinuisse","to reach, extend; to pertain to"],
  ["retinēre, retinuisse, retentum","to hold back; to keep, retain"],
  ["sustinēre, sustinuisse, sustentum","hold up, sustain"],
  ["docēre, docuisse, doctum","to teach, train"],
  ["doctus, -a, -um","learned, educated (e.g. a learned scholar)","Literally: taught"],
  ["doctrīna, -ae, f.","teaching"],
  ["peccāre, peccāvisse, peccātum","commit a wrong, injure"],
  ["tum or tunc","then"],
  ["vērē","truly"],
  ["vērō","in fact, certainly, without doubt"],
  ["vērus -a -um","true"]]},
 {id:"2w", quiz:2, side:"window", cards:[
  ["clipeus, -ī, m.","shield"],
  ["altus, -a, -um","high, deep, great, ancient"],
  ["bonus, -a, -um","good, noble, loyal, useful"],
  ["bene","well (adverb, as in \u201Cthey sing well\u201D)"],
  ["benignus, -a, -um","kind, abundant"],
  ["beneficium, -ī, n.","favor, benefit","From bene + facere"],
  ["iuvāre, iūvisse, iūtum","to help, please"],
  ["argentum, -ī, n.","silver, money","Literally: glittering; bright thing"],
  ["argentārius, -ī, m.","money lender, banker"],
  ["habēre, habuisse, habitum","to have, hold, possess"],
  ["adhibēre, adhibuisse, adhibitum","to have at hand; to apply"],
  ["habēna, -ae, f.","rein, thong","Used to hold on to a horse"],
  ["habitāre, habitāvisse, habitātum","to inhabit, to live, dwell","Literally: to hold continually"],
  ["plaustrum, -ī, n.","wagon, cart"],
  ["dēbēre, dēbuisse, dēbitum","to owe, ought, be bound"]]},
 {id:"3d", quiz:3, side:"door", cards:[
  ["per (+acc.)","through"],
  ["dō, dare, dedī, datum","to give"],
  ["dōnāre, dōnāvisse, dōnātum","to present with a gift"],
  ["dōnum -ī n.","gift, present"],
  ["ēdō, ēdere, ēdidī, ēditum","to put forth, state, explain"],
  ["reddō, -dere, -didī, -ditum","to return, give back"],
  ["citus, -a, -um","swift"],
  ["proelium, -ī, n.","battle"],
  ["fuga -ae f.","flight, route"],
  ["fugere (-iō), fūgisse, fugitum","to flee, escape"],
  ["fugāre, fugāvisse, fugātum","put to flight"],
  ["quattuor","four"],
  ["quīnque","five"],
  ["sex","six"],
  ["septem","seven"]]},
 {id:"3w", quiz:3, side:"window", cards:[
  ["properāre, properāvisse, properātum","to hasten, complete"],
  ["iacere (-iō), iēcisse, iactum","to throw, hurl"],
  ["iacēre, iacuisse, iacitum","to lie down, recline; be sick","Literally: to be thrown down"],
  ["humus -ī f.","ground","humī: on the ground"],
  ["cēdere (-ō), cessisse, cessum","to go, move; yield"],
  ["accēdere (-ō), accessisse, accessum","to approach"],
  ["concēdere (-ō), concessisse, concessum","to yield, withdraw"],
  ["discēdere (-ō), discessisse, discessum","go away, depart"],
  ["prōcēdere (-ō), prōcessisse, prōcessum","go forth, advance"],
  ["recēdere (-ō), recessisse, recessum","step back, recoil, recede, withdraw"],
  ["solēre, soluisse, solitum","to be accustomed"],
  ["putāre, putāvisse, putātum","to think, suppose"],
  ["octō","eight"],
  ["novem","nine"],
  ["decem","ten"]]},
 {id:"4d", quiz:4, side:"door", cards:[
  ["capere (-iō), cēpisse, captus","to take, capture, seize"],
  ["accipere (-iō), accēpisse, acceptus","to receive"],
  ["excipere (-iō), excēpisse, exceptus","to take out"],
  ["incipere (-iō), incēpisse, inceptus","to begin"],
  ["praecipere (-iō), praecēpisse, praeceptus","to anticipate, advise, warn","Literally: to take before"],
  ["recipere (-iō), recēpisse, receptus","to take back, receive"],
  ["sē recipere","to betake oneself, go"],
  ["suscipere (-iō), suscēpisse, susceptus","to take up; to undertake"],
  ["praeceptum -ī n.","rule, precept; command"],
  ["unda, -ae, f.","wave, water"],
  ["ūndecim","eleven"],
  ["duodecim","twelve"],
  ["trēdecim","thirteen"],
  ["quattuordecim","fourteen"],
  ["quīndecim","fifteen"]]},
 {id:"4w", quiz:4, side:"window", cards:[
  ["cavēre, cāvisse, cautus","to be on guard, beware"],
  ["etiam","also; still; even (meaning depending on context)"],
  ["hōra, -ae, f.","hour, time, season, clock"],
  ["iubēre, iussisse, iussus","to command"],
  ["moenia, -ōrum, n.","walls, fortification, castle"],
  ["mūnīre, mūnīvisse, mūnītus","to fortify; provide with defensive works"],
  ["pontus -ī m.","the open sea, the deep"],
  ["scīre, scīvisse or sciisse, scītus","to know"],
  ["scientia, -ae, f.","knowledge"],
  ["nescīre, nescīvisse, nescītum","not to know, be ignorant"],
  ["sēdecim","sixteen"],
  ["septendecim","seventeen"],
  ["duodēvīgintī","eighteen","Literally: two from twenty"],
  ["ūndēvīgintī","nineteen","Literally: one from twenty"],
  ["vīgintī","twenty"]]}
];
var ALL = [];
SETS.forEach(function(s){ s.cards = s.cards.map(function(c,i){
  var o={id:s.id+"-"+i,la:c[0],en:c[1],note:c[2]||"",set:s}; ALL.push(o); return o; }); });

/* ---------- "New" scheduler: FSRS-6 through ts-fsrs, unmodified ----------
   ts-fsrs (vendor/ts-fsrs-5.4.2.umd.js, MIT, open-spaced-repetition) is the maintained implementation of FSRS-6.
   It is used exactly as shipped: fsrs() with its default settings (default FSRS-6 weights, 90% desired retention,
   learning steps 1 min and 10 min, relearning step 10 min, short-term scheduling on, no fuzz, 100-year maximum),
   and every rating goes through its next(). Each card stores the ts-fsrs card it returns. */
var TS=(typeof FSRS!=="undefined")?FSRS:require("./vendor/ts-fsrs-5.4.2.umd.js");
var SC=(typeof SCHED!=="undefined")?SCHED:require("./schedulers.js");
var FSRS6=TS.fsrs();
var W=TS.default_w, DAY=864e5;
/* The only bridge Vocābula adds: its 1-5 buttons map onto FSRS's four grades.
   1 "not at all" and 2 "barely" = Again; 3 = Hard; 4 = Good; 5 = Easy. */
var GRADE=[0,1,1,2,3,4];
function toTs(c){ // a saved record as a ts-fsrs card; records saved by the old FSRS-5 version become Review cards
  if(c.st!==undefined) return {due:new Date(c.due),stability:c.s,difficulty:c.d,elapsed_days:c.el||0,scheduled_days:c.sd||0,
    reps:c.n,lapses:c.l||0,learning_steps:c.ls||0,state:c.st,last_review:c.t?new Date(c.t):undefined};
  var sd=Math.max(1,Math.round(c.s));
  return {due:new Date(c.t+sd*DAY),stability:c.s,difficulty:c.d,elapsed_days:0,scheduled_days:sd,reps:c.n,lapses:c.l||0,
    learning_steps:0,state:TS.State.Review,last_review:new Date(c.t)};
}
function review(c,rating,now){
  var card=c?toTs(c):TS.createEmptyCard(new Date(now));
  var k=FSRS6.next(card,new Date(now),GRADE[rating]).card;
  return {s:k.stability,d:k.difficulty,due:k.due.getTime(),el:k.elapsed_days,sd:k.scheduled_days,n:k.reps,l:k.lapses,
    ls:k.learning_steps,st:k.state,t:now,r:rating};
}
function dueAt(c){ return c.st!==undefined ? c.due : c.t+Math.max(1,Math.round(c.s))*DAY; }
var isDue=function(c,now){ return !!c && dueAt(c)<=now; };
function recall(c,now){ return c ? FSRS6.get_retrievability(toTs(c),new Date(now),false) : 0; }

/* ---------- "Legacy" scheduler: Vocābula's first version ----------
   Brainscape-style confidence-based repetition, counted in cards answered. After a rating a card is hidden for about
   GAP[rating] cards (a 1 returns after about 3 cards, a 5 after about 50), and repeated 4s and 5s stretch the gap.
   Weak cards that are due come first, new and due cards alternate, and a new card comes at least every fifth card. */
var GAP=[0,3,6,12,25,50];
function lgRec(lg,cards,id){ // a card first seen with the new scheduler counts as seen and due now
  if(!lg.cards[id]&&cards[id]) lg.cards[id]={n:cards[id].n,r:cards[id].r,streak:0,due:lg.step,t:cards[id].t};
  return lg.cards[id];
}
function lgSchedule(lg,cards,id,r,now){
  lg.step++;
  var c=lgRec(lg,cards,id)||{n:0,streak:0};
  c.n++; c.r=r; c.t=now; c.streak = r>=4 ? (c.streak||0)+1 : 0;
  var gap=GAP[r]*(r>=4?Math.pow(1.6,c.streak-1):1)*(0.85+Math.random()*0.3);
  c.due=lg.step+Math.max(2,Math.min(400,Math.round(gap)));
  lg.cards[id]=c;
}
function rnd(a){ return a[Math.floor(Math.random()*a.length)]; }
function mostOverdue(a,lg){
  var best=null;
  a.forEach(function(c){ var d=lg.cards[c.id]; var k=d.due+d.r*0.01+Math.random()*0.005; if(!best||k<best.k) best={c:c,k:k}; });
  return best.c;
}
function pickLegacy(sess,cards,lg){
  var pool=sess.pool, cand=pool.length>1?pool.filter(function(c){return c.id!==sess.last;}):pool;
  cand.forEach(function(c){lgRec(lg,cards,c.id);});
  var fresh=cand.filter(function(c){return !lg.cards[c.id];});
  var seen=cand.filter(function(c){return lg.cards[c.id];});
  var due=seen.filter(function(c){return lg.cards[c.id].due<=lg.step;});
  var weak=due.filter(function(c){return lg.cards[c.id].r<=2;});
  var card,isNew=false;
  if(fresh.length&&sess.sinceNew>=4){ card=rnd(fresh); isNew=true; }      // never let weak cards block new ones
  else if(weak.length) card=mostOverdue(weak,lg);                          // weak and due comes first
  else if(fresh.length&&due.length){                                      // alternate new and due
    if(sess.lastWasNew) card=mostOverdue(due,lg); else { card=rnd(fresh); isNew=true; } }
  else if(fresh.length){ card=rnd(fresh); isNew=true; }
  else if(due.length) card=mostOverdue(due,lg);
  else card=mostOverdue(seen,lg);                                          // nothing due: soonest due, lowest confidence
  return {card:card,kind:isNew?"new":"due"};
}

/* ---------- the review log (used by the added schedulers) ----------
   Per direction, per card: "t,r,d;t,r,d" with t = seconds since 1970 in base 36, r = the 1-5 rating,
   d = milliseconds taken in base 36. */
function logGet(ext,cards,id){
  var s=ext.log[id];
  if(!s){ var c=cards[id]; return c?[{t:c.t,r:c.r,d:8000}]:[]; } // seen before the log existed: one review at the last rating
  return s.split(";").map(function(e){ var p=e.split(","); return {t:parseInt(p[0],36)*1000,r:+p[1],d:parseInt(p[2],36)}; });
}
function logAdd(ext,cards,id,rating,now,dur){
  var prev=ext.log[id]||(cards[id]?Math.floor(cards[id].t/1000).toString(36)+","+cards[id].r+","+(8000).toString(36):"");
  var e=Math.floor(now/1000).toString(36)+","+rating+","+Math.round(Math.min(Math.max(dur||0,0),6e5)).toString(36);
  ext.log[id]=prev?prev+";"+e:e;
}
var dueCache={};
function dueOf(method,ext,cards,id){
  var raw=ext.log[id]||"", key=method+"|"+id+"|"+raw+"|"+(cards[id]?cards[id].t:"");
  if(!(key in dueCache)){ var r=SC.METHODS[method].sched(logGet(ext,cards,id),id); dueCache[key]=r?r.due:null; }
  return dueCache[key];
}
/* Queue for the added schedulers (they set due times, not an order): whatever is due, earliest first; a new word
   whenever nothing is due; otherwise the card due soonest, shown a little early. The Leitner box has its own. */
function pickAdded(sess,cards,now,ext){
  var pool=sess.pool, cand=pool.length>1?pool.filter(function(c){return c.id!==sess.last;}):pool;
  var seenFn=function(c){return !!(cards[c.id]||ext.log[c.id]);};
  if(SC.METHODS[sess.method].box) return SC.lbPick(ext.lb,cand,seenFn);
  var seen=cand.filter(seenFn), due={};
  seen.forEach(function(c){ due[c.id]=dueOf(sess.method,ext,cards,c.id); });
  var byDue=function(a,b){return due[a.id]-due[b.id];};
  var ready=seen.filter(function(c){return due[c.id]<=now;}).sort(byDue);
  if(ready.length) return {card:ready[0],kind:"due"};
  var fresh=cand.filter(function(c){return !seenFn(c);});
  if(fresh.length) return {card:fresh[Math.floor(Math.random()*fresh.length)],kind:"new"};
  if(seen.length) return {card:seen.sort(byDue)[0],kind:"early"};
  return {card:pool[0],kind:"new"};
}

/* ---------- the session ---------- */
function newSession(pool,target,method){
  if(method==="quiz"){ // Quiz mode: every word once, in one random order, no formula
    var order=pool.slice(); for(var i=order.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)), t=order[i]; order[i]=order[j]; order[j]=t; }
    return {pool:pool,order:order,target:pool.length,method:"quiz",done:0,shown:{},last:null,newSeen:0,
      ratings:[0,0,0,0,0,0],latest:{},sinceNew:0,lastWasNew:false};
  }
  return {pool:pool,target:target||0,method:(method==="legacy"||SC.METHODS[method])?method:"new",done:0,shown:{},last:null,newSeen:0,
    ratings:[0,0,0,0,0,0],latest:{},sinceNew:0,lastWasNew:false};
}
function pick(sess,cards,now,lg,ext){
  if(sess.method==="quiz"){ var q=sess.order[Math.min(sess.done,sess.order.length-1)];
    return {card:q,kind:(cards[q.id]||(ext&&ext.log[q.id]))?"due":"new"}; }
  if(sess.method==="legacy") return pickLegacy(sess,cards,lg);
  if(SC.METHODS[sess.method]) return pickAdded(sess,cards,now,ext);
  var pool=sess.pool, cand=pool.length>1?pool.filter(function(c){return c.id!==sess.last;}):pool;
  var byDue=function(a,b){return dueAt(cards[a.id])-dueAt(cards[b.id]);};
  var seen=cand.filter(function(c){return cards[c.id];});
  // 1. whatever FSRS-6 says is due now, earliest first (this includes its 1- and 10-minute learning steps)
  var due=seen.filter(function(c){return isDue(cards[c.id],now);}).sort(byDue);
  if(due.length) return {card:due[0],kind:"due"};
  // 2. nothing is due: a new word
  var fresh=cand.filter(function(c){return !cards[c.id];});
  if(fresh.length) return {card:fresh[Math.floor(Math.random()*fresh.length)],kind:"new"};
  // 3. no new words left: the card FSRS-6 will want next, shown a little early
  if(seen.length) return {card:seen.sort(byDue)[0],kind:"early"};
  return {card:pool[0],kind:cards[pool[0].id]?"early":"new"};
}
/* Record a rating in the session and return the card's new memory record. */
function rate(sess,cards,card,rating,now,kind,lg,ext,dur){
  if(lg) lgSchedule(lg,cards,card.id,rating,now); // legacy record first: it reads the card's state before this rating
  if(ext){ logAdd(ext,cards,card.id,rating,now,dur); SC.lbUpdate(ext.lb,card.id,rating,now); } // log before the FSRS-6 record changes
  var rec=review(cards[card.id],rating,now); cards[card.id]=rec;
  sess.done++; sess.ratings[rating]++; sess.latest[card.id]=rating; sess.shown[card.id]=1; sess.last=card.id;
  if(kind==="new"){ sess.newSeen++; sess.sinceNew=0; sess.lastWasNew=true; } else { sess.sinceNew++; sess.lastWasNew=false; }
  return rec;
}
function missedIn(sess){ return sess.pool.filter(function(c){ return (c.id in sess.latest)&&sess.latest[c.id]<5; }); }
function seenCount(sess){ return sess.pool.filter(function(c){return sess.shown[c.id];}).length; }

/* ---------- saving and merging progress ---------- */
function blankProgress(){ return {v:1,el:{},le:{},reset:{el:0,le:0},lg:{el:{step:0,cards:{}},le:{step:0,cards:{}}},
  log:{el:{},le:{}},lb:{el:{cards:{}},le:{cards:{}}}}; }
/* Merge two progress records card by card: the later review wins; a reset wipes everything reviewed before it. */
function mergeProgress(a,b){
  a=a||blankProgress(); b=b||blankProgress();
  var out={v:1,el:{},le:{},reset:{},lg:{},log:{},lb:{}};
  ["el","le"].forEach(function(dir){
    var rs=Math.max((a.reset||{})[dir]||0,(b.reset||{})[dir]||0); out.reset[dir]=rs;
    [a[dir]||{},b[dir]||{}].forEach(function(m){ Object.keys(m).forEach(function(id){
      var c=m[id]; if(!c||c.t<rs) return; if(!out[dir][id]||c.t>out[dir][id].t) out[dir][id]=c; }); });
    var la=(a.lg||{})[dir]||{}, lb=(b.lg||{})[dir]||{}, lo={step:Math.max(la.step||0,lb.step||0),cards:{}};
    [la.cards||{},lb.cards||{}].forEach(function(m){ Object.keys(m).forEach(function(id){
      var c=m[id]; if(!c||(c.t||0)<rs) return; if(!lo.cards[id]||(c.t||0)>(lo.cards[id].t||0)) lo.cards[id]=c; }); });
    out.lg[dir]=lo;
    var gl={};                                   // review logs: union of both sides, by time
    [((a.log||{})[dir])||{},((b.log||{})[dir])||{}].forEach(function(m){ Object.keys(m).forEach(function(id){
      m[id].split(";").forEach(function(e){ if(parseInt(e,36)*1000<rs) return; (gl[id]=gl[id]||{})[e.split(",")[0]]=e; }); }); });
    out.log[dir]={}; Object.keys(gl).forEach(function(id){ var ks=Object.keys(gl[id]).sort(function(x,y){return parseInt(x,36)-parseInt(y,36);});
      out.log[dir][id]=ks.map(function(k){return gl[id][k];}).join(";"); });
    var ba=((a.lb||{})[dir]||{}).cards||{}, bb=((b.lb||{})[dir]||{}).cards||{}, bo={cards:{}};
    [ba,bb].forEach(function(m){ Object.keys(m).forEach(function(id){ var c=m[id]; if(!c||c.at<rs) return;
      if(!bo.cards[id]||c.at>bo.cards[id].at) bo.cards[id]=c; }); });
    out.lb[dir]=bo;
  });
  return out;
}

/* ---------- mastery for any method, over a list of cards ----------
   Default (FSRS-6) uses ts-fsrs's predicted recall now; Legacy uses the latest 1-5 rating, as it always has;
   the rest come from schedulers.js. Returns the method's categories with counts, plus the percent. */
var LEGACY_MASTERY={cats:[["1","c1"],["2","c2"],["3","c3"],["4","c4"],["5","c5"]],
  how:"Mastery is the average of each word’s latest rating out of 5. Words not yet seen count as 0%."};
var mCache={};
var QUIZ_MASTERY={cats:[["Missed (rated 1–4)","c1"],["Right (rated 5)","c5"]],
  how:"Mastery is your score on each word’s latest attempt: a word counts as right only if you rated it 5. Words not yet seen count as 0%."};
function masteryInfo(method){
  if(method==="quiz") return QUIZ_MASTERY;
  if(method==="legacy") return LEGACY_MASTERY;
  if(method==="new") return SC.MASTERY.recall;
  return SC.MASTERY[SC.masteryKind(method)];
}
function cardMastery(method,cards,ext,id,now){
  var c=cards[id]; if(!c&&!ext.log[id]) return null;
  if(method==="legacy") return {cat:c?c.r-1:0,score:c?c.r/5:0};
  if(method==="quiz"){ var lg2=logGet(ext,cards,id), lr=lg2.length?lg2[lg2.length-1].r:(c?c.r:1); return {cat:lr===5?1:0,score:lr===5?1:0}; }
  if(method==="new"){ var r=recall(c,now); return {cat:SC.recallCat(r),score:r}; }
  var key=method+"|"+id+"|"+(ext.log[id]||"")+"|"+(c?c.t:"")+"|"+Math.floor(now/6e4);
  if(!(key in mCache)) mCache[key]=SC.masteryOf(method,logGet(ext,cards,id),id,now);
  return mCache[key];
}
function mastery(method,cards,ext,list,now){
  var info=masteryInfo(method), counts=info.cats.map(function(){return 0;}), unseen=0, total=0;
  list.forEach(function(card){ var m=cardMastery(method,cards,ext,card.id,now);
    if(!m){ unseen++; return; } counts[m.cat]++; total+=m.score; });
  return {cats:info.cats.map(function(c,i){return {label:c[0],color:c[1],n:counts[i]};}),unseen:unseen,
    pct:list.length?Math.round(100*total/list.length):0,how:info.how};
}

var VOCAB_ENGINE={missedIn:missedIn,mastery:mastery,masteryInfo:masteryInfo,SETS:SETS,ALL:ALL,W:W,GAP:GAP,pickLegacy:pickLegacy,SC:SC,logGet:logGet,dueOf:dueOf,GRADE:GRADE,review:review,recall:recall,isDue:isDue,
  newSession:newSession,pick:pick,rate:rate,seenCount:seenCount,blankProgress:blankProgress,mergeProgress:mergeProgress,DAY:DAY};
if(typeof module!=="undefined") module.exports=VOCAB_ENGINE; else window.E=VOCAB_ENGINE;
