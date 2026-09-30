(() => {
  "use strict";
  const reduced=()=>matchMedia("(prefers-reduced-motion: reduce)").matches;
  const later=fn=>requestAnimationFrame(()=>requestAnimationFrame(fn));
  const pause=ms=>new Promise(r=>setTimeout(r,reduced()?0:ms));
  function replay(el,cls){if(!el)return;el.classList.remove(cls);void el.offsetWidth;el.classList.add(cls)}
  function count(el,from,to,ms=620,format=n=>Math.round(n).toLocaleString()){
    if(!el)return;const token=`${Date.now()}${Math.random()}`;el.dataset.motionToken=token;
    if(reduced()||from===to){el.textContent=format(to);return}
    const start=performance.now(),frame=now=>{if(el.dataset.motionToken!==token)return;const x=Math.max(0,Math.min(1,(now-start)/ms)),k=1-(1-x)**3;el.textContent=format(from+(to-from)*k);if(x<1)requestAnimationFrame(frame)};requestAnimationFrame(frame);
  }

  const MISSION_STORAGE="bg_weekly_mission_v1";
  const missionWeekStartMs=()=>new Date(weekKey()+"T00:00:00+09:00").getTime();
  const missionDeadlineMs=()=>missionWeekStartMs()+7*864e5;
  const missionDong=()=>S.loc?.dong||S.last?.rep?.dong||"Sinwol 1-dong";
  const rawMissionProgress=(dong=missionDong())=>Math.max(0,S.board?.goals?.[dong]||0);
  function loadMissionStore(){
    try{return JSON.parse(localStorage.getItem(MISSION_STORAGE)||"{}")||{}}catch{return{}}
  }
  function saveMissionStore(store){
    try{localStorage.setItem(MISSION_STORAGE,JSON.stringify(store))}catch{}
  }
  function syncMissionStore(){
    const week=weekKey(),dong=missionDong(),progress=rawMissionProgress(dong),store=loadMissionStore();
    if(store.current?.week&&store.current.week!==week){
      store.previous={...store.current,status:store.current.progress>=WEEKLY_GOAL?"completed":"expired",expiredAt:Date.now()};
      store.current=null;
    }
    if(!store.current||store.current.week!==week){
      store.current={week,dong,progress,completionSeen:progress>=WEEKLY_GOAL,completedAt:progress>=WEEKLY_GOAL?Date.now():null};
    }else{
      store.current.dong=dong;store.current.progress=progress;
      if(progress>=WEEKLY_GOAL&&!store.current.completedAt)store.current.completedAt=Date.now();
    }
    saveMissionStore(store);return store;
  }
  function remainingText(ms=missionDeadlineMs()-Date.now()){
    if(ms<=0)return"Ended";
    const days=Math.floor(ms/864e5),hours=Math.floor((ms%864e5)/36e5),mins=Math.max(0,Math.floor((ms%36e5)/6e4));
    if(days)return `${days}d ${hours}h left`;
    if(hours)return `${hours}h ${mins}m left`;
    return `${Math.max(1,mins)}m left`;
  }
  function missionSnapshot(){
    const store=syncMissionStore(),dong=missionDong(),raw=rawMissionProgress(dong),progress=Math.min(raw,WEEKLY_GOAL),now=Date.now(),deadline=missionDeadlineMs();
    const status=now>=deadline?"expired":progress>=WEEKLY_GOAL?"completed":progress>0?"in-progress":"not-started";
    const personal=myReports().filter(r=>r.createdAt>=missionWeekStartMs()&&r.aiAnalyzed&&!r.remeasure&&!r.reversed).length;
    return{store,dong,raw,progress,status,personal,deadline,week:weekKey()};
  }
  const missionLabels={"not-started":"Not started","in-progress":"In progress",completed:"Completed",expired:"Expired"};
  function renderMissionSummary(){
    const m=missionSnapshot(),card=document.querySelector(".mission-summary");if(!card)return;
    card.dataset.state=m.status;
    document.querySelector("#goalTitle").textContent=`Verify ${WEEKLY_GOAL} neighborhood hazards`;
    document.querySelector("#goalCount").innerHTML=`<strong>${m.progress}</strong><span> / ${WEEKLY_GOAL} eligible reports</span>`;
    document.querySelector("#missionStatus").textContent=missionLabels[m.status];
    document.querySelector("#missionDeadline").textContent=remainingText(m.deadline-Date.now());
    const help=document.querySelector("#missionHomeHelp");
    help.textContent=m.status==="completed"?"Shared goal reached. No extra points were added; keep reporting urgent hazards.":m.status==="not-started"?"Start with one eligible AI-analyzed report. Personal points are tracked separately.":`${Math.max(0,WEEKLY_GOAL-m.progress)} more eligible report${WEEKLY_GOAL-m.progress===1?"":"s"} to complete the shared goal. Your points stay separate.`;
    const bar=document.querySelector("#homeGoal");if(bar){bar.style.width=`${m.progress/WEEKLY_GOAL*100}%`;bar.parentElement.setAttribute("aria-label",`${m.progress} of ${WEEKLY_GOAL} eligible reports`)}
    card.setAttribute("aria-label",`Weekly mission: ${missionLabels[m.status]}. ${m.progress} of ${WEEKLY_GOAL}. ${remainingText(m.deadline-Date.now())}. Open details.`);
  }
  function renderMission(){
    const m=missionSnapshot(),body=document.querySelector("#missionBody");if(!body)return;
    const stateCopy={
      "not-started":["Ready when you are","Submit an eligible new report to start the neighborhood mission."],
      "in-progress":["Neighborhood progress","Every eligible report moves the shared goal by one."],
      completed:["Mission complete","Your neighborhood reached this week's shared target."],
      expired:["This mission ended","A new mission starts automatically each Monday."]
    }[m.status];
    const previous=m.store.previous;
    const completionClass=S.missionJustCompleted?" mission-just-completed":"";
    body.innerHTML=`<div class="mission-detail-hero ${m.status}${completionClass}">
      <div class="mission-detail-copy"><span class="mission-status">${missionLabels[m.status]}</span><h1>${stateCopy[0]}</h1><p>${stateCopy[1]}</p></div>
      ${mImg(m.status==="completed"?"three":"front")}
      <div class="mission-big-progress"><strong class="num">${m.progress}</strong><span>of ${WEEKLY_GOAL}<br>eligible reports</span></div>
      <div class="meter mission-meter" role="progressbar" aria-valuemin="0" aria-valuemax="${WEEKLY_GOAL}" aria-valuenow="${m.progress}" aria-label="Neighborhood mission progress"><i style="width:${m.progress/WEEKLY_GOAL*100}%"></i></div>
      <div class="mission-deadline"><span>Monday reset · Asia/Seoul</span><strong>${remainingText(m.deadline-Date.now())}</strong></div>
    </div>
    <div class="mission-separation" aria-label="Your contribution and personal points">
      <div><span>Your eligible reports</span><strong>${m.personal}</strong><small>this week</small></div>
      <div><span>Contribution points</span><strong>${score()}</strong><small>personal total</small></div>
    </div>
    <div class="card mission-rules"><h3>What moves the mission</h3>
      <ul class="mission-rule-list">
        <li class="counts"><span aria-hidden="true">✓</span><div><b>One successful new report</b><small>Camera photo, AI analyzed, and eligible under the existing report rules.</small></div></li>
        <li class="counts"><span aria-hidden="true">✓</span><div><b>One report = +1 shared progress</b><small>Your personal award is calculated separately and does not change the mission target.</small></div></li>
        <li><span aria-hidden="true">—</span><div><b>Re-measurements do not advance it</b><small>A valid re-measurement can still earn the existing +5 points.</small></div></li>
        <li><span aria-hidden="true">—</span><div><b>Blocked, failed, or ineligible reports do not count</b><small>Reloading or revisiting Success never adds progress.</small></div></li>
      </ul>
    </div>
    <div class="card mission-next"><span class="mission-next-icon" aria-hidden="true">${m.status==="completed"?"✓":"→"}</span><div><h3>${m.status==="completed"?"What happens next":"Your next step"}</h3><p>${m.status==="completed"?"Keep reporting urgent hazards when you see them. Mission completion is recognition only and adds no extra points.":"Photograph a real hazard and complete the report. If it is eligible, the shared total updates after submission succeeds."}</p></div></div>
    ${previous?`<div class="mission-archive"><span>Previous week</span><b>${previous.status==="completed"?"Completed":"Expired"} · ${Math.min(previous.progress||0,WEEKLY_GOAL)}/${WEEKLY_GOAL}</b></div>`:""}
    ${window.BG_STANDALONE?`<div class="prototype-note" role="note"><b>Local prototype</b><span>This browser stores your week record and reports. The neighborhood baseline is seeded sample data, not live district activity.</span></div>`:""}
    <button class="btn lg" data-go="report">${m.status==="completed"?"Report another hazard":"Make an eligible report"}</button>
    <button class="btn ghost" data-go="home">Back home</button>`;
    if(S.missionJustCompleted){setTimeout(()=>{S.missionJustCompleted=false},900)}
  }

  function enterHome(){
    const home=document.querySelector('[data-screen="home"]');if(!home)return;
    home.querySelectorAll(".home-stagger").forEach(el=>el.classList.remove("home-stagger"));
    [home.querySelector(".goal"),home.querySelector(".quick"),home.querySelector(".quick + .card"),home.querySelector(".points-btn"),home.querySelector("#modeNote")].filter(Boolean).forEach((el,i)=>{el.classList.add("home-stagger");el.style.setProperty("--home-delay",`${520+i*70}ms`)});
    const bar=home.querySelector("#homeGoal"),target=bar?.style.width||"0%";if(bar&&!reduced()){bar.style.width="0%";later(()=>{if(bar.isConnected)bar.style.width=target})}replay(home,"home-enter");
  }
  function routeClass(screen,from){
    if(!screen)return;screen.classList.remove("route-enter","route-from-done","route-home");void screen.offsetWidth;screen.classList.add("route-enter");
    if(from==="done")screen.classList.add("route-from-done");if(screen.dataset.screen==="home")screen.classList.add("route-home");setTimeout(()=>screen.classList.remove("route-enter","route-from-done","route-home"),380);
  }

  const baseGo=window.go;
  window.go=function(name){
    if(name==="report")return baseGo(name);
    const from=S.screen||"home";S.motionEntering=name;S.boardArrival=name==="board"&&from==="done"&&!!S.last&&!S.last.boardShown;document.documentElement.dataset.route=`${from}-${name}`;if(name==="mission")renderMission();
    const swap=()=>{if(name==="review"&&document.querySelector("#scan.on"))baseCloseScan();baseGo(name);if(name==="mission")renderMission();if(name==="board")window.renderBoard();if(name==="shop")window.renderShop();if(name==="home")renderMissionSummary();routeClass(document.querySelector(`.screen[data-screen="${name}"]`),from);if(name==="home")enterHome()};
    swap();setTimeout(()=>{if(S.motionEntering===name)S.motionEntering=null},0);
  };

  const baseOpenScan=window.openScan,baseCloseScan=window.closeScan;
  window.openScan=async function(){
    const scan=document.querySelector("#scan"),reticle=document.querySelector("#reticle");scan.classList.remove("locked","camera-flash","closing","state-analyzing","state-detected","state-ready","state-error");scan.classList.add("state-scanning");reticle.removeAttribute("style");
    const result=baseOpenScan();replay(scan,"on");return result;
  };
  function finishLine(lines,i){
    if(!lines[i]||lines[i].classList.contains("done"))return;lines[i].classList.add("on","done");lines[i+1]?.classList.add("on");replay(document.querySelector(".analyzing .mascot"),"step-nod");
  }
  function detectionPanel(d){
    const t=TYPES[d.type]||TYPES.other;
    return `<div class="detection-panel" role="status" aria-live="polite"><div class="detection-title"><span class="lock-dot" aria-hidden="true"></span>Hazard detected</div><dl class="detection-lines"><dt>Issue</dt><dd>${esc(t.en)}</dd><dt>Risk</dt><dd>${esc(RISKS[d.risk]||"Unknown")}</dd><dt>Approx. size</dt><dd>${esc(sizeText(d.sizeCm,d.sizeMode))}</dd></dl><button class="btn" data-act="reviewDetection">Review report</button></div>`;
  }
  function revealDetection(d){
    const scan=document.querySelector("#scan"),r=document.querySelector("#reticle");document.querySelector("#scanMode").textContent="Hazard detected";document.querySelector("#scanFoot").innerHTML=detectionPanel(d);r.hidden=false;
    if(d.bbox){const[x0,y0,x1,y1]=d.bbox;r.style.left=`${(x0+x1)*50}%`;r.style.top=`${(y0+y1)*50}%`;r.style.width=`${Math.max(22,(x1-x0)*100)}%`;r.style.height=`${Math.max(14,(y1-y0)*100)}%`;r.style.aspectRatio="auto"}
    scan.classList.remove("state-scanning","state-analyzing");scan.classList.add("locked","state-detected");clearTimeout(d.motionReadyTimer);d.motionReadyTimer=setTimeout(()=>{if(scan.classList.contains("locked")){scan.classList.add("state-ready");document.querySelector("#scanMode").textContent="Ready to review"}},reduced()?0:360);if(!d.motionHaptic&&navigator.vibrate){d.motionHaptic=true;navigator.vibrate(18)}
  }
  function finishDetection(){const d=S.draft;if(!d||d.motionReviewStarted)return;d.motionReviewStarted=true;clearTimeout(d.motionReviewTimer);window.go("review")}

  window.handlePhoto=async function(blob,capturedAt,source){
    stopStream();const scan=document.querySelector("#scan");scan.classList.remove("state-scanning","state-detected","state-ready","state-error");scan.classList.add("state-analyzing");replay(scan.querySelector(".shutter"),"captured");replay(scan,"camera-flash");
    const d=S.draft||(S.draft={id:uid(),edited:{}});Object.assign(d,{blob,url:await dataURL(blob),capturedAt,source});d.thumb=await thumbOf(blob).catch(()=>null);
    const still=document.querySelector("#still");still.src=d.url;still.hidden=false;document.querySelector("#reticle").hidden=true;document.querySelector("#safety").hidden=true;document.querySelector("#scanMode").textContent="AI analyzing";
    document.querySelector("#scanFoot").innerHTML=`<div class="analyzing">${mImg("inspect")}<ul class="status-lines" id="lines" role="status" aria-live="polite"><li><span class="tick"></span>Identifying the issue</li><li><span class="tick"></span>Estimating risk and size</li><li><span class="tick"></span>Finding the responsible office</li></ul></div>`;
    const lines=[...document.querySelectorAll("#lines li")];lines[0].classList.add("on");const started=Date.now(),t1=setTimeout(()=>finishLine(lines,0),520),t2=setTimeout(()=>finishLine(lines,1),1040);
    if(!d.loc)d.loc=S.loc||await(S.locP||locate());let ai=null,err=null;try{ai=await analyze(d)}catch(e){err=e}
    const remaining=1200-(Date.now()-started);if(remaining>0)await pause(remaining);clearTimeout(t1);clearTimeout(t2);for(let i=0;i<lines.length;i++){finishLine(lines,i);if(i<lines.length-1)await pause(150)}await pause(180);
    if(ai?.is_hazard){applyAI(d,ai);revealDetection(d);d.motionReviewTimer=setTimeout(finishDetection,reduced()?0:900);return}
    if(ai&&!ai.is_hazard){noHazardSheet("Nothing found","AI didn't find a hazard in this photo.");return}
    const why=!S.sample||!S.imagesOK?"AI analysis isn't available in this view.":err?.code==="not_granted"?"AI analysis was not allowed.":err?.code==="rate_limited"?"AI is busy right now.":"AI analysis didn't finish.";
    noHazardSheet("Report it yourself",`${why} You can still choose the issue and submit.`);
  };

  document.addEventListener("click",e=>{
    const el=e.target.closest("[data-act],[data-risk]");if(!el)return;if(el.dataset.act==="reviewDetection"){e.preventDefault();e.stopPropagation();finishDetection();return}
    if(!S.draft)return;if(el.dataset.risk)S.draft.motionEdited="risk";if(["measureDone","arManualUse"].includes(el.dataset.act))S.draft.motionEdited="size";
  },true);
  document.addEventListener("change",e=>{if(e.target.id==="fType"&&S.draft)S.draft.motionEdited="type"},true);

  const baseReview=window.renderReview;
  function decorateReview(){
    const d=S.draft,body=document.querySelector("#reviewBody");if(!d||!body)return;
    if(!d.motionReviewOpened){d.motionReviewOpened=true;body.classList.add("review-enter");[...body.children].forEach((el,i)=>el.style.setProperty("--review-delay",`${Math.min(i*65,390)}ms`))}else body.classList.remove("review-enter");
    const fields=[...body.querySelectorAll(".fields .f")],map={type:fields[0],risk:fields[1],size:fields[2]};if(map[d.motionEdited])replay(map[d.motionEdited],"motion-highlight");
    const p=pointsFor(d),changed=d.motionPreviousPoints!==undefined&&d.motionPreviousPoints!==p.total;body.querySelectorAll(".ledger .li b").forEach(el=>el.classList.add("points-value"));
    const btn=body.querySelector('[data-act="submit"]');if(btn)btn.innerHTML=`<span>${d.dup?"Add measurement":"Submit report"}</span><span class="submit-reward points-value${changed?" changed":""}">+${p.total}</span>`;
    d.motionPreviousPoints=p.total;
    const editedKeys=["type","risk","size"],fieldMap={type:fields[0],risk:fields[1],size:fields[2]};
    editedKeys.forEach(key=>{const field=fieldMap[key];if(!field)return;field.classList.toggle("field-changed",!!d.edited?.[key]);if(d.edited?.[key]&&!field.querySelector(".field-change-chip"))field.insertAdjacentHTML("afterbegin",'<span class="field-change-chip">✓ Changed</span>')});
    const complaint=body.querySelector("#fComplaint")?.closest(".card");if(complaint)complaint.classList.toggle("field-changed",!!d.edited?.complaint);
    body.querySelectorAll("[data-risk]").forEach(risk=>risk.setAttribute("aria-checked",risk.getAttribute("aria-pressed")==="true"?"true":"false"));
    let feedback=body.querySelector("#submitFeedback");if(!feedback&&btn){feedback=document.createElement("div");feedback.id="submitFeedback";feedback.className="submit-feedback";feedback.setAttribute("role","status");feedback.setAttribute("aria-live","polite");btn.insertAdjacentElement("afterend",feedback)}
    if(feedback){feedback.className="submit-feedback"+(S.submitError?" error":"");feedback.innerHTML=S.submitError?`<b>${S.submitError.title}</b><span>${S.submitError.message}</span>`:'<span>Points and mission progress are added only after submission succeeds.</span>'}
    if(btn){btn.setAttribute("aria-busy","false");if(S.submitError?.retry)btn.querySelector("span:first-child").textContent="Try submission again"}
    d.motionEdited=null;
  }
  window.renderReview=function(){baseReview();decorateReview()};
  function updateReviewPoints(){
    const d=S.draft,body=document.querySelector("#reviewBody");if(!d||!body)return;const p=pointsFor(d),changed=d.motionPreviousPoints!==undefined&&d.motionPreviousPoints!==p.total,ledger=body.querySelector(".ledger");
    if(ledger)ledger.innerHTML=p.lines.map(([l,v])=>`<div class="li"><span>${esc(l)}</span><b class="points-value${changed?" changed":""}">+${v}</b></div>`).join("")+(p.note?`<p class="small muted" style="margin-top:6px">${esc(p.note)}</p>`:"");
    const reward=body.querySelector(".submit-reward");if(reward){reward.textContent=`+${p.total}`;if(changed)replay(reward,"changed")}d.motionPreviousPoints=p.total;
  }
  document.addEventListener("input",e=>{if(e.target.id!=="fComplaint"||!S.draft)return;S.draft.motionEdited="complaint";replay(e.target.closest(".card"),"motion-highlight");queueMicrotask(updateReviewPoints)});

  function rankOf(dongs,name){return DONGS.map(d=>({name:d.en,pts:dongs[d.en]||0})).sort((a,b)=>b.pts-a.pts).findIndex(r=>r.name===name)+1}
  const baseSubmit=window.submit;
  window.submit=async function(){
    const d=S.draft;if(!d||S.busy)return;const dongs=S.board?.dongs||{},goals=S.board?.goals||{};
    const duplicate=findDup(d),recentDuplicate=duplicate&&myReports().find(r=>r.issueId===duplicate.id&&Date.now()-r.createdAt<864e5);
    S.submitError=null;
    S.motionSubmit={previousTotal:score(),previousBoardScore:dongs[d.loc?.dong]||0,previousGoal:goals[d.loc?.dong]||0,previousRank:rankOf(dongs,d.loc?.dong)};
    const pending=baseSubmit();
    queueMicrotask(()=>{const b=document.querySelector('[data-act="submit"]');if(b&&S.busy){b.disabled=true;b.setAttribute("aria-busy","true");b.classList.add("is-loading");b.innerHTML='<span class="motion-spinner" aria-hidden="true"></span><span>Submitting securely</span>'}});
    await pending;
    if(S.screen==="review"){
      S.submitError=recentDuplicate?{title:"Not submitted",message:"You already measured this issue in the last 24 hours. No points or mission progress were added.",retry:false}:{title:"Submission failed",message:"Check your connection, then try again. No points or mission progress were added.",retry:true};
      window.renderReview();
    }else if(S.screen==="done"){
      syncMissionStore();
    }
  };

  function confetti(){
    const colors=["var(--sage)","var(--mustard)","var(--high)","var(--ivory)"],xs=[-112,-92,-72,-49,-26,-8,14,34,56,78,99,118];
    return `<div class="confetti-field" aria-hidden="true">${xs.map((x,i)=>`<i class="confetti" style="--confetti-x:${x}px;--confetti-y:${64+i%4*16}px;--confetti-drift:${i%2?14:-12}px;--confetti-r:${i%2?150:-135}deg;--confetti-color:${colors[i%4]};--confetti-time:${720+i%3*70}ms;--confetti-delay:${i%4*35}ms"></i>`).join("")}</div>`;
  }
  window.renderDone=function(){
    const L=S.last;if(!L)return;const r=L.rep,snap=S.motionSubmit||{},goal=S.board?.goals?.[r.dong]||0,oldGoal=snap.previousGoal??Math.max(0,goal-(L.aiOk?1:0)),total=score(),oldTotal=snap.previousTotal??Math.max(0,total-L.points),fresh=!L.motionPlayed;
    L.motionPlayed=true;const full=fresh&&!r.remeasure&&L.points>0,compact=fresh&&r.remeasure&&L.points>0,body=document.querySelector("#doneBody");
    body.innerHTML=`<div class="success-hero ${fresh?"fresh":""} ${r.remeasure?"remeasure":""}">${full?confetti():""}${compact?'<span class="remeasure-ring" aria-hidden="true"></span>':""}${mImg(r.remeasure?"tap":"three")}<div class="success-copy"><span class="success-check" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 12.5l4.2 4.2L19 7"/></svg></span><h1>${r.remeasure?"Measurement added!":"Report submitted!"}</h1><p class="muted" style="margin-top:6px">${esc(TYPES[r.type].dept)} will receive it.</p></div></div>
      <div class="card row">${r.thumb?`<img class="thumb" src="${r.thumb}" alt="">`:`<span class="thumb">${typeIcon()}</span>`}<div class="t" style="flex:1"><b>${TYPES[r.type].en}</b><p class="small muted">${esc(r.dong)}, Yangcheon-gu</p></div>${r.aiAnalyzed?'<span class="chip">AI analyzed</span>':""}</div>
      <div class="card reward-pop"><p class="muted">Contribution points</p><div class="big"><span id="bigPts" class="counting-number">${fresh&&!reduced()?0:L.points}</span><small>pts</small></div><div class="ledger" style="margin-top:10px">${r.breakdown.map(([l,v])=>`<div class="li"><span>${esc(l)}</span><b>+${v}</b></div>`).join("")}</div><p class="small muted" style="margin-top:8px">Points unlock in Rewards once the district receives your report.</p></div>
      <div class="card"><div class="row between"><span class="muted">Your total</span><b id="personalTotal" class="total-update" style="font-size:20px">${fresh&&!reduced()?oldTotal:total}</b></div><div class="row between" style="margin:14px 0 8px"><span class="small">${esc(r.dong)} weekly goal</span><span class="small"><b id="successGoalCount" class="goal-count">${Math.min(fresh&&!reduced()?oldGoal:goal,WEEKLY_GOAL)}</b> of ${WEEKLY_GOAL} AI-analyzed reports</span></div><div class="meter"><i id="goalBar" style="width:${Math.min(100,(fresh&&!reduced()?oldGoal:goal)/WEEKLY_GOAL*100)}%"></i></div></div>
      <button class="btn soft" data-act="toSafety" data-id="${r.id}">Also file on Safety e-Report</button><button class="btn lg" data-go="board">View leaderboard</button><button class="btn ghost" data-go="home">Done</button>`;
    if(!fresh)return;later(()=>{count(document.querySelector("#bigPts"),0,L.points,650);count(document.querySelector("#personalTotal"),oldTotal,total,650);count(document.querySelector("#successGoalCount"),Math.min(oldGoal,WEEKLY_GOAL),Math.min(goal,WEEKLY_GOAL),650,n=>String(Math.round(n)));const bar=document.querySelector("#goalBar");if(bar)bar.style.width=`${Math.min(100,goal/WEEKLY_GOAL*100)}%`});
  };

  function rows(){const d=S.board?.dongs||{};return DONGS.map(x=>({name:x.en,pts:d[x.en]||0})).sort((a,b)=>b.pts-a.pts)}
  const contribution=(name,mine,delta,arrival)=>name===mine&&delta&&arrival?`<span class="delta contribution">+${delta} from you</span>`:"";
  window.renderBoard=function(){
    document.querySelector("#resetIn").textContent=resetText();const list=rows(),mine=S.loc?.dong||S.last?.rep?.dong||"Sinwol 1-dong",arrival=!!S.boardArrival,delta=arrival&&S.last?.rep?.dong===mine?S.last.points:0,snap=S.motionSubmit||{},oldRank=snap.previousRank||list.findIndex(x=>x.name===mine)+1,newRank=list.findIndex(x=>x.name===mine)+1,moved=arrival&&oldRank!==newRank;
    const order=[list[1],list[0],list[2]].filter(Boolean),colors={1:"var(--mustard)",2:"var(--sage-pale)",3:"var(--bronze-green)"},heights={1:"92px",2:"72px",3:"58px"},delays={2:"0ms",1:"60ms",3:"120ms"};
    const podium=`<div class="podium" aria-label="Top three neighborhoods">${order.map(row=>{const rank=list.indexOf(row)+1,me=row.name===mine;return `<div class="podium-place ${rank===1?"first":""} ${me?"me":""} ${me&&moved?"motion-rank-up":""}" style="--podium-delay:${delays[rank]};--podium-color:${colors[rank]};--podium-height:${heights[rank]}"><div class="podium-person"><span class="podium-rank">#${rank}</span><span class="podium-score board-score" data-name="${esc(row.name)}" data-score="${row.pts}">${reduced()?row.pts.toLocaleString():"0"}</span><span class="podium-name">${esc(row.name)}</span></div><div class="podium-base">${contribution(row.name,mine,delta,arrival)}</div></div>`}).join("")}</div>`;
    const rest=`<div class="leader-list">${list.slice(3).map((row,i)=>{const me=row.name===mine;return `<div class="rank ${me?"me":""} ${me&&moved?"motion-rank-up":""}"><span class="n">${i+4}</span><span class="nm">${esc(row.name)}${me?'<span class="small muted" style="display:block;font-weight:600">Your neighborhood</span>':""}</span>${contribution(row.name,mine,delta,arrival)}<span class="pts board-score" data-name="${esc(row.name)}" data-score="${row.pts}">${reduced()?row.pts.toLocaleString():"0"}</span></div>`}).join("")}</div>`;
    document.querySelector("#boardBody").innerHTML=podium+rest+(delta?`<div class="board-foot motion-contribution">${mImg("three")}<div class="banner info" style="flex:1">Your report added <b>+${delta}</b> points to ${esc(mine)}.</div></div>`:"");
    document.querySelectorAll(".board-score").forEach(el=>{const target=Number(el.dataset.score)||0,from=arrival&&el.dataset.name===mine?(snap.previousBoardScore??Math.max(0,target-delta)):0;count(el,from,target)});
    if(S.last&&arrival)S.last.boardShown=true;S.boardArrival=false;
  };


  // ===== Explicit interaction states + mission integration =====
  const baseHomeRender=window.renderHome;
  window.renderHome=function(){baseHomeRender();renderMissionSummary()};

  const previousDoneRender=window.renderDone;
  window.renderDone=function(){
    const L=S.last;if(!L)return;const r=L.rep,snap=S.motionSubmit||{},goal=rawMissionProgress(r.dong),oldGoal=snap.previousGoal??Math.max(0,goal-(L.aiOk?1:0)),total=score(),oldTotal=snap.previousTotal??Math.max(0,total-L.points),fresh=!L.motionPlayed;
    const eligible=!!L.aiOk&&!r.remeasure,advanced=eligible&&goal>oldGoal&&oldGoal<WEEKLY_GOAL,completed=oldGoal<WEEKLY_GOAL&&goal>=WEEKLY_GOAL;
    if(completed&&fresh){S.missionJustCompleted=true;const store=syncMissionStore();if(store.current){store.current.completionSeen=true;store.current.completedAt=Date.now();saveMissionStore(store)}}
    L.motionPlayed=true;
    const full=fresh&&!r.remeasure&&L.points>0,compact=fresh&&r.remeasure&&L.points>0,body=document.querySelector("#doneBody");
    body.innerHTML=`<div class="success-hero ${fresh?"fresh":""} ${r.remeasure?"remeasure":""}">${full?confetti():""}${compact?'<span class="remeasure-ring" aria-hidden="true"></span>':""}${mImg(r.remeasure?"tap":"three")}<div class="success-copy"><span class="success-check" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 12.5l4.2 4.2L19 7"/></svg></span><p class="success-eyebrow">Submission confirmed</p><h1>Report submitted!</h1><p class="muted" style="margin-top:6px">${r.remeasure?"Your valid re-measurement was added to the existing issue.":`${esc(TYPES[r.type].dept)} will receive it for review.`}</p></div></div>
      <div class="submission-not-repair"><span aria-hidden="true">i</span><div><b>Submitted for review</b><p>This confirms delivery. It does not mean the issue has been repaired yet.</p></div></div>
      <div class="card report-receipt row">${r.thumb?`<img class="thumb" src="${r.thumb}" alt="">`:`<span class="thumb">${typeIcon()}</span>`}<div class="t" style="flex:1"><b>${TYPES[r.type].en}</b><p class="small muted">${esc(r.dong)}, Yangcheon-gu</p></div>${r.aiAnalyzed?'<span class="chip">✓ AI analyzed</span>':""}</div>
      <div class="success-reward-flow">
        <div class="card reward-pop"><p class="success-card-label">Your contribution points</p><div class="big"><span aria-hidden="true">+</span><span id="bigPts" class="counting-number">${fresh&&!reduced()?0:L.points}</span><small>pts</small></div><div class="ledger" style="margin-top:10px">${r.breakdown.map(([l,v])=>`<div class="li"><span>${esc(l)}</span><b>+${v}</b></div>`).join("")}</div></div>
        <span class="reward-connector" aria-hidden="true">↓</span>
        <div class="card mission-result ${completed?"completed":advanced?"advanced":"unchanged"}">
          <div class="row between"><div><p class="success-card-label">Shared weekly mission</p><h3>${completed?"Mission complete":advanced?"+1 eligible report":"No mission change"}</h3></div><span class="mission-result-icon" aria-hidden="true">${completed?"✓":advanced?"↑":"—"}</span></div>
          <div class="row between mission-result-count"><span>${esc(r.dong)}</span><b><span id="successGoalCount">${fresh&&!reduced()?Math.min(oldGoal,WEEKLY_GOAL):Math.min(goal,WEEKLY_GOAL)}</span> / ${WEEKLY_GOAL}</b></div>
          <div class="meter"><i id="goalBar" style="width:${Math.min(100,(fresh&&!reduced()?oldGoal:goal)/WEEKLY_GOAL*100)}%"></i></div>
          <p>${completed?"Recognition only—mission completion adds no bonus points.":advanced?"Your eligible report moved the neighborhood goal.":r.remeasure?"Re-measurements earn their existing points but do not advance the mission.":"This report was not eligible for weekly mission progress."}</p>
        </div>
      </div>
      <div class="card personal-total"><span>Personal points total</span><b id="personalTotal" class="total-update">${fresh&&!reduced()?oldTotal:total}</b></div>
      <button class="btn soft" data-act="toSafety" data-id="${r.id}">Also file on Safety e-Report</button><button class="btn lg" data-go="board">View weekly leaderboard</button><button class="btn ghost" data-go="home">Done</button>`;
    syncMissionStore();
    if(!fresh)return;
    later(()=>{count(document.querySelector("#bigPts"),0,L.points,650);count(document.querySelector("#personalTotal"),oldTotal,total,650);count(document.querySelector("#successGoalCount"),Math.min(oldGoal,WEEKLY_GOAL),Math.min(goal,WEEKLY_GOAL),650,n=>String(Math.round(n)));const bar=document.querySelector("#goalBar");if(bar)bar.style.width=`${Math.min(100,goal/WEEKLY_GOAL*100)}%`});
  };

  const missionBoardRender=window.renderBoard;
  window.renderBoard=function(){
    missionBoardRender();
    const body=document.querySelector("#boardBody"),m=missionSnapshot();if(!body)return;
    body.insertAdjacentHTML("afterbegin",`<button class="board-mission-strip" data-go="mission"><span><small>Shared weekly mission</small><b>${m.progress} / ${WEEKLY_GOAL} eligible reports</b></span><span class="mission-status">${missionLabels[m.status]}</span><span aria-hidden="true">→</span></button>`);
  };

  const baseShopRender=window.renderShop;
  window.renderShop=function(){
    baseShopRender();
    document.querySelectorAll("#shopList .reward").forEach(card=>{
      const button=card.querySelector("button"),available=!button?.disabled;
      card.classList.toggle("reward-available",available);card.classList.toggle("reward-locked",!available);
      if(button){button.setAttribute("aria-disabled",String(!available));button.insertAdjacentHTML("beforebegin",`<span class="reward-state">${available?"Available":`Need ${Math.max(0,(Number(button.textContent.match(/\d+/)?.[0])||0)-spendable())} more`}</span>`)}
    });
  };

  function installPressFeedback(){
    const selector='button,[role="button"],.item,.pin';
    const clear=el=>el?.classList?.remove("is-pressed");
    document.addEventListener("pointerdown",e=>{const el=e.target.closest(selector);if(!el||el.disabled||el.getAttribute("aria-disabled")==="true")return;el.classList.add("is-pressed")},true);
    ["pointerup","pointercancel","lostpointercapture"].forEach(type=>document.addEventListener(type,e=>clear(e.target.closest?.(selector)),true));
    document.addEventListener("pointerleave",e=>{if(e.buttons)clear(e.target.closest?.(selector))},true);
    document.addEventListener("keydown",e=>{if((e.key===" "||e.key==="Enter")&&e.target.matches(selector)&&!e.target.disabled)e.target.classList.add("is-pressed")},true);
    document.addEventListener("keyup",e=>{if(e.key===" "||e.key==="Enter")clear(e.target)},true);
    addEventListener("blur",()=>document.querySelectorAll(".is-pressed").forEach(clear));
  }
  installPressFeedback();

  document.addEventListener("focusin",e=>{const field=e.target.closest("#reviewBody .f,#reviewBody .card");if(field)field.classList.add("is-editing")});
  document.addEventListener("focusout",e=>{const field=e.target.closest("#reviewBody .f,#reviewBody .card");if(field)field.classList.remove("is-editing")});
  document.addEventListener("click",e=>{
    const redeem=e.target.closest('[data-act="redeem"]');if(redeem&&!redeem.disabled){redeem.classList.add("is-loading");redeem.setAttribute("aria-busy","true");redeem.innerHTML='<span class="motion-spinner" aria-hidden="true"></span><span>Redeeming</span>'}
  },true);

  if(!S.screen)S.screen="home";enterHome();renderMissionSummary();
})();
