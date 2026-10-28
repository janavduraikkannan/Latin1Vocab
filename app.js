/* Vocābula page: home, study and summary screens, saving, and the shared Verba account. */
(function(){
"use strict";
var $=function(id){return document.getElementById(id);};
var cap=function(s){return s.charAt(0).toUpperCase()+s.slice(1);};
var esc=function(s){return String(s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});};
var dirName=function(d){return d==="el"?"English to Latin":"Latin to English";};

/* ---------- theme (shared with Verba) ---------- */
(function(){
  var root=document.documentElement, tt=$("theme-toggle");
  tt.setAttribute("aria-label",root.getAttribute("data-theme")==="dark"?"dark":"light");
  tt.addEventListener("click",function(){
    var next=root.getAttribute("data-theme")==="dark"?"light":"dark";
    root.setAttribute("data-theme",next);tt.setAttribute("aria-label",next);
    try{localStorage.setItem("verba-theme",next);}catch(e){}
  });
})();

/* ---------- saved state (this browser) ---------- */
var PKEY="vocabula.progress", CKEY="vocabula.settings";
var prog=E.blankProgress(), cfg={dir:"el",sets:[],len:"endless",count:10,method:"new"};
try{var p0=JSON.parse(localStorage.getItem(PKEY)||"null");if(p0)prog=E.mergeProgress(p0,null);}catch(e){}
try{var c0=JSON.parse(localStorage.getItem(CKEY)||"null");if(c0)["dir","sets","len","count","method"].forEach(function(k){if(c0[k]!=null)cfg[k]=c0[k];});}catch(e){}
if(cfg.method!=="legacy"&&cfg.method!=="new"&&!E.SC.METHODS[cfg.method])cfg.method="new";
cfg.sets=cfg.sets.filter(function(id){return E.SETS.some(function(s){return s.id===id;});});
function saveLocal(){try{localStorage.setItem(PKEY,JSON.stringify(prog));localStorage.setItem(CKEY,JSON.stringify(cfg));}catch(e){}}
function cards(){return prog[cfg.dir];}
function legacy(){return prog.lg[cfg.dir];}
function ext(){return {log:prog.log[cfg.dir],lb:prog.lb[cfg.dir]};}
function pool(){return E.ALL.filter(function(c){return cfg.sets.indexOf(c.set.id)>=0;});}
function seenIn(list){var m=cards();return list.filter(function(c){return m[c.id];}).length;}
/* Mastery in the chosen scheduler's own terms, rebuilt from the review history (engine.js / schedulers.js). */
function mOf(list){return E.mastery(cfg.method,cards(),{log:prog.log[cfg.dir],lb:prog.lb[cfg.dir]},list,Date.now());}
function mastery(list){return mOf(list).pct;}
function methodName(){return cfg.method==="new"?"Default (FSRS-6)":cfg.method==="legacy"?"Legacy":E.SC.METHODS[cfg.method].name;}
function segBar(list){ // the method's categories as one stacked bar
  var m=mOf(list),bar=document.createElement("i");
  m.cats.forEach(function(c){ if(!c.n) return; var u=document.createElement("u");u.style.width=(100*c.n/list.length)+"%";u.style.background="var(--"+c.color+")";u.title=c.label+": "+c.n;bar.appendChild(u); });
  return bar;
}
function show(id){["home","study","summary"].forEach(function(s){$(s).hidden=s!==id;});window.scrollTo(0,0);}

/* ---------- the shared account (Verba's account key; progress in its own vocab/ document) ---------- */
var PROJECT="verba-791ca", FS="https://firestore.googleapis.com/v1/projects/"+PROJECT+"/databases/(default)/documents";
var acct={key:"",timer:null,last:null,err:"",busy:false};
try{acct.key=localStorage.getItem("verba-account")||"";}catch(e){}
var B32="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function newKey(){var a=new Uint8Array(24);crypto.getRandomValues(a);return Array.from(a).map(function(x){return B32[x%32];}).join("");}
var normKey=function(k){return String(k).toUpperCase().replace(/^VERBA/,"").replace(/[^A-Z0-9]/g,"");};
var showKey=function(k){return "VERBA-"+k.match(/.{1,4}/g).join("-");};
function refused(r,what){return new Error(r.status===403?what+" was refused (the account server’s security rules may not be published yet).":what+" failed (error "+r.status+").");}
async function accountExists(k){
  var r=await fetch(FS+"/accounts/"+k+"?mask.fieldPaths=updated");
  if(r.status===404)return false; if(!r.ok)throw refused(r,"Checking the account"); return true;
}
async function vocabGet(k){
  var r=await fetch(FS+"/vocab/"+k);
  if(r.status===404)return null; if(!r.ok)throw refused(r,"Loading your vocab progress");
  var j=await r.json(); return JSON.parse(((j.fields||{}).data||{}).stringValue||"null");
}
async function vocabPut(k,d){
  var r=await fetch(FS+"/vocab/"+k,{method:"PATCH",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({fields:{data:{stringValue:JSON.stringify(d)},updated:{timestampValue:new Date().toISOString()}}})});
  if(!r.ok)throw refused(r,"Saving to your account");
}
async function syncNow(){
  if(!acct.key||acct.busy)return; acct.busy=true;
  try{var remote=await vocabGet(acct.key);prog=E.mergeProgress(prog,remote);saveLocal();await vocabPut(acct.key,prog);acct.last=new Date();acct.err="";}
  catch(e){acct.err=e.message;}
  acct.busy=false; acctUI(); if(!$("home").hidden)renderHome();
}
function syncSoon(){if(!acct.key)return;clearTimeout(acct.timer);acct.timer=setTimeout(syncNow,2500);}
document.addEventListener("visibilitychange",function(){if(document.visibilityState==="hidden"&&acct.timer){clearTimeout(acct.timer);syncNow();}});
async function signInWithKey(k){
  if(!(await accountExists(k)))throw new Error("No account uses that key. Check for typos.");
  acct.key=k;try{localStorage.setItem("verba-account",k);}catch(e){} await syncNow();
}
async function makeAccount(){ // same account doc Verba makes; Verba fills in the rest the first time you use it there
  var k=newKey();
  var r=await fetch(FS+"/accounts/"+k,{method:"PATCH",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({fields:{data:{stringValue:"{}"},updated:{timestampValue:new Date().toISOString()}}})});
  if(!r.ok)throw refused(r,"Creating the account");
  acct.key=k;try{localStorage.setItem("verba-account",k);}catch(e){} await syncNow(); return k;
}
/* Username + password login, read-only: the same records Verba makes (see Verba's index.html for how they work). */
var normH=function(x){return String(x||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();};
var validHid=function(h){return /^[a-z0-9_]{3,20}$/.test(h);};
var cleanHandle=function(x){return Array.from(String(x||"").normalize("NFC").replace(/\s+/g,"_")).filter(function(ch){return /^[a-z0-9_]$/.test(normH(ch));}).join("").slice(0,20);};
var b64u8=function(s){return Uint8Array.from(atob(s),function(c){return c.charCodeAt(0);});};
async function passwordSignIn(user,pw){
  var hid=normH(cleanHandle(String(user||"").trim().replace(/^@/,"")));
  if(!validHid(hid))throw new Error("Type your username (3 to 20 letters, numbers or _).");
  if(!pw)throw new Error("Type your password.");
  var bad="Wrong username or password, or this account hasn’t set a password. Your account key still works if you have it.";
  var base=await crypto.subtle.importKey("raw",new TextEncoder().encode(pw),"PBKDF2",false,["deriveBits"]);
  var bits=new Uint8Array(await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt:new TextEncoder().encode("verba-login-v2:"+hid),iterations:310000},base,384));
  var id=Array.from(bits.slice(0,16)).map(function(x){return x.toString(16).padStart(2,"0");}).join("");
  var aes=await crypto.subtle.importKey("raw",bits.slice(16),"AES-GCM",false,["decrypt"]);
  var r=await fetch(FS+"/logins/"+id);
  if(r.status===404)throw new Error(bad); if(!r.ok)throw refused(r,"Logging in");
  var f=(await r.json()).fields||{},iv=(f.iv||{}).stringValue||"",ct=(f.ct||{}).stringValue||"";
  if(!ct)throw new Error(bad);
  var k;try{k=JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:"AES-GCM",iv:b64u8(iv)},aes,b64u8(ct)))).k;}catch(e){throw new Error(bad);}
  await signInWithKey(k);
}
function acctUI(){
  $("acctbtn").classList.toggle("on",!!acct.key);$("acctlbl").textContent=acct.key?"Synced":"Account";
  $("acctbtn").setAttribute("aria-label",acct.key?"Account: synced":"Account: not logged in");
  $("savedwhere").textContent=acct.key?"Progress saves to your account and this browser, separately for each direction.":"Progress saves in this browser, separately for each direction. Log in to keep it on every device.";
  if(!$("acct").open)return;
  var B=$("acctBody");
  if(B.contains(document.activeElement)&&document.activeElement.tagName==="INPUT")return;
  if(acct.key){
    B.innerHTML='<h2 id="acctTitle">Your account</h2><p>This browser is logged in. Your vocab progress saves to your account automatically.</p>'+
      '<p class="hint">It’s the same account as Verba and the other Linguae sites. Vocābula keeps its own progress and has no leaderboard.</p>'+
      '<p style="margin:14px 0 0"><b>Your account key</b> <span class="hint">(keep a copy somewhere safe)</span></p><div class="keybox">'+esc(showKey(acct.key))+'</div>'+
      '<div class="row"><button class="btn quiet" id="kcopy">Copy key</button><button class="btn quiet" id="ksync">Sync now</button><button class="btn quiet" id="kout">Log out here</button></div>'+
      '<p class="msg '+(acct.err?"bad":"ok")+'" id="kmsg">'+(acct.err?esc(acct.err):acct.last?"Last synced "+acct.last.toLocaleTimeString():"")+'</p>'+
      '<p class="hint">To set a username and password, open your account on <a href="../verba/">Verba</a>.</p>';
    $("kcopy").onclick=async function(){try{await navigator.clipboard.writeText(showKey(acct.key));$("kmsg").className="msg ok";$("kmsg").textContent="Copied!";}catch(e){$("kmsg").textContent="Select the key above and copy it.";}};
    $("ksync").onclick=function(){$("kmsg").className="msg";$("kmsg").textContent="Syncing…";syncNow();};
    $("kout").onclick=function(){if(!confirm("Log out on this browser? This logs you out of Verba and the other Linguae sites here too. Make sure you have your account key first."))return;
      acct.key="";acct.last=null;acct.err="";try{localStorage.removeItem("verba-account");}catch(e){}acctUI();};
    return;
  }
  B.innerHTML='<h2 id="acctTitle">Log in</h2><p>Log in with your Verba account to keep your vocab progress on every device.</p>'+
    '<div class="lgtabs" role="tablist"><button type="button" role="tab" id="tabE" aria-selected="true">Username and password</button><button type="button" role="tab" id="tabK" aria-selected="false">Account key</button></div>'+
    '<div id="formE"><input id="lgUser" autocomplete="username" spellcheck="false" autocapitalize="off" placeholder="Username" aria-label="Username"><input id="lgPw" type="password" autocomplete="current-password" placeholder="Password" aria-label="Password">'+
    '<div class="row"><button class="btn" type="button" id="goE">Log in</button></div></div>'+
    '<div id="formK" hidden><input id="lgKey" autocomplete="off" spellcheck="false" placeholder="VERBA-XXXX-XXXX-…" aria-label="Your account key"><div class="row"><button class="btn" type="button" id="goK">Log in with key</button></div></div>'+
    '<p class="msg" id="lgMsg"></p><hr><h3>New here? Make a free account</h3>'+
    '<p>You get an <b>account key</b>, which is your account. It also works on Verba, Palabras, Mots and Wörter, where you can add a username and password.</p>'+
    '<div class="row"><button class="btn quiet" id="kmake">Create my account</button></div><p class="msg" id="kmsg"></p>';
  var msg=function(t,c){$("lgMsg").className="msg "+(c||"");$("lgMsg").textContent=t;};
  var tab=function(e){$("tabE").setAttribute("aria-selected",e);$("tabK").setAttribute("aria-selected",!e);$("formE").hidden=!e;$("formK").hidden=e;msg("");};
  $("tabE").onclick=function(){tab(true);};$("tabK").onclick=function(){tab(false);};
  var go=async function(f,btn){$(btn).disabled=true;msg("Logging in…");try{await f();$("acct").close();}catch(e){msg(e.message,"bad");}finally{if($(btn))$(btn).disabled=false;}};
  $("goE").onclick=function(){go(function(){return passwordSignIn($("lgUser").value,$("lgPw").value);},"goE");};
  $("goK").onclick=function(){go(async function(){var k=normKey($("lgKey").value);if(k.length!==24)throw new Error("That key looks incomplete. It should be VERBA- plus 24 letters and numbers.");await signInWithKey(k);},"goK");};
  $("lgPw").addEventListener("keydown",function(e){if(e.key==="Enter")$("goE").click();});
  $("lgKey").addEventListener("keydown",function(e){if(e.key==="Enter")$("goK").click();});
  $("kmake").onclick=async function(){$("kmsg").className="msg";$("kmsg").textContent="Creating…";
    try{await makeAccount();acctUI();var m=$("kmsg");if(m){m.className="msg ok";m.textContent="Account created! Copy your account key and keep it somewhere safe.";}}
    catch(e){$("kmsg").className="msg bad";$("kmsg").textContent=e.message;}};
}
$("acctbtn").onclick=function(){$("acct").showModal();acctUI();};
$("acctClose").onclick=function(){$("acct").close();};
$("acct").addEventListener("click",function(e){if(e.target===$("acct"))$("acct").close();});

