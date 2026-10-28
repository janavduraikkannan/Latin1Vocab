/* Vocābula: the added schedulers. Each one is built from its original source, noted beside it.

   Every rating is kept in a per-card review log (time, 1-5 rating, milliseconds taken). Each scheduler below works
   out a card's next due time by replaying that log, so all of them stay up to date whichever one you study with.
   The Leitner box is the exception: its compartments fill and empty across the whole set of words, so it keeps its
   own record of which compartment each card is in.

   Vocābula's 1-5 buttons ("not at all", "barely", "somewhat", "mostly", "perfectly") map onto each source's grades:
   - pass/fail methods: 1-2 = forgot, 3-5 = remembered;
   - four-button methods (Anki, FSRS, LSTM, GRU): 1-2 = Again, 3 = Hard, 4 = Good, 5 = Easy;
   - SM-2's 0-5 scale: 1 = 0 (blackout), 2 = 2, 3 = 3, 4 = 4, 5 = 5.
   Methods that only predict recall (Ebisu, Duolingo's Leitner and Pimsleur, LSTM, GRU) schedule a card when its
   predicted recall falls to 90%, the same target FSRS uses. */
(function(root){
"use strict";
var isNode=typeof module!=="undefined";
var ebisu=isNode?(function(){ var src=require("fs").readFileSync(require("path").join(__dirname,"vendor/ebisu-2.1.3.min.js"),"utf8");
  return new Function(src+";return ebisu;")(); })():root.ebisu;
var NNW=isNode?require("./vendor/srs-benchmark-weights.js"):root.SRS_BENCHMARK_WEIGHTS;

var MIN=6e4, HOUR=36e5, DAY=864e5, TARGET=0.9;
var PASS=function(r){return r>=3;};
var ANKI=[0,1,1,2,3,4];          // 1-5 -> Again/Hard/Good/Easy
var SM2Q=[0,0,2,3,4,5];          // 1-5 -> SM-2 quality 0-5
/* Calendar days with Anki's default 4 am rollover, in the learner's time zone (used by SM-2 and Anki SM-2). */
function dayNum(ms){ var d=new Date(ms); return Math.floor((ms-d.getTimezoneOffset()*MIN-4*HOUR)/DAY); }
function dayStart(n){ var guess=n*DAY+4*HOUR; return guess+new Date(guess).getTimezoneOffset()*MIN; }
/* Find when a decreasing recall curve reaches TARGET, by bisection on days after the last review. */
function timeTo90(curve,maxDays){
  var lo=0, hi=1; maxDays=maxDays||36500;
  while(curve(hi)>TARGET&&hi<maxDays) hi=Math.min(hi*2,maxDays);
  for(var i=0;i<60;i++){ var mid=(lo+hi)/2; if(curve(mid)>TARGET) lo=mid; else hi=mid; }
  return (lo+hi)/2;
}
function seeded(id,n){ // a repeatable 0-1 number per card and review, so replaying the log gives the same answer
  var h=2166136261; var s=id+"#"+n; for(var i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); }
  return ((h>>>0)%1e6)/1e6;
}

/* ---------- SM-2: Woźniak (1990), "Application of a computer to improve the results obtained in working with
   the SuperMemo method", and his SuperMemo 2 plug-in source code (Repetition procedure).
   Interval after a pass: 1 day, then 6 days, then round(previous interval × E-Factor), using the E-Factor from
   before this repetition. A grade below 3 restarts the intervals. The E-Factor is then updated by
   EF + (0.1 - (5-q)(0.08 + (5-q)·0.02)), never below 1.3. Step 7: at the end of a day's session, items graded
   below 4 are repeated again until they score at least 4. ---------- */
function sm2(log){
  var rep=0, I=0, EF=2.5, day=null, redo=false;
  log.forEach(function(e){
    var q=SM2Q[e.r], d=dayNum(e.t);
    if(redo&&d===day){ if(q>=4) redo=false; return; }   // step 7 drill: no change to the schedule
    if(q>=3){ if(rep===0){I=1;rep=1;} else if(rep===1){I=6;rep=2;} else {I=Math.round(I*EF);rep++;} }
    else { rep=0; I=1; }
    EF=EF+(0.1-(5-q)*(0.08+(5-q)*0.02)); if(EF<1.3) EF=1.3;
    day=d; redo=q<4;
  });
  if(!log.length) return null;
  var last=log[log.length-1].t;
  return {due: redo&&dayNum(last)===day ? last : dayStart(day+I), info:{interval:I,EF:EF,rep:rep}};
}

/* ---------- Anki SM-2: Anki's default scheduler before FSRS, from ankitects/anki rslib/src/scheduler/states
   (learning.rs, review.rs, relearning.rs, steps.rs, fuzz.rs) and the default deck options in deckconfig/mod.rs:
   learning steps 1 and 10 min, relearning step 10 min, graduating interval 1 day, easy interval 4 days,
   starting ease 250%, hard ×1.2, easy bonus ×1.3, new interval after a lapse 0%, minimum 1 day, maximum 36500.
   Anki's review fuzz is included; its load balancer is not, since it depends on the whole collection. ---------- */
var AK={learn:[1,10],relearn:[10],gradGood:1,gradEasy:4,ease:2.5,hard:1.2,easy:1.3,lapse:0,minLapse:1,mult:1,max:36500};
function fuzzDelta(iv){ if(iv<2.5) return 0; var d=1;
  [[2.5,7,0.15],[7,20,0.1],[20,Infinity,0.05]].forEach(function(r){ d+=r[2]*Math.max(0,Math.min(iv,r[1])-r[0]); }); return d; }
function fuzzBounds(iv,mn,mx){ mn=Math.min(mn,mx); iv=Math.min(Math.max(iv,mn),mx); var dl=fuzzDelta(iv);
  var lo=Math.min(Math.max(Math.round(iv-dl),mn),mx), hi=Math.min(Math.max(Math.round(iv+dl),mn),mx);
  if(hi===lo&&hi>2&&hi<mx) hi=lo+1; return [lo,hi]; }
function withFuzz(f,iv,mn,mx){ var b=fuzzBounds(iv,mn,mx); return Math.floor(b[0]+f*(1+b[1]-b[0])); }
function minFuzz(iv,prev,mx){ var r=Math.round(iv), up=fuzzBounds(iv,1,mx)[1]; return r>prev?prev+1:(prev<=up?prev:0); }
function constrain(iv,mn,f,fuzz){ iv*=AK.mult; var lo=Math.min(Math.max(mn,1),AK.max);
  return fuzz?withFuzz(f,iv,lo,AK.max):Math.min(Math.max(Math.round(iv),lo),AK.max); }
var stepSecs=function(steps,i){ return i<steps.length?Math.floor(steps[i]*60):null; };
function stepIdx(steps,rem){ return Math.min(Math.max(steps.length-(rem%1000),0),Math.max(steps.length-1,0)); }
function hardSecs(steps,rem){ var i=stepIdx(steps,rem), cur=stepSecs(steps,i); if(cur===null) return null;
  if(i!==0) return cur; var nx=stepSecs(steps,1);
  var s=nx!==null?Math.floor((cur+nx)/2):Math.min(Math.floor(cur*3/2),cur+86400);
  return s>86400?Math.round(s/86400)*86400:s; }
function goodSecs(steps,rem){ return stepSecs(steps,stepIdx(steps,rem)+1); }
function remGood(steps,rem){ return Math.max(steps.length-(stepIdx(steps,rem)+1),0); }
function ankiSm2(log,id){
  var c={kind:"new"};  // kind: new | learn | review | relearn
  log.forEach(function(e,n){
    var g=ANKI[e.r], today=dayNum(e.t), f=seeded(id,n);
    if(c.kind==="new") c={kind:"learn",rem:AK.learn.length};
    if(c.kind==="learn"){
      if(g===1){ c.rem=AK.learn.length; c.due=e.t+stepSecs(AK.learn,0)*1000; }
      else if(g===2){ c.due=e.t+hardSecs(AK.learn,c.rem)*1000; }
      else if(g===3){ var gs=goodSecs(AK.learn,c.rem);
        if(gs!==null){ c.rem=remGood(AK.learn,c.rem); c.due=e.t+gs*1000; }
        else c={kind:"review",ivl:withFuzz(f,AK.gradGood,1,AK.max),ease:AK.ease,lapses:0,day:today}; }
      else c={kind:"review",ivl:withFuzz(f,AK.gradEasy,1,AK.max),ease:AK.ease,lapses:0,day:today};
    } else if(c.kind==="review"){
      var elapsed=today-c.day, late=elapsed-c.ivl, cur=Math.max(c.ivl,1);
      if(g===1){ var lapseIv=withFuzz(f,Math.max(c.ivl,1)*AK.lapse,Math.min(Math.max(AK.minLapse,1),AK.max),AK.max);
        c={kind:"relearn",rem:AK.relearn.length,due:e.t+stepSecs(AK.relearn,0)*1000,
           review:{ivl:Math.max(Math.round(lapseIv),1),ease:Math.max(c.ease-0.2,1.3),lapses:c.lapses+1}}; }
      else{ var h,gd,ez;
        if(late<0){ var el=elapsed;
          h=constrain(Math.max(el*AK.hard,cur*AK.hard/2),0,f,false);
          gd=constrain(Math.max(el*c.ease,cur),0,f,false);
          ez=constrain(Math.max(el*c.ease,cur)*(AK.easy-(AK.easy-1)/2),0,f,false); }
        else{ var dl=Math.max(late,0);
          h=constrain(cur*AK.hard,AK.hard<=1?0:c.ivl+1,f,true);
          gd=constrain((cur+dl/2)*c.ease,AK.hard<=1?c.ivl+1:h+1,f,true);
          ez=constrain((cur+dl)*c.ease*AK.easy,gd+1,f,true); }
        if(g===2){ c.ivl=h; c.ease=Math.max(c.ease-0.15,1.3); }
        else if(g===3){ c.ivl=gd; } else { c.ivl=ez; c.ease+=0.15; }
        c.day=today; }
    } else if(c.kind==="relearn"){
      if(g===1){ c.rem=AK.relearn.length; c.due=e.t+stepSecs(AK.relearn,0)*1000; }
      else if(g===2){ c.due=e.t+hardSecs(AK.relearn,c.rem)*1000; }
      else if(g===3){ var gs2=goodSecs(AK.relearn,c.rem);
        if(gs2!==null){ c.rem=remGood(AK.relearn,c.rem); c.due=e.t+gs2*1000; }
        else c={kind:"review",ivl:c.review.ivl,ease:c.review.ease,lapses:c.review.lapses,day:today}; }
      else c={kind:"review",ivl:c.review.ivl+1,ease:c.review.ease,lapses:c.review.lapses,day:today};
    }
  });
  if(!log.length) return null;
  return {due:c.kind==="review"?dayStart(c.day+c.ivl):c.due,info:c};
}

/* ---------- Ebisu v2: ebisu.js 2.1.3 by Ahmed Fasih (vendor/ebisu-2.1.3.min.js, public domain).
   Times in hours. A newly learned word gets defaultModel(24), the library's recommended start; each later
   review updates it with a pass/fail quiz result. ---------- */
function ebisuSched(log){
  if(!log.length) return null;
  var m=ebisu.defaultModel(24), last=log[0].t;
  for(var i=1;i<log.length;i++){ var el=Math.max((log[i].t-last)/HOUR,1e-6);
    m=ebisu.updateRecall(m,PASS(log[i].r)?1:0,1,el); last=log[i].t; }
  return {due:last+ebisu.modelToPercentileDecay(m,TARGET)*HOUR,info:{model:m}};
}

/* ---------- FSRS-7: open-spaced-repetition/fsrs-rs, src/model_v7.rs and the 34 default weights in
   src/inference_v7.rs. Two memory traces (slow and fast) and a mixed forgetting curve, with continuous time:
   it is the first FSRS designed to model same-day reviews, so cards are scheduled straight at 90% recall with no
   separate learning steps (fsrs-rs specifies the memory model, not a card scheduler). ---------- */
var W7=[0.1104,2.2395,3.9221,11.7841,6.1686,0.6457,3.6807,1.9795,0.0,1.3826,0.7024,0.5999,
  0.8146,0.6398,1.0,1.3207,0.6707,3.8668,0.4416,0.0934,1.8631,0.6162,1.0869,0.1567,
  0.0801,0.2421,0.9464,0.1433,0.7145,0.0,0.5667,0.3734,0.5333,0.3048];
var S_MIN=0.0001, S_MAX=36500, D_MIN=1, D_MAX=10;
var clamp=function(x,a,b){return Math.min(Math.max(x,a),b);};
function f7Curve(w,t,st){
  t=Math.max(t,0); var s=Math.max(st.s,S_MIN), sf=Math.max(st.sf,S_MIN), d=clamp(st.d,D_MIN,D_MAX);
  var dec1=-clamp(w[23]*Math.pow(sf,w[33]-0.3),0.01,0.95);
  var fac1=Math.exp(Math.min(Math.log(w[25])/dec1,60))-1;
  var r1=Math.pow(1+fac1*(t/sf),dec1);
  var dec2=-clamp(w[24],0.01,0.95), fac2=Math.pow(w[26],1/dec2)-1, dts=Math.exp((d-5)*(w[32]-0.3));
  var r2=Math.pow(1+fac2*dts*(t/s),dec2);
  var w1=w[27]*Math.pow(sf,-w[29]), w2=w[28]*Math.pow(s,w[30])*Math.exp((d-5)*(w[31]-0.5));
  return ((w1*r1+w2*r2)/(w1+w2))*(1-2e-5)+1e-5;
}
function f7CurveDeriv(w,t,st){ // fsrs7_forgetting_curve_and_derivative_scalar
  t=Math.max(t,0); var s=Math.max(st.s,S_MIN), sf=Math.max(st.sf,S_MIN), d=clamp(st.d,D_MIN,D_MAX);
  var dec1=-clamp(w[23]*Math.pow(sf,w[33]-0.3),0.01,0.95), fac1=Math.exp(Math.min(Math.log(w[25])/dec1,60))-1;
  var b1=1+fac1*(t/sf), r1=Math.pow(b1,dec1), dr1=dec1*Math.pow(b1,dec1-1)*fac1/sf;
  var dec2=-clamp(w[24],0.01,0.95), fac2=Math.pow(w[26],1/dec2)-1, dts=Math.exp((d-5)*(w[32]-0.3));
  var b2=1+fac2*dts*(t/s), r2=Math.pow(b2,dec2), dr2=dec2*Math.pow(b2,dec2-1)*fac2*dts/s;
  var w1=w[27]*Math.pow(sf,-w[29]), w2=w[28]*Math.pow(s,w[30])*Math.exp((d-5)*(w[31]-0.5)), ws=Math.max(w1+w2,1e-9);
  return [((w1*r1+w2*r2)/ws)*(1-2e-5)+1e-5, ((w1*dr1+w2*dr2)/ws)*(1-2e-5)];
}
function f7Bisect(w,st,dr){ var lo=0, hi=Math.max(st.s,st.sf,1);
  while(f7Curve(w,hi,st)>dr&&hi<S_MAX) hi=Math.min(hi*2,S_MAX);
  for(var i=0;i<50;i++){ var mid=(lo+hi)/2; if(f7Curve(w,mid,st)>dr) lo=mid; else hi=mid; }
  return clamp((lo+hi)/2,0,S_MAX); }
function f7Fast(w,t,sf){ t=Math.max(t,0); sf=clamp(sf,S_MIN,S_MAX);
  var dec1=-clamp(w[23]*Math.pow(sf,w[33]-0.3),0.01,0.95), fac1=Math.exp(Math.min(Math.log(w[25])/dec1,60))-1;
  return Math.pow(1+fac1*(t/sf),dec1); }
function f7InitD(w,g){ return w[4]-Math.exp(w[5]*(g-1))+1; }
function f7NextD(w,d,g,r){ g=clamp(g,1,4); var dd=-w[6]*(g-3); if(g===1) dd*=(r+0.1);
  var nd=d+(10-d)*dd/9; return clamp(f7InitD(w,4)*0.01+nd*0.99,D_MIN,D_MAX); }
function f7Stab(w,ls,ld,r,g,st){ g=clamp(g,1,4);
  var hp=g===2?w[st+6]:1, eb=g===4?w[st+7]:1;
  var fail=w[st+3]*(Math.pow(ls+1,w[st+4])-1)*Math.exp((1-r)*w[st+5]), pls=Math.min(ls,fail);
  var sinc=Math.exp(w[st]-1.5)*(11-ld)*Math.pow(ls,-w[st+1])*(Math.exp((1-r)*w[st+2])-1)*hp*eb+1;
  return clamp(g>1?Math.max(pls,ls*sinc):pls,S_MIN,S_MAX); }
function f7Next(w,st,dt,g){
  dt=Math.max(dt,0); g=clamp(g,1,4);
  var last={s:clamp(st.s,S_MIN,S_MAX),d:clamp(st.d,D_MIN,D_MAX),sf:clamp(st.sf,S_MIN,S_MAX)};
  var r=f7Curve(w,dt,last), ns=f7Stab(w,last.s,last.d,r,g,7);
  var rf=f7Fast(w,dt,last.sf), nsf=f7Stab(w,last.sf,last.d,rf,g,15);
  if(g===1) nsf=Math.min(nsf,ns*0.8);
  return {s:ns,d:f7NextD(w,last.d,g,r),sf:clamp(nsf,S_MIN,S_MAX)};
}
function f7Init(w,g){ g=clamp(g,1,4); var s=clamp(w[g-1],S_MIN,S_MAX); return {s:s,d:clamp(f7InitD(w,g),D_MIN,D_MAX),sf:clamp(s*0.8,S_MIN,S_MAX)}; }
function f7Interval(w,st,dr){ // fsrs7_next_interval_scalar_for_state: Newton on log t, bisection as fallback
  dr=clamp(dr,0.0001,0.9999); if(dr>=0.9999) return 0;
  st={s:clamp(st.s,S_MIN,S_MAX),d:clamp(st.d,D_MIN,D_MAX),sf:clamp(st.sf,S_MIN,S_MAX)};
  var MIN_T=1/86400, lo=Math.log(MIN_T), hi=Math.log(S_MAX), lt=Math.log(Math.max(st.s,st.sf,MIN_T));
  for(var i=0;i<7;i++){ lt=clamp(lt,lo,hi); var t=clamp(Math.exp(lt),MIN_T,S_MAX), rd=f7CurveDeriv(w,t,st);
    var step=clamp((rd[0]-dr)/Math.min(rd[1]*t,-1e-12),-4,4); lt-=step; if(!isFinite(lt)) return f7Bisect(w,st,dr); }
  var iv=clamp(Math.exp(lt),0,S_MAX), r=f7Curve(w,iv,st);
  return (isFinite(r)&&Math.abs(r-dr)<=1e-3)?iv:f7Bisect(w,st,dr);
}
function fsrs7(log){
  if(!log.length) return null;
  var st=f7Init(W7,ANKI[log[0].r]);
  for(var i=1;i<log.length;i++) st=f7Next(W7,st,(log[i].t-log[i-1].t)/DAY,ANKI[log[i].r]);
  var last=log[log.length-1].t;
  return {due:last+f7Interval(W7,st,TARGET)*DAY,info:st};
}

/* ---------- Duolingo's Leitner and Pimsleur: duolingo/halflife-regression, experiment.py (MIT), the fixed
   baselines in Settles & Meeder (2016). Half-life h in days, clipped to 15 minutes .. 274 days, and predicted
   recall p = 2^(-t/h). Leitner: h = 2^(right - wrong). Pimsleur: h = 2^(2.35·reviews - 16.46). ---------- */
var HMIN=15/(24*60), HMAX=274;
var hclip=function(h){ return Math.min(Math.max(h,HMIN),HMAX); };
function duoSched(log,which){
  if(!log.length) return null;
  var right=log.filter(function(e){return PASS(e.r);}).length, wrong=log.length-right;
  var h=hclip(which==="leitner"?Math.pow(2,right-wrong):Math.pow(2,2.35*log.length-16.46));
  return {due:log[log.length-1].t+(-h*Math.log2(TARGET))*DAY,info:{halflife:h,right:right,wrong:wrong}};
}

/* ---------- Pimsleur (1967), "A Memory Schedule", Modern Language Journal 51(2): graduated interval recall.
   The n-th interval is 5^n seconds (5 s, 25 s, 125 s, 625 s, ...). The paper reminds the learner of the answer
   "whether or not you respond correctly", so a miss does not reset the schedule. ---------- */
function pimsleur(log){
  if(!log.length) return null;
  return {due:log[log.length-1].t+Math.pow(5,log.length)*1000,info:{step:log.length}};
}

/* ---------- LSTM and GRU: open-spaced-repetition/srs-benchmark, models/lstm.py and models/gru.py, with the
   pretrained weights in pretrain/ (vendor/srs-benchmark-weights.js). Each past review feeds in the days since
   the previous one, the rating (1-4), and for the LSTM how long you took; the network outputs a mixture of power
   forgetting curves, and the card is due when that curve reaches 90%. Same maths as PyTorch: LayerNorm eps 1e-5,
   LSTM gates i,f,g,o and GRU gates r,z,n. ---------- */
var silu=function(x){return x/(1+Math.exp(-x));}, sig=function(x){return 1/(1+Math.exp(-x));};
function lin(W,b,x){ return W.map(function(row,i){ var s=b?b[i]:0; for(var j=0;j<row.length;j++) s+=row[j]*x[j]; return s; }); }
function ln(x,w,b){ var n=x.length,m=0,v=0,i; for(i=0;i<n;i++) m+=x[i]; m/=n; for(i=0;i<n;i++) v+=(x[i]-m)*(x[i]-m); v/=n;
  var sd=Math.sqrt(v+1e-5); return x.map(function(xi,k){ return (xi-m)/sd*w[k]+(b?b[k]:0); }); }
function lstmSeq(P,pre,xs){ var H=P[pre+"weight_hh_l0"][0].length, h=new Array(H).fill(0), c=new Array(H).fill(0);
  return xs.map(function(x){ var a=lin(P[pre+"weight_ih_l0"],P[pre+"bias_ih_l0"],x), b2=lin(P[pre+"weight_hh_l0"],P[pre+"bias_hh_l0"],h);
    var z=a.map(function(v,k){return v+b2[k];});
    var ig=z.slice(0,H).map(sig), fg=z.slice(H,2*H).map(sig), gg=z.slice(2*H,3*H).map(Math.tanh), og=z.slice(3*H).map(sig);
    c=c.map(function(ck,k){return fg[k]*ck+ig[k]*gg[k];}); h=c.map(function(ck,k){return og[k]*Math.tanh(ck);}); return h; }); }
function gruSeq(P,pre,xs){ var H=P[pre+"weight_hh_l0"][0].length, h=new Array(H).fill(0);
  return xs.map(function(x){ var a=lin(P[pre+"weight_ih_l0"],P[pre+"bias_ih_l0"],x), b2=lin(P[pre+"weight_hh_l0"],P[pre+"bias_hh_l0"],h);
    var r=a.slice(0,H).map(function(v,k){return sig(v+b2[k]);}), z=a.slice(H,2*H).map(function(v,k){return sig(v+b2[H+k]);});
    var n=a.slice(2*H).map(function(v,k){return Math.tanh(v+r[k]*b2[2*H+k]);});
    h=n.map(function(nk,k){return (1-z[k])*nk+z[k]*h[k];}); return h; }); }
function nnInputs(log,P,withDur){
  return log.map(function(e,i){
    var dt=i?Math.max(0,(e.t-log[i-1].t)/DAY):0, main=[Math.log(1e-5+dt)];
    if(withDur) main.push(Math.log(Math.min(Math.max(e.d||0,100),60000)));
    main=main.map(function(v,k){return (v-P.input_mean[k])/P.input_std[k];});
    var oh=[0,0,0,0]; oh[Math.max(ANKI[e.r],1)-1]=1; return main.concat(oh); });
}
function heads(P,x){ var w=lin(P["w_fc.weight"],P["w_fc.bias"],x), mx=Math.max.apply(null,w), ex=w.map(function(v){return Math.exp(v-mx);}), se=ex.reduce(function(a,b){return a+b;},0);
  return {w:ex.map(function(v){return v/se;}),
    s:lin(P["s_fc.weight"],P["s_fc.bias"],x).map(function(v){return Math.exp(clamp(v,-25,25));}),
    d:lin(P["d_fc.weight"],P["d_fc.bias"],x).map(function(v){return Math.exp(clamp(v,-25,25));})}; }
function nnCurve(o){ return function(t){ var s=0; for(var k=0;k<o.w.length;k++) s+=o.w[k]*Math.pow(1+t/(1e-7+o.s[k]),-o.d[k]); return (1-1e-7)*s; }; }
function lstmOut(log){ var P=NNW.lstm, xs=nnInputs(log,P,true);
  xs=xs.map(function(x){ var y=ln(lin(P["process.0.weight"],P["process.0.bias"],x).map(silu),P["process.2.weight"]);
    return lin(P["process.3.weight"],P["process.3.bias"],y).map(silu); });
  var a=lstmSeq(P,"process.5.module.1.module.",xs.map(function(x){return ln(x,P["process.5.module.0.weight"]);}));
  xs=xs.map(function(x,i){return x.map(function(v,k){return v+a[i][k];});});
  var b=lstmSeq(P,"process.6.module.1.module.",xs.map(function(x){return ln(x,P["process.6.module.0.weight"],P["process.6.module.0.bias"]);}));
  xs=xs.map(function(x,i){return x.map(function(v,k){return v+b[i][k];});});
  xs=xs.map(function(x){ var y=ln(x,P["process.7.module.0.weight"]); y=lin(P["process.7.module.1.weight"],P["process.7.module.1.bias"],y).map(silu);
    y=ln(y,P["process.7.module.3.weight"]); y=lin(P["process.7.module.4.weight"],P["process.7.module.4.bias"],y).map(silu);
    return x.map(function(v,k){return v+y[k];}); });
  var last=xs[xs.length-1]; last=lin(P["process.9.weight"],P["process.9.bias"],ln(last,P["process.8.weight"])).map(silu);
  return heads(P,last); }
function gruOut(log){ var P=NNW.gru, xs=nnInputs(log,P,false);
  xs=xs.map(function(x){ return ln(lin(P["process.0.weight"],P["process.0.bias"],x).map(silu),P["process.2.weight"]); });
  var hs=gruSeq(P,"process.3.module.",xs), last=ln(hs[hs.length-1],P["process.4.weight"]);
  last=ln(lin(P["process.5.weight"],P["process.5.bias"],last).map(silu),P["process.7.weight"]);
  return heads(P,last); }
function nnSched(log,which){
  if(!log.length) return null;
  var o=which==="lstm"?lstmOut(log):gruOut(log);
  return {due:log[log.length-1].t+timeTo90(nnCurve(o))*DAY,info:o};
}

/* ---------- Leitner (1972), "So lernt man lernen": the learning box. Five compartments 1, 2, 5, 8 and 14 cm deep;
   a compartment is worked through when it is full. Known: the card moves on one compartment (out of the box
   after the fifth). Not known: back to compartment 1. New cards go into compartment 1. The book itself isn't
   online; these rules are from descriptions of it. Vocābula scales the box so that it holds exactly the words you
   picked, keeping Leitner's 1 : 2 : 5 : 8 : 14 proportions. ---------- */
var LB=[1,2,5,8,14];
function lbCaps(n){ var tot=30; return LB.map(function(cm){ return Math.max(1,Math.round(cm/tot*n)); }); }
function lbUpdate(box,id,rating,now){ // box: {cards:{id:{b:1-5 or 6 for done, at:ms}}}
  var c=box.cards[id]||{b:1,at:now};
  c.b = PASS(rating) ? Math.min(c.b+1,6) : 1; c.at=now; box.cards[id]=c;
}
function lbPick(box,cand,isSeen){
  var caps=lbCaps(cand.length), inBox=function(k){ return cand.filter(function(c){ var s=box.cards[c.id]; return s&&s.b===k; })
    .sort(function(a,b){return box.cards[a.id].at-box.cards[b.id].at;}); };
  for(var k=5;k>=2;k--){ var cs=inBox(k); if(cs.length&&cs.length>=caps[k-1]) return {card:cs[0],kind:"due"}; }
  var one=inBox(1), fresh=cand.filter(function(c){return !box.cards[c.id]&&!isSeen(c);});
  if(one.length<caps[0]&&fresh.length) return {card:fresh[0],kind:"new"};
  if(one.length) return {card:one[0],kind:"due"};
  var placed=cand.filter(function(c){return !box.cards[c.id];}); // seen under other methods but not yet in the box
  if(placed.length) return {card:placed[0],kind:"due"};
  for(k=2;k<=5;k++){ cs=inBox(k); if(cs.length) return {card:cs[0],kind:"early"}; }
  var done=cand.filter(function(c){return box.cards[c.id]&&box.cards[c.id].b===6;}).sort(function(a,b){return box.cards[a.id].at-box.cards[b.id].at;});
  return {card:(done[0]||cand[0]),kind:"early"};
}

var METHODS={
  "sm2":       {name:"SM-2",               sched:function(log){return sm2(log);}},
  "anki-sm2":  {name:"Anki SM-2",          sched:function(log,id){return ankiSm2(log,id);}},
  "ebisu":     {name:"Ebisu v2",           sched:function(log){return ebisuSched(log);}},
  "fsrs7":     {name:"FSRS-7",             sched:function(log){return fsrs7(log);}},
  "leitner":   {name:"Leitner",            box:true},
  "leitner-duo":{name:"Leitner (Duolingo)",sched:function(log){return duoSched(log,"leitner");}},
  "pimsleur":  {name:"Pimsleur",           sched:function(log){return pimsleur(log);}},
  "pimsleur-duo":{name:"Pimsleur (Duolingo)",sched:function(log){return duoSched(log,"pimsleur");}},
  "lstm":      {name:"LSTM",               sched:function(log){return nnSched(log,"lstm");}},
  "gru":       {name:"GRU",                sched:function(log){return nnSched(log,"gru");}}
};
var API={METHODS:METHODS,lbUpdate:lbUpdate,lbPick:lbPick,lbCaps:lbCaps,dayNum:dayNum,
  _test:{sm2:sm2,ankiSm2:ankiSm2,ebisuSched:ebisuSched,fsrs7:fsrs7,f7Curve:f7Curve,f7Next:f7Next,f7Init:f7Init,f7Interval:f7Interval,W7:W7,
    duoSched:duoSched,pimsleur:pimsleur,lstmOut:lstmOut,gruOut:gruOut,nnCurve:nnCurve,timeTo90:timeTo90}};
if(isNode) module.exports=API; else root.SCHED=API;
})(typeof globalThis!=="undefined"?globalThis:this);
