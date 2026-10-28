/* Vocābula engine: the word lists, the two schedulers (New: FSRS-6, Legacy: the first version) and the card picker.
   Runs in the browser and in Node (for tests), so it touches no page elements.

   Two schedulers, chosen on the home page. Every rating updates both, so switching loses nothing.
   New: FSRS-6 (Free Spaced Repetition Scheduler) through ts-fsrs, the scheduler the Storm research picked: the best
   open scheduler at predicting recall on the largest open benchmark. Each card keeps a stability S (days until
   recall drops to 90%), a difficulty D (1 to 10), the time of the last review and the last 1-5 rating.
   Legacy: the first version's confidence-based repetition (see below).

   Session rules for New (see the "Vocābula: Card scheduling research" doc):
   1. Cards rated below 5 stay in the cycle and come back after a few other cards (like Anki's learning steps,
      counted in cards because each card takes seconds).
   2. A new word comes in only once every card in the cycle has been rated 5.
   3. Cards due for review come before new words; when nothing is due, words not yet shown this session come
      before repeats, weakest first, so the whole selection gets cycled. */
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

/* ---------- "New" scheduler: FSRS-6 through ts-fsrs ----------
   ts-fsrs (vendor/ts-fsrs-5.4.2.umd.js, MIT, open-spaced-repetition) is the maintained implementation, used here
   instead of hand-ported formulas. Default FSRS-6 weights, 90% desired retention. Elapsed time is passed in whole
   days, as Anki does, so reviews on the same day use FSRS-6's same-day formula. */
var TS=(typeof FSRS!=="undefined")?FSRS:require("./vendor/ts-fsrs-5.4.2.umd.js");
var FSRS6=TS.fsrs({request_retention:0.9});
var W=TS.default_w, DAY=864e5;
/* 1 "not at all" and 2 "barely" count as forgotten (Again); 3 Hard; 4 Good; 5 Easy */
var GRADE=[0,1,1,2,3,4];
function retr(days,S){ return TS.forgetting_curve(W,Math.max(0,days),S); }
function review(c,rating,now){
  var G=GRADE[rating];
  var st=c?FSRS6.next_state({stability:c.s,difficulty:c.d},Math.floor(Math.max(0,now-c.t)/DAY),G):FSRS6.next_state(null,0,G);
  return {s:+st.stability.toFixed(4), d:+st.difficulty.toFixed(4), t:now, r:rating, n:(c?c.n:0)+1, l:(c?c.l:0)+(G===1?1:0)};
}
function recall(c,now){ return c ? retr((now-c.t)/DAY,c.s) : 0; }
var isDue=function(c,now){ return !!c && (now-c.t)/DAY >= c.s; }; // recall has fallen to 90% or below

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