/* ---------- home ---------- */
function renderHome(){
  [].forEach.call($("dirs").children,function(b){b.setAttribute("aria-pressed",b.dataset.dir===cfg.dir);});
  var room=$("room");room.textContent="";
  var d=document.createElement("div");d.className="side";d.textContent="Door side";room.appendChild(d);
  var w=document.createElement("div");w.className="side w";w.textContent="Window side";room.appendChild(w);
  E.SETS.forEach(function(s){
    var b=document.createElement("button");b.type="button";b.className="desk";
    b.setAttribute("aria-pressed",cfg.sets.indexOf(s.id)>=0);
    var t=document.createElement("b");t.textContent="Set "+s.quiz+", "+cap(s.side);
    var sp=document.createElement("span");sp.textContent=seenIn(s.cards)+" of "+s.cards.length+" seen · "+mastery(s.cards)+"% mastery";
    var bar=segBar(s.cards);
    b.appendChild(t);b.appendChild(sp);b.appendChild(bar);
    b.onclick=function(){var i=cfg.sets.indexOf(s.id);if(i>=0)cfg.sets.splice(i,1);else cfg.sets.push(s.id);saveLocal();renderHome();};
    room.appendChild(b);
  });
  [].forEach.call(document.getElementsByName("len"),function(r){r.checked=r.value===cfg.len;});
  $("count").value=cfg.count;$("warn").hidden=true;
  renderMethods();
  $("bubbleRule").textContent=cfg.method==="legacy"?"New words come in every few cards.":"I bring each word back right when you’re about to forget it.";
  $("overall").textContent=dirName(cfg.dir)+": "+seenIn(E.ALL)+" of "+E.ALL.length+" words seen, "+mastery(E.ALL)+"% overall mastery with "+methodName()+".";
}
$("dirs").onclick=function(e){var b=e.target.closest("button");if(!b)return;cfg.dir=b.dataset.dir;saveLocal();renderHome();};
document.querySelector(".quick").onclick=function(e){var q=e.target.dataset.q;if(!q)return;
  cfg.sets=E.SETS.filter(function(s){return q==="all"||s.side===q;}).map(function(s){return s.id;});saveLocal();renderHome();};
