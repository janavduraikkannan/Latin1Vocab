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
var prog=E.blankProgress(), cfg={dir:"el",sets:[],len:"endless",count:10};
try{var p0=JSON.parse(localStorage.getItem(PKEY)||"null");if(p0)prog=E.mergeProgress(p0,null);}catch(e){}
try{var c0=JSON.parse(localStorage.getItem(CKEY)||"null");if(c0)["dir","sets","len","count"].forEach(function(k){if(c0[k]!=null)cfg[k]=c0[k];});}catch(e){}
cfg.sets=cfg.sets.filter(function(id){return E.SETS.some(function(s){return s.id===id;});});
function saveLocal(){try{localStorage.setItem(PKEY,JSON.stringify(prog));localStorage.setItem(CKEY,JSON.stringify(cfg));}catch(e){}}
function cards(){return prog[cfg.dir];}
function pool(){return E.ALL.filter(function(c){return cfg.sets.indexOf(c.set.id)>=0;});}
function seenIn(list){var m=cards();return list.filter(function(c){return m[c.id];}).length;}
function mastery(list){var m=cards(),t=0;list.forEach(function(c){if(m[c.id])t+=m[c.id].r;});return list.length?Math.round(100*t/(5*list.length)):0;}
function tally(list){var m=cards(),n=[0,0,0,0,0,0];list.forEach(function(c){n[m[c.id]?m[c.id].r:0]++;});return n;}
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
    var bar=document.createElement("i"),fill=document.createElement("u");fill.style.width=mastery(s.cards)+"%";bar.appendChild(fill);
    b.appendChild(t);b.appendChild(sp);b.appendChild(bar);
    b.onclick=function(){var i=cfg.sets.indexOf(s.id);if(i>=0)cfg.sets.splice(i,1);else cfg.sets.push(s.id);saveLocal();renderHome();};
    room.appendChild(b);
  });
  [].forEach.call(document.getElementsByName("len"),function(r){r.checked=r.value===cfg.len;});
  $("count").value=cfg.count;$("warn").hidden=true;
  $("overall").textContent=dirName(cfg.dir)+": "+seenIn(E.ALL)+" of "+E.ALL.length+" words seen, "+mastery(E.ALL)+"% overall mastery.";
}
$("dirs").onclick=function(e){var b=e.target.closest("button");if(!b)return;cfg.dir=b.dataset.dir;saveLocal();renderHome();};
document.querySelector(".quick").onclick=function(e){var q=e.target.dataset.q;if(!q)return;
  cfg.sets=E.SETS.filter(function(s){return q==="all"||s.side===q;}).map(function(s){return s.id;});saveLocal();renderHome();};
[].forEach.call(document.getElementsByName("len"),function(r){r.onchange=function(){cfg.len=r.value;saveLocal();};});
$("count").onfocus=function(){cfg.len="count";saveLocal();document.getElementsByName("len")[1].checked=true;};
$("count").oninput=function(){var n=parseInt($("count").value,10);if(n>0){cfg.count=Math.min(999,n);saveLocal();}};
$("reset").onclick=function(){
  if(!confirm("Erase all your ratings for "+dirName(cfg.dir)+"? This also erases them from your account."))return;
  prog[cfg.dir]={};prog.reset[cfg.dir]=Date.now();saveLocal();syncSoon();renderHome();
};
$("start").onclick=function(){if(!cfg.sets.length){$("warn").hidden=false;return;}startSession();};

/* ---------- study ---------- */
var sess=null,cur=null,revealed=false;
function startSession(){sess=E.newSession(pool(),cfg.len==="count"?Math.max(1,cfg.count|0):0);show("study");next();}
function next(){
  if(sess.target&&sess.done>=sess.target){finish();return;}
  cur=E.pick(sess,cards(),Date.now());revealed=false;
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
  var cy=E.cycleSize(sess);
  $("cyclelbl").textContent=cy?cy+(cy===1?" card":" cards")+" in your cycle. A new word comes once "+(cy===1?"it’s":"they’re all")+" rated 5.":"Every card in your cycle is at 5, so the next word can be new.";
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
  E.rate(sess,cards(),cur.card,r,Date.now(),cur.kind);saveLocal();syncSoon();next();
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
  $("sleft").textContent=left?left+" of "+sess.pool.length+" words in these sets haven’t been introduced yet. They come in one at a time, each once your cycle is all 5s."
    :"Every word in these sets has been introduced. Repeating brings back whatever is due, weakest first.";
  show("summary");$("repeat").focus();
}
function donut(list,size,label){
  var n=tally(list),tot=list.length,stops=[],acc=0;
  [1,2,3,4,5,0].forEach(function(i){if(!n[i])return;var a=acc/tot*100;acc+=n[i];stops.push((i?"var(--c"+i+")":"var(--unseen)")+" "+a+"% "+(acc/tot*100)+"%");});
  var d=document.createElement("div");d.className="donut "+size;d.style.background="conic-gradient("+stops.join(",")+")";
  d.setAttribute("role","img");d.setAttribute("aria-label",mastery(list)+"% mastery");
  d.innerHTML="<div><div><b>"+mastery(list)+"%</b>"+(label?"<span>"+label+"</span>":"")+"</div></div>";
  return d;
}
function renderMastery(){
  var T=$("mtotal");T.textContent="";T.appendChild(donut(sess.pool,"big","mastery"));
  var n=tally(sess.pool),L=$("mlegend");L.textContent="";
  [1,2,3,4,5,0].forEach(function(i){var li=document.createElement("li"),sw=document.createElement("i");sw.className=i?"r"+i:"grey";li.appendChild(sw);li.appendChild(document.createTextNode((i?i:"Unseen")+": "+n[i]));L.appendChild(li);});
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