/* ---------- the session ---------- */
var STEP=[0,3,4,6,8]; // cards until a card rated 1-4 comes back
function newSession(pool,target,method){
  return {pool:pool,target:target||0,method:method==="legacy"?"legacy":"new",done:0,learn:{},shown:{},last:null,newSeen:0,
    ratings:[0,0,0,0,0,0],latest:{},sinceNew:0,lastWasNew:false};
}
function cycleSize(sess){ return Object.keys(sess.learn).length; }
function pick(sess,cards,now,lg){
  if(sess.method==="legacy") return pickLegacy(sess,cards,lg);
  var pool=sess.pool, cand=pool.length>1?pool.filter(function(c){return c.id!==sess.last;}):pool;
  var inLearn=function(c){return c.id in sess.learn;};
  var learn=cand.filter(inLearn);
  var byAt=function(a,b){return sess.learn[a.id]-sess.learn[b.id];};
  var weakest=function(list){ // not shown this session first, then lowest recall now, then lowest last rating
    return list.slice().sort(function(a,b){
      var sa=sess.shown[a.id]?1:0, sb=sess.shown[b.id]?1:0; if(sa!==sb) return sa-sb;
      var ra=recall(cards[a.id],now), rb=recall(cards[b.id],now); if(Math.abs(ra-rb)>1e-9) return ra-rb;
      return cards[a.id].r-cards[b.id].r || Math.random()-.5;
    })[0];
  };
  // 1. a card in the cycle whose turn has come
  var ready=learn.filter(function(c){return sess.learn[c.id]<=sess.done;}).sort(byAt);
  if(ready.length) return {card:ready[0],kind:"cycle"};
  // 2. cards due for review (from earlier days)
  var seen=cand.filter(function(c){return cards[c.id]&&!inLearn(c);});
  var due=seen.filter(function(c){return isDue(cards[c.id],now);});
  if(due.length) return {card:weakest(due),kind:"due"};
  // 3. a new word, only when every card in the cycle has been rated 5
  if(!cycleSize(sess)){
    var fresh=cand.filter(function(c){return !cards[c.id];});
    if(fresh.length) return {card:fresh[Math.floor(Math.random()*fresh.length)],kind:"new"};
  }
  // 4. the cycle card whose turn comes soonest
  if(learn.length) return {card:learn.sort(byAt)[0],kind:"cycle"};
  // 5. nothing due: words not yet shown this session, weakest first
  if(seen.length) return {card:weakest(seen),kind:"extra"};
  // 6. only the card just shown is left, so it comes again
  var lastCard=pool.filter(function(c){return c.id===sess.last;})[0];
  if(lastCard) return {card:lastCard,kind:(lastCard.id in sess.learn)?"cycle":"extra"};
  return {card:pool[0],kind:"new"};
}
/* Record a rating in the session and return the card's new memory record. */
function rate(sess,cards,card,rating,now,kind,lg){
  if(lg) lgSchedule(lg,cards,card.id,rating,now); // legacy record first: it reads the card's state before this rating
  var rec=review(cards[card.id],rating,now); cards[card.id]=rec;
  sess.done++; sess.ratings[rating]++; sess.latest[card.id]=rating; sess.shown[card.id]=1; sess.last=card.id;
  if(kind==="new"){ sess.newSeen++; sess.sinceNew=0; sess.lastWasNew=true; } else { sess.sinceNew++; sess.lastWasNew=false; }
  if(sess.method==="new"){ if(rating<5) sess.learn[card.id]=sess.done+STEP[rating]; else delete sess.learn[card.id]; }
  return rec;
}
function seenCount(sess){ return sess.pool.filter(function(c){return sess.shown[c.id];}).length; }

/* ---------- saving and merging progress ---------- */
function blankProgress(){ return {v:1,el:{},le:{},reset:{el:0,le:0},lg:{el:{step:0,cards:{}},le:{step:0,cards:{}}}}; }
/* Merge two progress records card by card: the later review wins; a reset wipes everything reviewed before it. */
function mergeProgress(a,b){
  a=a||blankProgress(); b=b||blankProgress();
  var out={v:1,el:{},le:{},reset:{},lg:{}};
  ["el","le"].forEach(function(dir){
    var rs=Math.max((a.reset||{})[dir]||0,(b.reset||{})[dir]||0); out.reset[dir]=rs;
    [a[dir]||{},b[dir]||{}].forEach(function(m){ Object.keys(m).forEach(function(id){
      var c=m[id]; if(!c||c.t<rs) return; if(!out[dir][id]||c.t>out[dir][id].t) out[dir][id]=c; }); });
    var la=(a.lg||{})[dir]||{}, lb=(b.lg||{})[dir]||{}, lo={step:Math.max(la.step||0,lb.step||0),cards:{}};
    [la.cards||{},lb.cards||{}].forEach(function(m){ Object.keys(m).forEach(function(id){
      var c=m[id]; if(!c||(c.t||0)<rs) return; if(!lo.cards[id]||(c.t||0)>(lo.cards[id].t||0)) lo.cards[id]=c; }); });
    out.lg[dir]=lo;
  });
  return out;
}

var VOCAB_ENGINE={SETS:SETS,ALL:ALL,W:W,GAP:GAP,pickLegacy:pickLegacy,GRADE:GRADE,retr:retr,review:review,recall:recall,isDue:isDue,
  newSession:newSession,pick:pick,rate:rate,seenCount:seenCount,cycleSize:cycleSize,blankProgress:blankProgress,mergeProgress:mergeProgress,DAY:DAY};
if(typeof module!=="undefined") module.exports=VOCAB_ENGINE; else window.E=VOCAB_ENGINE;