[].forEach.call(document.getElementsByName("len"),function(r){r.onchange=function(){cfg.len=r.value;saveLocal();};});
$("count").onfocus=function(){cfg.len="count";saveLocal();document.getElementsByName("len")[1].checked=true;};
$("count").oninput=function(){var n=parseInt($("count").value,10);if(n>0){cfg.count=Math.min(999,n);saveLocal();}};
$("reset").onclick=function(){
  if(!confirm("Erase all your ratings for "+dirName(cfg.dir)+"? This also erases them from your account."))return;
  prog[cfg.dir]={};prog.lg[cfg.dir]={step:0,cards:{}};prog.log[cfg.dir]={};prog.lb[cfg.dir]={cards:{}};prog.reset[cfg.dir]=Date.now();saveLocal();syncSoon();renderHome();
};
/* ---------- scheduler choice ---------- */
var L=function(href,t){return '<a href="'+href+'">'+t+'</a>';};
var MINFO=[
 {id:"new",label:'Default<span class="muted small">FSRS-6</span>',title:"Default: FSRS-6",html:
  '<p><b>What it does.</b> It uses FSRS-6, the Free Spaced Repetition Scheduler built into Anki, through '+L("https://github.com/open-spaced-repetition/ts-fsrs","ts-fsrs")+', its maintained open-source code, exactly as it ships. For each word it estimates when you’ll forget it, and brings it back when your chance of remembering falls to 90%. A word you’re still learning, or just forgot, comes back after 1 or 10 minutes. Whenever nothing is due, you get a new word. Ratings of 1 and 2 count as forgotten, 3 as Hard, 4 as Good and 5 as Easy.</p>'+
  '<p><b>Why.</b> In the research behind this site, FSRS was the best open scheduler at predicting whether you’ll remember a card, on the largest open test (about 350 million Anki reviews). That test isn’t peer-reviewed and measures prediction rather than words learned.</p>'},
 {id:"legacy",label:"Legacy",title:"Legacy",showOnPick:true,html:
  '<p><b>What it does.</b> The scheduler from the first version of this site. It isn’t a published method: it was written for Vocābula, loosely after Brainscape’s 1 to 5 confidence buttons. It counts in cards, not days: a word you rate 1 comes back after about 3 cards, a 5 after about 50, and repeated 4s and 5s push it further out. Weak words that are due come first, and a new word arrives at least every fifth card.</p>'+
  '<p><b>Why you might pick it.</b> It brings in new words fast and doesn’t care how many days pass, so it suits going through a whole list in one sitting.</p>'},
 {id:"sm2",label:"SM-2",html:
  '<p><b>What it does.</b> Piotr Woźniak’s 1987 algorithm, the first computer spaced-repetition scheduler, from '+L("https://www.supermemo.com/en/archives1990-2015/english/ol/sm2","his 1990 description")+' and his SuperMemo 2 source code. After a pass a word comes back in 1 day, then 6 days, then each interval times the word’s easiness factor, which starts at 2.5, drops when you struggle and never goes below 1.3. A 1 or 2 restarts it at 1 day. Anything you rate below 4 comes back again the same day until you give it a 4 or 5.</p>'+
  '<p><b>Why.</b> It’s the ancestor of nearly every flashcard scheduler, including Anki’s.</p>'},
 {id:"anki-sm2",label:"Anki SM-2",html:
  '<p><b>What it does.</b> Anki’s default scheduler before FSRS, rebuilt from '+L("https://github.com/ankitects/anki/tree/main/rslib/src/scheduler/states","Anki’s source code")+' with its default settings. A new word steps through 1 and 10 minutes, then comes back in 1 day (4 days if you rate it 5). After that each Good multiplies the interval by the word’s ease, which starts at 250%, drops 15% for Hard and 20% for Again, and rises 15% for Easy, with Anki’s small random spread. A forgotten word comes back after 10 minutes, then restarts at 1 day. Anki’s load balancer isn’t included, because it spreads cards across a whole collection’s days.</p>'+
  '<p><b>Why.</b> It’s what millions of Anki users studied with for over a decade, and the baseline FSRS is usually compared against.</p>'},
 {id:"ebisu",label:"Ebisu v2",html:
  '<p><b>What it does.</b> Ahmed Fasih’s Bayesian model, through '+L("https://github.com/fasiha/ebisu.js","ebisu.js")+' 2.1.3. It keeps a probability distribution over how long each word lasts in memory, starting from the library’s recommended one day, and updates it after each pass (3 to 5) or fail (1 or 2). A word comes back when its predicted recall drops to 90%.</p>'+
  '<p><b>Why.</b> It’s a careful statistical model of forgetting. In the research’s benchmark it predicted recall less well than FSRS-6 (log loss 0.499 against 0.346).</p>'},
 {id:"fsrs7",label:"FSRS-7",html:
  '<p><b>What it does.</b> The newest FSRS, from '+L("https://github.com/open-spaced-repetition/fsrs-rs","fsrs-rs")+', the official Rust code, with its 34 default weights. It tracks a fast and a slow memory trace for each word and handles reviews minutes apart directly, so there are no separate learning steps: each word is due when its predicted recall falls to 90%. Ratings of 1 and 2 count as forgotten, 3 as Hard, 4 as Good and 5 as Easy.</p>'+
  '<p><b>Why.</b> In the benchmark, once its weights are tuned to each user, it predicts recall better than FSRS-6. Here it runs on its default weights, which the benchmark scores below tuned FSRS-6, and no comparison with FSRS-6’s defaults is published. It’s also much newer, with far less real-world use.</p>'},
 {id:"leitner",label:"Leitner",html:
  '<p><b>What it does.</b> Sebastian Leitner’s 1972 learning box from <i>So lernt man lernen</i>. Five compartments 1, 2, 5, 8 and 14 cm deep, scaled here to hold exactly the words you picked. New words go into the first. When a compartment is full you work through it: a word you know (3 to 5) moves on one compartment, a word you don’t goes back to the first, and a word that passes the fifth is learned.</p>'+
  '<p><b>Why.</b> It’s the classic paper flashcard method. It ignores dates and only looks at how full each compartment is. The book isn’t online, so these rules come from descriptions of it.</p>'},
 {id:"leitner-duo",label:"Leitner (Duolingo)",html:
  '<p><b>What it does.</b> The Leitner-style model Duolingo launched with, from its '+L("https://github.com/duolingo/halflife-regression","released research code")+' (Settles and Meeder, 2016). Each word’s memory half-life is 2 to the power of (times right − times wrong) days, kept between 15 minutes and 9 months, and the word is due when predicted recall falls to 90%. Ratings of 3 to 5 count as right.</p>'+
  '<p><b>Why.</b> It’s the baseline in Duolingo’s live test of its later model, which found no significant overall gain from switching.</p>'},
 {id:"pimsleur",label:"Pimsleur",html:
  '<p><b>What it does.</b> Paul Pimsleur’s graduated interval recall, from '+L("https://files.eric.ed.gov/fulltext/ED012150.pdf","“A Memory Schedule”")+' (1967). Each review comes 5ⁿ seconds after the last: 5 s, 25 s, about 2 min, 10 min, 52 min, 4.3 h, 22 h, 4.5 days, 23 days, then 113 days. Missing a word doesn’t change the schedule, because in the paper you’re reminded of the answer either way.</p>'+
  '<p><b>Why.</b> It’s the schedule behind the Pimsleur audio courses, built for fast repetition just after you first learn a word.</p>'},
 {id:"pimsleur-duo",label:"Pimsleur (Duolingo)",html:
  '<p><b>What it does.</b> Duolingo’s version of Pimsleur’s schedule, from the same '+L("https://github.com/duolingo/halflife-regression","research code")+'. Each word’s half-life is 2 to the power of (2.35 × reviews − 16.46) days, kept between 15 minutes and 9 months, and the word is due when predicted recall falls to 90%. Like the original, it counts reviews, not whether you were right.</p>'+
  '<p><b>Why.</b> It’s one of the baselines in Duolingo’s research, which measured how well each schedule predicts forgetting.</p>'},
 {id:"lstm",label:"LSTM",html:
  '<p><b>What it does.</b> A neural network from the '+L("https://github.com/open-spaced-repetition/srs-benchmark","open benchmark")+' in the research, with the weights it was pretrained with on 100 Anki users. It reads a word’s whole history (the time between reviews, each rating, and how long you took to answer) and predicts a forgetting curve; the word is due when that curve reaches 90%.</p>'+
  '<p><b>Why.</b> On the benchmark it predicts recall better than every FSRS version, but only after being fine-tuned to each user. Here it runs on the pretrained weights alone, which the benchmark doesn’t score separately. It’s also hard to see why it makes each choice.</p>'},
 {id:"gru",label:"GRU",html:
  '<p><b>What it does.</b> A much smaller neural network (503 numbers against the LSTM’s 8,869) from the same '+L("https://github.com/open-spaced-repetition/srs-benchmark","benchmark")+', pretrained the same way. It uses the time between reviews and each rating, but not how long you took, and the word is due when its predicted forgetting curve reaches 90%.</p>'+
  '<p><b>Why.</b> On the benchmark it predicts recall about as well as the LSTM at a fraction of the size, again after fine-tuning to each user; here it runs on the pretrained weights alone.</p>'}
];
var openInfo=null;
function renderMethods(){
  var M=$("methods"); M.textContent="";
  MINFO.forEach(function(m){
    var d=document.createElement("div");d.className="mopt";
    d.innerHTML='<button type="button" class="mbtn" data-m="'+m.id+'" aria-pressed="'+(cfg.method===m.id)+'">'+m.label+'</button>'+
      '<button type="button" class="ibtn" data-i="'+m.id+'" aria-expanded="'+(openInfo===m.id)+'" aria-controls="minfo" aria-label="About '+esc(m.title||m.label)+'">i</button>';
    M.appendChild(d);
  });
  var box=$("minfo"), m=MINFO.filter(function(x){return x.id===openInfo;})[0];
  box.hidden=!m; if(m) box.innerHTML="<h3>"+esc(m.title||m.label)+"</h3>"+m.html+"<p><b>Mastery.</b> "+esc(E.masteryInfo(m.id).how)+"</p>";
}
$("methods").onclick=function(e){
  var b=e.target.closest(".mbtn"),i=e.target.closest(".ibtn");
  if(b){cfg.method=b.dataset.m;saveLocal();var m=MINFO.filter(function(x){return x.id===cfg.method;})[0];
    if(m.showOnPick) openInfo=m.id; else if(openInfo==="legacy") openInfo=null;
    renderMethods();renderHome();}
  if(i){openInfo=openInfo===i.dataset.i?null:i.dataset.i;renderMethods();}
};
$("start").onclick=function(){if(!cfg.sets.length){$("warn").hidden=false;return;}startSession();};

/* ---------- study ---------- */
var sess=null,cur=null,revealed=false,shownAt=0;
function startSession(){sess=E.newSession(pool(),cfg.len==="count"?Math.max(1,cfg.count|0):0,cfg.method);show("study");next();}
function next(){
  if(sess.target&&sess.done>=sess.target){finish();return;}
  cur=E.pick(sess,cards(),Date.now(),legacy(),ext());shownAt=Date.now();revealed=false;
  var c=cur.card,toLatin=cfg.dir==="el";
  $("card").className="card "+c.set.side;
  $("tag").innerHTML="Set "+c.set.quiz+", "+cap(c.set.side)+(cur.kind==="new"?'<span class="new">· new word</span>':"");
  $("prompt").textContent=toLatin?c.en:c.la;$("prompt").lang=toLatin?"en":"la";
  $("asklbl").textContent=toLatin?"Type the Latin":"Type the English";
  $("hint").textContent=toLatin?"a- gives ā · Enter shows the answer":"Enter shows the answer";
  $("type").value="";$("type").lang=toLatin?"la":"en";
  $("ask").hidden=false;$("reveal").hidden=true;
  $("countlbl").textContent=sess.target?"Card "+(sess.done+1)+" of "+sess.target:"Card "+(sess.done+1)+" · endless";
  $("bar").style.width=(sess.target?100*sess.done/sess.target:100*E.seenCount(sess)/sess.pool.length)+"%";
  renderSide();$("type").focus();
}
function renderSide(){
  var n=[0,0,0,0,0,0],tot=0,k;for(k in sess.latest){n[sess.latest[k]]++;tot++;}
  var stops=[],acc=0;for(var i=1;i<=5;i++){if(!n[i])continue;var a=acc/tot*100;acc+=n[i];stops.push("var(--c"+i+") "+a+"% "+(acc/tot*100)+"%");}
  $("pie").style.background=tot?"conic-gradient("+stops.join(",")+")":"";
  $("pien").textContent=sess.done;
  var L=$("legend");L.textContent="";
  for(i=1;i<=5;i++){var li=document.createElement("li"),sw=document.createElement("i");sw.className="r"+i;li.appendChild(sw);li.appendChild(document.createTextNode(i+": "+n[i]));L.appendChild(li);}
  $("seenn").textContent=E.seenCount(sess)+" / "+sess.pool.length;
  $("cyclelbl").textContent=sess.method==="legacy"?"Legacy scheduler: a new word comes at least every fifth card."
    :sess.method==="leitner"?"Leitner: each compartment is worked through when it fills up."
    :(sess.method==="new"?"FSRS-6":E.SC.METHODS[sess.method].name)+": cards come back when they’re due, and new words come in whenever nothing is due.";
}
var MAC={a:"ā",e:"ē",i:"ī",o:"ō",u:"ū",y:"ȳ",A:"Ā",E:"Ē",I:"Ī",O:"Ō",U:"Ū",Y:"Ȳ"};
var macronize=function(s){return s.replace(/([aeiouyAEIOUY])-/g,function(m,v){return MAC[v];});};
function reveal(){
  if(revealed)return;revealed=true;
  var toLatin=cfg.dir==="el",v=$("type").value.trim();if(toLatin)v=macronize(v);
  $("mine").textContent=v||"(nothing)";$("mine").lang=toLatin?"la":"en";
  $("theirs").textContent=toLatin?cur.card.la:cur.card.en;$("theirs").lang=toLatin?"la":"en";
  $("note").hidden=!cur.card.note;$("note").textContent=cur.card.note;
  $("ask").hidden=true;$("reveal").hidden=false;$("type").blur();
}
function rateNow(r){
  if(!revealed)return;
  E.rate(sess,cards(),cur.card,r,Date.now(),cur.kind,legacy(),ext(),Date.now()-shownAt);saveLocal();syncSoon();next();
}
function finish(){
  if(!sess.done){show("home");renderHome();return;}
  var sum=0,i;for(i=1;i<=5;i++)sum+=i*sess.ratings[i];
  $("scards").textContent=sess.done;$("sseen").textContent=E.seenCount(sess)+" / "+sess.pool.length;
  $("snew").textContent=sess.newSeen;$("savg").textContent=(sum/sess.done).toFixed(1);
  var max=Math.max.apply(null,sess.ratings.slice(1)),h=$("hist");h.textContent="";
  for(i=1;i<=5;i++){var d=document.createElement("div");d.className="r"+i;d.style.height=(max?100*sess.ratings[i]/max:0)+"%";var s=document.createElement("span");s.textContent=sess.ratings[i];d.appendChild(s);h.appendChild(d);}
  $("sumline").textContent=dirName(cfg.dir)+" · "+cfg.sets.length+(cfg.sets.length===1?" set":" sets")+" ("+sess.pool.length+" words)";
  renderMastery();
  var left=sess.pool.length-seenIn(sess.pool);
  $("sleft").textContent=left?left+" of "+sess.pool.length+" words in these sets haven’t been introduced yet. "+(sess.method==="legacy"?"The Legacy scheduler brings one in at least every fifth card.":sess.method==="leitner"?"The Leitner box adds one whenever its first compartment has room.":"New words come in whenever nothing is due.")
    :"Every word in these sets has been introduced. Repeating brings back whatever is due, weakest first.";
  show("summary");$("repeat").focus();
}
function donut(list,size,label){
  var m=mOf(list),tot=list.length,stops=[],acc=0;
  m.cats.map(function(c){return [c.n,"var(--"+c.color+")"];}).concat([[m.unseen,"var(--unseen)"]]).forEach(function(p){
    if(!p[0])return;var a0=acc/tot*100;acc+=p[0];stops.push(p[1]+" "+a0+"% "+(acc/tot*100)+"%");});
  var d=document.createElement("div");d.className="donut "+size;d.style.background="conic-gradient("+stops.join(",")+")";
  d.setAttribute("role","img");d.setAttribute("aria-label",m.pct+"% mastery: "+m.cats.map(function(c){return c.label+" "+c.n;}).join(", ")+", not seen "+m.unseen);
  d.innerHTML="<div><div><b>"+m.pct+"%</b>"+(label?"<span>"+label+"</span>":"")+"</div></div>";
  return d;
}
function renderMastery(){
  var T=$("mtotal");T.textContent="";T.appendChild(donut(sess.pool,"big","mastery"));
  var m=mOf(sess.pool),L=$("mlegend");L.textContent="";
  m.cats.map(function(c){return [c.label,c.n,"var(--"+c.color+")"];}).concat([["Not seen",m.unseen,"var(--unseen)"]]).forEach(function(p){
    var li=document.createElement("li"),sw=document.createElement("i");sw.style.background=p[2];li.appendChild(sw);li.appendChild(document.createTextNode(p[0]+": "+p[1]));L.appendChild(li);});
  $("mmethod").textContent=methodName();$("mhow").textContent=m.how;
  var S=$("msubs");S.textContent="";
  E.SETS.forEach(function(s){if(cfg.sets.indexOf(s.id)<0)return;
    var f=document.createElement("figure"),c=document.createElement("figcaption"),sm=document.createElement("small");
    c.textContent="Set "+s.quiz+", "+cap(s.side);sm.textContent=seenIn(s.cards)+" of "+s.cards.length+" seen";c.appendChild(sm);
    f.appendChild(donut(s.cards,"sm"));f.appendChild(c);S.appendChild(f);});
}
$("type").addEventListener("input",function(){
  if(cfg.dir!=="el")return;var el=this,pos=el.selectionStart,b=macronize(el.value.slice(0,pos)),a=macronize(el.value.slice(pos));
  if(b+a!==el.value){el.value=b+a;el.setSelectionRange(b.length,b.length);}
});
$("type").addEventListener("keydown",function(e){if(e.key==="Enter"){e.preventDefault();e.stopPropagation();reveal();}});
$("show").onclick=reveal;
$("rate").onclick=function(e){var b=e.target.closest("button");if(b)rateNow(+b.dataset.r);};
document.addEventListener("keydown",function(e){
  if($("study").hidden||!revealed||e.metaKey||e.ctrlKey||e.altKey||$("acct").open)return;
  if(e.key>="1"&&e.key<="5"){e.preventDefault();rateNow(+e.key);}
});
$("end").onclick=finish;
$("repeat").onclick=startSession;
$("tohome").onclick=function(){show("home");renderHome();};

renderHome();acctUI();
if(acct.key)syncNow();
})();
