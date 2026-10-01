/* BaroGochyeo — app shell: splash, welcome, demo sign-in, Me, personal missions, Achievement Coins, score explainer.
   Authentication goes through BGAuth (auth-mock.js); all numbers come from BGProgress (progress.js). */
(() => {
  "use strict";
  const q = s => document.querySelector(s);
  const J = window.BGJuice, P = window.BGProgress, A = window.BGAuth;
  const fmt = n => Math.round(n).toLocaleString();
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ICON = {
    info: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5h.01"/></svg>',
    back: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M15 5l-7 7 7 7"/></svg>',
    check: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 12.5l4.2 4.2L19 7"/></svg>',
    lock: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="5" y="11" width="14" height="9" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
    dot: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l2.5 2"/></svg>',
    doc: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/></svg>',
    gift: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="8" width="18" height="13" rx="3"/><path d="M12 8v13M3 12h18M12 8c-2-4-6-4-6-1s6 1 6 1 6 2 6-1-4-3-6 1"/></svg>',
    m_detail: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 15l2 2 4-4"/></svg>',
    m_review: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M6 17V11a6 6 0 0 1 12 0v6l2 2H4z"/><path d="M10 21h4"/></svg>',
    m_shared: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="9" cy="9" r="3"/><circle cx="17" cy="10" r="2.3"/><path d="M3 20c.7-3.4 3-5 6-5s5.300 1.600 6 5M15.500 15.200c2.700-.4 4.700.900 5.500 3.800"/></svg>',
    sound: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 10v4h3l5 4V6L7 10z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/></svg>'
  };
  const COIN_IDS = ["first-report", "measured", "follow-through", "issue-resolved"];
  const coinArt = (id, earned, cls = "") => `<img class="coin-art ${cls}" src="assets/coins/${id}-${earned ? "earned" : "locked"}.png" alt="" width="1254" height="1254">`;

  /* ================= Optional sound + haptics ================= */
  const SOUND_KEY = "bg_sound";
  const soundOn = () => { try{ return localStorage.getItem(SOUND_KEY) === "1"; }catch{ return false; } };
  let ctx = null;
  const TONES = {tap: [[620, .03, .025]], shutter: [[980, .05, .05]], detect: [[740, .07, .05], [988, .1, .05]], tick: [[784, .09, .05]],
    success: [[523, .09, .06], [659, .09, .06], [784, .16, .06]], unlock: [[659, .08, .06], [880, .08, .06], [1047, .2, .06]], error: [[233, .16, .05]]};
  const BUZZ = {detect: 18, success: [20, 40, 30], unlock: [20, 40, 30], error: 40, tick: 12};
  function cue(name){
    if(BUZZ[name] && navigator.vibrate && !reduced()) try{ navigator.vibrate(BUZZ[name]); }catch{}
    if(!soundOn() || !TONES[name]) return;
    try{
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); if(ctx.state === "suspended") ctx.resume();
      let t = ctx.currentTime;
      for(const [hz, dur, vol] of TONES[name]){ const o = ctx.createOscillator(), g = ctx.createGain(); o.type = "sine"; o.frequency.value = hz;
        g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur); o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + dur + .02); t += dur; }
    }catch{}
  }
  window.BGFx = {cue, soundOn, setSound: on => { try{ localStorage.setItem(SOUND_KEY, on ? "1" : "0"); }catch{} }};

  const gate = q("#gate"), app = q("#app");

  /* ================= Private progress (per namespace) ================= */
  const blank = () => ({id: "progress", kind: "progress", seen: {}, reviewWeeks: [], fullWeeks: [], badgesSeen: null, badgeAt: {}, coinsVersion: 0, coins: {}});
  const progress = () => ({...blank(), ...(S.mine.get("progress") || {})});
  const weekStartMs = () => weekStart() - 9 * 3600e3; /* Monday 00:00 KST as a real timestamp */
  const prevWeekKey = () => new Date(weekStart() - P.WEEK_MS).toISOString().slice(0, 10);
  const statusNow = r => r.reversed ? "rejected" : issueStatus(r);
  const hasUpdate = r => statusNow(r) !== (progress().seen?.[r.id] ?? "submitted");
  const coinList = c => P.coins(c);
  const context = (p = progress()) => ({reports: myReports(), statusOf: statusNow, weekStart: weekStartMs(), progress: p, week: weekKey(), prevWeek: prevWeekKey(), sharedProgress: P.goalProgress(S.board, myDong()), hasUpdate});
  const LEGACY_IDS = {first:"first-report", "first-report":"first-report", measured:"measured", follow:"follow-through", "follow-through":"follow-through", repaired:"issue-resolved", "repair-made":"issue-resolved", "problem-solved":"issue-resolved", "issue-resolved":"issue-resolved"};
  function migrateCoins(p){
    if(p.coinsVersion >= 1) return p;
    const coins = {...(p.coins || {})}, seen = p.badgesSeen || [], dates = p.badgeAt || {};
    for(const [old, id] of Object.entries(LEGACY_IDS)){
      const oldData = p.badges?.[old] || p.achievements?.[old];
      if(!seen.includes(old) && !dates[old] && !oldData?.earned) continue;
      const prev = coins[id] || {};
      coins[id] = {...prev, id, progress: 1, earned: true, earnedAt: prev.earnedAt || oldData?.earnedAt || dates[old] || null,
        celebrationSeen: true, detailViewed: prev.detailViewed ?? true};
    }
    if((p.reviewWeeks || []).length && !coins["follow-through"]?.earned)
      coins["follow-through"] = {id:"follow-through", progress:1, earned:true, earnedAt:null, celebrationSeen:true, detailViewed:true};
    for(const b of coinList(context({...p, coins}))){
      if(b.earned && !coins[b.id]?.earned) coins[b.id] = {id:b.id, progress:1, earned:true, earnedAt:null, celebrationSeen:true, detailViewed:true};
    }
    for(const id of COIN_IDS) if(!coins[id]) coins[id] = {id, progress:0, earned:false, earnedAt:null, celebrationSeen:false, detailViewed:false};
    const next = {...p, coinsVersion:1, coins}; saveMine(next); return next;
  }

  /* Called when a report detail opens. The "check a status change" mission only counts when the
     status differs from what this person saw last time, and only once per visit. */
  function noteViewed(r, st){
    const p = progress(), seen = p.seen[r.id] ?? "submitted";
    if(!S.detailVisit || S.detailVisit.id !== r.id) S.detailVisit = {id: r.id, first: true, change: null};
    const v = S.detailVisit;
    if(st !== seen){
      const next = {...p, seen: {...p.seen, [r.id]: st}};
      if(v.first){
        v.change = {from: seen, to: st};
        if(!next.reviewWeeks.includes(weekKey())){ next.reviewWeeks = [...next.reviewWeeks, weekKey()]; setTimeout(() => { toast("Status checked. Weekly mission complete."); cue("tick"); }, 300); }
        next.followUpSeen = true;
        J.announce(`Status update. This report is now ${STATUS_LABEL[st] || st}.`);
      }
      saveMine(next);
    }
    v.first = false;
    return v.change && v.change.to === st ? v.change : null;
  }
  /* Persist the transition before showing it, so refresh and Success re-entry cannot replay it. */
  function collectUnlocks(){
    if(!S.mineReady) return [];
    const p = migrateCoins(progress()); let dirty = false;
    if(P.missions(context(p)).every(m => m.done) && !p.fullWeeks.includes(weekKey())){ p.fullWeeks = [...p.fullWeeks, weekKey()]; dirty = true; }
    const fresh = [];
    for(const b of coinList(context(p))){
      const old = p.coins[b.id] || {id:b.id, progress:0, earned:false, earnedAt:null, celebrationSeen:false, detailViewed:false};
      const next = {...old, progress:b.earned ? 1 : b.have, earned:!!b.earned};
      if(b.earned && !old.earned){ next.earnedAt = Date.now(); next.celebrationSeen = true; next.detailViewed = false; fresh.push({...b, at:next.earnedAt}); }
      if(JSON.stringify(old) !== JSON.stringify(next)){ p.coins[b.id] = next; dirty = true; }
    }
    if(fresh.length) S.justUnlocked = {ids: fresh.map(b => b.id), at: Date.now()};
    if(dirty) saveMine(p);
    return fresh;
  }
  /* First time a namespace is seen: record what is already earned, without celebrating it. */
  function ensureBaseline(){
    if(!S.mineReady || S.mine.has("progress") || !S.uid) return;
    const p = blank(); p.coinsVersion = 1;
    for(const b of coinList(context(p))) p.coins[b.id] = {id:b.id, progress:b.earned ? 1 : 0, earned:b.earned, earnedAt:null, celebrationSeen:b.earned, detailViewed:b.earned};
    saveMine(p);
  }
  const baseRender = window.render;
  window.render = function(){ baseRender(); ensureBaseline(); if(S.mineReady && S.mine.has("progress")) migrateCoins(progress()); };

  /* ================= Score explainer ================= */
  function scoreInfo(){
    const sc = scores(), st = P.standing(S.board, DONGS.map(d => d.en), myDong()), goal = Math.min(P.goalProgress(S.board, myDong()), WEEKLY_GOAL);
    const row = (name, val, note) => `<li><div><b>${name}</b><small>${note}</small></div><span class="num">${val}</span></li>`;
    openSheet(`<h2>How scores work</h2><p class="muted small" style="margin:6px 0 14px">Five separate measurements. None of them is a copy of another.</p>
      <p class="info-group">Private to you</p><ul class="info-list">
        ${row("Available points", fmt(sc.available), "Ready to spend on rewards. Points unlock once the district receives a report.")}
        ${row("Total contribution", fmt(sc.total), "Everything you have earned, including pending and already spent points.")}
        ${row("This week", fmt(sc.week), "Points from your reports since Monday (KST).")}</ul>
      <p class="info-group">Public, by neighborhood</p><ul class="info-list">
        ${row("Neighborhood score", fmt(st.score), `Points from all reports in ${esc(myDong())} this week. It decides the ranking.`)}
        ${row("Mission progress", `${goal} / ${WEEKLY_GOAL}`, "A count of eligible new reports, not points. One report adds one.")}</ul>
      <p class="muted small" style="margin:12px 0 16px">One eligible report usually gives you +30 points, adds +30 to the neighborhood score and +1 to the mission. Re-measurements give +5 and never move the mission.</p>
      <button class="btn" data-act="closeSheet">Got it</button>`);
  }

  /* ================= Me ================= */
  const stateText = m => m.done ? "Completed" : `${m.count} / 1`;
  const COIN_STATE = {earned: "Earned", progress: "In progress", new: "Not started"};
  const coinBits = () => `<span class="coin-particles" aria-hidden="true">${[0,1,2,3,4,5].map(i => `<i style="--a:${i * 60}deg"></i>`).join("")}</span>`;
  function objective(m){
    return `<li class="obj ${m.done ? "done" : ""} ${m.recommended ? "rec" : ""}"><span class="obj-icon i-${m.id}" aria-hidden="true">${ICON["m_" + m.id]}</span>
      <div class="obj-copy"><b>${esc(m.title)}</b><small>${esc(m.note)}</small></div>
      <span class="obj-state num">${m.done ? `<span class="obj-check" aria-hidden="true">${ICON.check}</span>` : ""}${stateText(m)}</span>
      ${m.recommended ? `<button class="btn small obj-cta" data-go="${m.action.go}">${m.action.label}</button>` : ""}</li>`;
  }
  /* Home shows one recommended personal mission only; the full list lives in Me. */
  function renderNext(){
    const box = q("#nextMission"); if(!box) return; if(!S.mineReady){ box.innerHTML = ""; return; }
    const ms = P.missions(context()), left = ms.filter(m => !m.done), m = ms.find(x => x.recommended) || left[0];
    box.innerHTML = !m ? `<section class="next-mission all-done" aria-label="Your missions"><span class="obj-icon done" aria-hidden="true">${ICON.check}</span><div class="nm-copy"><span class="nm-kicker">Your missions</span><b>All 3 done this week</b></div><button class="btn small soft" data-go="me">View</button></section>`
      : `<section class="next-mission" aria-label="Your next mission"><span class="obj-icon i-${m.id}" aria-hidden="true">${ICON["m_" + m.id]}</span>
        <div class="nm-copy"><span class="nm-kicker">Your next mission</span><b>${esc(m.title)}</b><span class="nm-count num" aria-label="${m.count} of 1 done">${m.count} / 1</span></div>
        ${m.recommended ? `<button class="btn small" data-go="${m.action.go}" aria-label="${m.action.label}">${m.action.short}</button>` : `<button class="btn small soft" data-go="me">Details</button>`}</section>`;
  }
  const baseHome = window.renderHome;
  function renderNewCoinHome(){
    const box = q("#newCoinHome"); if(!box) return; if(!S.mineReady){ box.innerHTML = ""; return; }
    const p = progress(), b = coinList(context(p)).find(c => c.earned && !p.coins?.[c.id]?.detailViewed && !p.coins?.[c.id]?.homeDismissed);
    box.innerHTML = b ? `<div class="new-coin-home">${coinArt(b.id,true)}<span>New Achievement Coin<b>${esc(b.name)}</b></span><button class="btn small soft" data-shell="coin" data-id="${b.id}">View</button><button class="icon-btn" data-shell="dismissCoin" data-id="${b.id}" aria-label="Dismiss ${esc(b.name)} notification">×</button></div>` : "";
  }
  window.renderHome = function(){ baseHome(); renderNext(); renderNewCoinHome(); };
  function coinTile(b){
    const line = COIN_STATE[b.state];
    return `<li><button class="coin-btn ${b.state}" data-shell="coin" data-id="${b.id}" aria-label="${esc(b.name)} Achievement Coin, ${line}${b.state === "progress" ? `, ${b.have} of ${b.need}` : ""}. Open details.">
      ${coinArt(b.id, b.earned)}<b>${esc(b.name)}</b><span class="coin-state">${line}</span>${b.state === "progress" ? `<small class="coin-progress">${b.have} / ${b.need}</small>` : ""}${b.earned && !b.viewed ? `<span class="coin-new">New</span>` : ""}</button></li>`;
  }
  const dateText = t => new Date(t).toLocaleDateString("en-US", {month: "long", day: "numeric", year: "numeric"});
  function coinSheet(id){
    const b = coinList(context()).find(x => x.id === id); if(!b) return;
    const p = progress(), old = p.coins[id] || {};
    if(b.earned && !old.detailViewed){ p.coins = {...p.coins, [id]:{...old, detailViewed:true}}; saveMine(p); renderNewCoinHome(); }
    openSheet(`<div class="coin-sheet ${b.state}">
      ${coinArt(b.id, b.earned, "large")}
      <h2>${esc(b.name)}</h2><p class="coin-field-label">Meaning</p><p id="coinDescription" class="coin-meaning">${esc(b.note)}</p>
      <dl class="coin-facts"><div><dt>How to unlock</dt><dd>${esc(b.req)}</dd></div><div><dt>Progress</dt><dd>${b.have} / ${b.need}</dd></div><div><dt>Status</dt><dd>${b.earned ? b.at ? `Earned on ${dateText(b.at)}` : "Earned" : COIN_STATE[b.state]}</dd></div></dl></div>
      <button class="btn" data-act="closeSheet">Close</button>`);
    q("#sheet").setAttribute("aria-describedby", "coinDescription");
  }
  function coinInfo(){ openSheet(`<h2>Achievement Coins</h2><p id="coinDescription" class="coin-meaning">Achievement Coins celebrate lasting contributions. They are separate from points and do not reset.</p><button class="btn" data-act="closeSheet">Close</button>`); q("#sheet").setAttribute("aria-describedby", "coinDescription"); }
  function unlockCard(b){
    return `<section class="coin-unlock" aria-label="Achievement Coin earned"><div class="coin-flip" data-id="${b.id}" aria-hidden="true">${coinArt(b.id,false,"coin-silver")}${coinArt(b.id,true,"coin-color")}${coinBits()}</div><div class="coin-unlock-copy"><p>Achievement Coin earned</p><h3>${esc(b.name)}</h3></div><button class="btn small soft" data-shell="coin" data-id="${b.id}">View</button></section>`;
  }
  function celebrateCoins(list){ if(!list.length) return; cue("unlock"); J.announce(`Achievement Coin earned: ${list.map(b=>b.name).join(", ")}`); }
  function markMeasurement(cm){
    if(!(cm > 1 && cm < 2000) || !S.mineReady) return null;
    const p = migrateCoins(progress()), id = "measured";
    if(p.coins[id]?.earned) return null;
    p.coins = {...p.coins, [id]:{id, progress:1, earned:true, earnedAt:Date.now(), celebrationSeen:true, detailViewed:false}};
    saveMine(p);
    return coinList(context(p)).find(b => b.id === id);
  }
  function avatar(style, cls = ""){ return `<span class="avatar av-${esc(style || "sage")} ${cls}" aria-hidden="true"><img src="${MASCOT.front}" alt=""></span>`; }
  function renderMe(){
    const body = q("#meBody"); if(!body) return;
    const fresh = collectUnlocks();
    const me = A.session(), sc = scores(), c = context(), ms = P.missions(c), bs = coinList(c), last = P.lastWeek(c);
    const reports = myReports(), updates = reports.filter(hasUpdate).length, earned = bs.filter(b => b.earned).length;
    const open = document.activeElement?.closest?.("#meBody [data-shell]")?.dataset.shell;
    body.innerHTML = `
      ${me ? `<section class="card profile" aria-label="Profile">${avatar(me.avatar)}<div class="profile-copy"><h3>${esc(me.name)}</h3><p class="small muted">${esc(me.email)}</p>
          <p class="profile-chips"><span class="chip">${esc(me.dong)}</span><span class="chip demo-chip">Demo account</span></p></div></section>`
        : `<section class="card profile guest" aria-label="Guest">${avatar("sage")}<div class="profile-copy"><h3>You're a guest</h3><p class="small muted">Reporting works without an account. A demo profile adds a name and a home neighborhood.</p>
          <div class="profile-actions"><button class="btn small" data-shell="register">Create account</button><button class="btn small soft" data-shell="login">Log in</button></div></div></section>`}
      <section class="card" aria-label="My points">
        <div class="section-head" style="margin:0"><h3>My points</h3><button class="icon-btn info-btn" data-act="scoreInfo" aria-label="How points and scores work">${ICON.info}</button></div>
        <div class="stat-main"><span>Available points</span><b class="num">${fmt(sc.available)}</b>${sc.pending ? `<small>+${fmt(sc.pending)} pending until the district receives your report</small>` : ""}</div>
        <div class="stat-row"><div><span>This week</span><b class="num">+${fmt(sc.week)}</b></div>${sc.total !== sc.available ? `<div><span>Total contribution</span><b class="num">${fmt(sc.total)}</b></div>` : ""}
           <div><span>Eligible reports</span><b class="num">${sc.eligibleWeek}<small> this week</small></b></div></div>
         <p class="coin-summary">Achievement Coins <b>${earned} / 4</b></p>
      </section>
      <section aria-label="Weekly missions">
        <div class="section-head"><h3>Weekly missions</h3><span class="small muted">${J.shortLeft(new Date(weekKey() + "T00:00:00+09:00").getTime() + P.WEEK_MS - Date.now())}</span></div>
        <ul class="obj-list">${ms.map(objective).join("")}</ul>
        ${last ? `<details class="lastweek"><summary>Last week · ${last.completed} of ${last.total} completed</summary><ul>${last.items.map(i => `<li><span>${esc(i.title)}</span><b class="${i.done ? "ok" : "gone"}">${i.done ? "Completed" : "Expired"}</b></li>`).join("")}</ul></details>` : ""}
        <p class="obj-foot">Recognition only. No points, one completion each per week.</p>
        ${me ? "" : `<p class="obj-foot guest-note">Sign in to keep your progress across sessions.</p>`}
      </section>
       <section class="coin-shelf" aria-label="Achievement Coins">
         <div class="section-head"><h3>Achievement Coins</h3><span class="coin-count">${earned} of 4 earned</span><button class="icon-btn info-btn" data-shell="coinInfo" aria-label="About Achievement Coins">${ICON.info}</button></div>
         <ul class="coin-grid">${bs.map(coinTile).join("")}</ul>
      </section>
      <section class="menu" aria-label="My activity">
        <button class="item" data-go="reports"><span class="thumb">${ICON.doc}</span><span class="t"><b>My reports</b><span class="small muted">${reports.length} report${reports.length === 1 ? "" : "s"}</span></span>${updates ? `<span class="chip update-chip">${updates} update${updates > 1 ? "s" : ""}</span>` : ""}<span aria-hidden="true">→</span></button>
        <button class="item" data-go="shop"><span class="thumb">${ICON.gift}</span><span class="t"><b>Rewards</b><span class="small muted">${fmt(sc.available)} points available</span></span><span aria-hidden="true">→</span></button>
      </section>
      <section class="card settings" aria-label="Settings">
        <div class="setting"><span class="thumb sm">${ICON.sound}</span><span class="t"><b id="soundLabel">Sound effects</b><span class="small muted">Off by default. Remembered on this device.</span></span>
          <button class="switch" role="switch" aria-checked="${soundOn()}" aria-labelledby="soundLabel" data-shell="sound"><i></i></button></div>
      </section>
      ${me ? `<button class="btn ghost" data-shell="logout">Log out</button>` : ""}
      <div class="prototype-note" role="note"><b>Local prototype</b><span>${me ? "This demo profile and its reports live only in this browser. Nothing is synced or password-protected." : "Guest reports live only in this browser."}</span></div>`;
    if(open) body.querySelector(`[data-shell="${open}"]`)?.focus({preventScroll: true});
     if(fresh.length){ celebrateCoins(fresh); if(S.screen === "me" && !q("#veil").classList.contains("on") && gate.hidden) coinSheet(fresh[0].id); }
  }
  window.renderMe = renderMe;

  /* ================= Gate: splash, welcome, demo sign-in ================= */
  let gateReturn = "home", gateFrom = null;
  function openGate(html, cls){
    gate.className = "gate " + cls; gate.innerHTML = html; gate.hidden = false; gate.scrollTop = 0;
    app.inert = true; q("#tabbar").inert = true; document.body.style.overflow = "hidden";
    setTimeout(() => gate.querySelector("h1")?.focus({preventScroll: true}), 40);
  }
  function closeGate(then){
    const done = () => { gate.hidden = true; gate.innerHTML = ""; gate.className = "gate"; app.inert = false; q("#tabbar").inert = false; document.body.style.overflow = ""; then?.(); gateFrom?.focus?.({preventScroll: true}); gateFrom = null; };
    if(reduced()) return done();
    gate.classList.add("leaving"); setTimeout(done, 240);
  }
  function splash(){
    openGate(`<div class="splash" role="img" aria-label="BaroGochyeo"><img class="mascot" src="${MASCOT.front}" alt=""><p class="wordmark" lang="ko">바로고쳐</p><span class="splash-line"></span></div>`, "gate-splash");
    setTimeout(() => { if(A.entered()) closeGate(() => J.enterHome()); else welcome(); }, reduced() ? 800 : 1050);
  }
  const DEMO_NOTE = `<p class="demo-note" role="note"><b>Local prototype</b> Sign-in is simulated. No password, no server, no sync: profiles stay in this browser.</p>`;
  function welcome(){
    gateReturn = "home";
    openGate(`<div class="welcome"><img class="mascot" src="${MASCOT.walk}" alt="">
        <p class="wordmark" lang="ko">바로고쳐</p><h1 tabindex="-1">See a hazard. Snap it. Get it fixed.</h1></div>
      <div class="gate-actions"><button class="btn lg" data-shell="register">Create account</button><button class="btn lg soft" data-shell="login">Log in</button>
        <button class="btn ghost" data-shell="guest">Continue as guest</button>${DEMO_NOTE}</div>`, "gate-welcome");
  }
  const gateTop = title => `<div class="top"><button class="back" data-shell="gateBack" aria-label="Back">${ICON.back}</button><h1 tabindex="-1">${title}</h1></div>`;
  async function guestHasData(){
    try{ const snap = await S.db?.collection(`data/users/${A.GUEST_NS}`).get(); return !!snap?.docs.some(d => { const p=d.data(); return ["report", "redemption"].includes(p?.kind) || (p?.kind === "progress" && (Object.values(p.coins || {}).some(c => c.earned) || (p.reviewWeeks || []).length || (p.fullWeeks || []).length || (p.badgesSeen || []).length)); }); }catch{ return false; }
  }
  async function registerView(){
    const keep = !A.session() && await guestHasData(), home = myDong();
    openGate(`${gateTop("Create account")}
      <form class="gate-form" data-form="register" novalidate>
        <div class="form-error" role="alert" hidden></div>
        <div class="field"><label for="rName">Display name</label><input id="rName" name="name" type="text" autocomplete="nickname" maxlength="24" required></div>
        <div class="field"><label for="rEmail">Email-shaped demo ID</label><input id="rEmail" name="email" type="email" inputmode="email" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="you@example.com" required><p class="field-hint">Used as a label only. No email is sent.</p></div>
        <div class="field"><label for="rDong">Neighborhood</label><select id="rDong" name="dong">${DONGS.map(d => `<option ${d.en === home ? "selected" : ""}>${esc(d.en)}</option>`).join("")}</select></div>
        <fieldset class="field"><legend>Profile style</legend><div class="avatar-pick">${A.AVATARS.map((a, i) => `<label><input type="radio" name="avatar" value="${a}" ${i ? "" : "checked"}><span class="sr-only">${a}</span>${avatar(a)}</label>`).join("")}</div></fieldset>
         ${keep ? `<label class="check"><input type="checkbox" name="keep" checked><span><b>Keep my current reports and progress</b><small>Moves your guest reports, points, missions and Achievement Coins into this account, once.</small></span></label>` : ""}
        <button class="btn lg" type="submit">Create account</button>${DEMO_NOTE}
      </form>`, "gate-form-view");
  }
  function loginView(){
    const list = A.accounts();
    openGate(`${gateTop("Log in")}
      <form class="gate-form" data-form="login" novalidate>
        <div class="form-error" role="alert" hidden></div>
        ${list.length ? `<div class="field"><span class="field-label" id="pickLabel">Demo profiles on this device</span><div class="acct-list" role="group" aria-labelledby="pickLabel">${list.map(a => `<button type="button" class="item" data-shell="pickAccount" data-email="${esc(a.email)}">${avatar(a.avatar, "sm")}<span class="t"><b>${esc(a.name)}</b><span class="small muted">${esc(a.email)}</span></span><span aria-hidden="true">→</span></button>`).join("")}</div></div>` : `<div class="banner info"><span>No demo profiles on this device yet. Create one first.</span></div>`}
        <div class="field"><label for="lEmail">${list.length ? "Or enter a demo ID" : "Demo ID"}</label><input id="lEmail" name="email" type="email" inputmode="email" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="you@example.com"></div>
        <button class="btn lg" type="submit">Log in</button>
        <button class="btn ghost" type="button" data-shell="register">Create account instead</button>${DEMO_NOTE}
      </form>`, "gate-form-view");
  }
  function formError(form, err){
    form.querySelectorAll("[aria-invalid]").forEach(el => { el.removeAttribute("aria-invalid"); el.removeAttribute("aria-describedby"); });
    form.querySelectorAll(".field-error").forEach(el => el.remove());
    const box = form.querySelector(".form-error"); box.hidden = true; box.textContent = "";
    if(!err) return;
    const input = err.field && form.elements[err.field];
    if(input && input.insertAdjacentHTML){ input.setAttribute("aria-invalid", "true"); input.setAttribute("aria-describedby", "fe_" + err.field);
      input.closest(".field").insertAdjacentHTML("beforeend", `<p class="field-error" id="fe_${err.field}">${esc(err.message)}</p>`); input.focus(); }
    else { box.hidden = false; box.textContent = err.message || "Something went wrong. Try again."; }
    J.announce(err.message || "Something went wrong."); cue("error");
  }
  function busy(btn, on, label){
    if(on){ btn.dataset.label = btn.textContent; btn.disabled = true; btn.setAttribute("aria-busy", "true"); btn.classList.add("is-loading"); btn.innerHTML = `<span class="motion-spinner" aria-hidden="true"></span><span>${label}</span>`; }
    else { btn.disabled = false; btn.removeAttribute("aria-busy"); btn.classList.remove("is-loading"); btn.textContent = btn.dataset.label || "Continue"; }
  }
  /* Moves (never copies) the guest's private documents into a new account's namespace. */
  async function migrateGuest(toNs){
    const from = `data/users/${A.GUEST_NS}`, snap = await S.db.collection(from).get(); let n = 0;
    for(const d of snap.docs){ await S.db.doc(`data/users/${toNs}/${d.id}`).set(d.data()); await S.db.doc(`${from}/${d.id}`).delete(); n++; }
    return n;
  }
  function entered(acct, msg){
    BG.bindUser(A.namespace());
    gate.innerHTML = `<div class="splash done" role="status"><span class="success-check">${ICON.check}</span><h1 tabindex="-1">${esc(msg)}</h1><p class="muted">${esc(acct.dong)}</p></div>`; gate.className = "gate gate-splash";
    cue("success"); J.announce(msg);
    setTimeout(() => closeGate(() => { window.go(gateReturn); if(gateReturn === "home") J.enterHome(); }), reduced() ? 500 : 900);
  }
  async function submitForm(form){
    const kind = form.dataset.form, btn = form.querySelector('[type="submit"]'), f = Object.fromEntries(new FormData(form));
    formError(form, null);
    const bad = A.validate(f, kind === "register"); if(bad) return formError(form, bad);
    busy(btn, true, kind === "register" ? "Creating profile…" : "Logging in…");
    try{
      const acct = kind === "register" ? await A.register(f) : await A.signIn(f);
      let moved = 0;
      if(kind === "register" && f.keep){ moved = await migrateGuest(A.namespace()); A.update({migratedGuest: true}); }
      entered(acct, kind === "register" ? `Welcome, ${acct.name}${moved ? ". Your reports came with you." : ""}` : `Welcome back, ${acct.name}`);
    }catch(err){ busy(btn, false); formError(form, err?.message ? err : {message: "Couldn't finish. Try again."}); }
  }
  gate.addEventListener("submit", e => { e.preventDefault(); submitForm(e.target); });
  gate.addEventListener("input", e => { const el = e.target; if(el.getAttribute?.("aria-invalid")){ el.removeAttribute("aria-invalid"); el.closest(".field")?.querySelector(".field-error")?.remove(); } });
  /* Keep the focused field visible above the on-screen keyboard. */
  const reveal = el => setTimeout(() => el.scrollIntoView({block: "center", behavior: reduced() ? "auto" : "smooth"}), 280);
  document.addEventListener("focusin", e => { if(e.target.matches?.("input:not([type=radio]):not([type=checkbox]),textarea,select")) reveal(e.target); });
  window.visualViewport?.addEventListener("resize", () => { const el = document.activeElement; if(el?.matches?.("input,textarea")) reveal(el); });

  document.addEventListener("click", async e => {
    const el = e.target.closest("[data-shell]"); if(!el) return; const a = el.dataset.shell;
    if(a === "register" || a === "login"){ if(gate.hidden){ gateReturn = "me"; gateFrom = el; } return a === "register" ? registerView() : loginView(); }
    if(a === "guest"){ A.continueAsGuest(); return closeGate(() => J.enterHome()); }
    if(a === "gateBack"){ if(A.entered()) return closeGate(); return welcome(); }
    if(a === "pickAccount"){ const form = el.closest("form"); form.elements.email.value = el.dataset.email; return submitForm(form); }
    if(a === "coin") return coinSheet(el.dataset.id);
    if(a === "coinInfo") return coinInfo();
    if(a === "dismissCoin"){ const p=progress(), old=p.coins?.[el.dataset.id]; if(old){ p.coins={...p.coins,[el.dataset.id]:{...old,homeDismissed:true}}; saveMine(p); renderNewCoinHome(); } return; }
    if(a === "sound"){ const on = !soundOn(); window.BGFx.setSound(on); el.setAttribute("aria-checked", String(on)); if(on) cue("tick"); J.announce(on ? "Sound effects on" : "Sound effects off"); return; }
    if(a === "logout"){ busy(el, true, "Logging out…"); await A.signOut(); BG.bindUser(A.namespace()); window.go("me"); toast("Logged out. You're browsing as a guest."); return; }
  });
  document.addEventListener("keydown", e => {
    if(gate.hidden) return;
    if(e.key === "Escape" && gate.classList.contains("gate-form-view")){ if(A.entered()) closeGate(); else welcome(); }
    if(e.key === "Tab"){ const f = [...gate.querySelectorAll("button,input,select,a[href]")].filter(x => !x.disabled && x.offsetParent); if(!f.length) return e.preventDefault();
      if(!gate.contains(document.activeElement)){ e.preventDefault(); f[0].focus(); } else if(e.shiftKey && document.activeElement === f[0]){ e.preventDefault(); f.at(-1).focus(); } else if(!e.shiftKey && document.activeElement === f.at(-1)){ e.preventDefault(); f[0].focus(); } }
  });

  window.BGShell = {hasUpdate, noteViewed, collectUnlocks, markMeasurement, scoreInfo, coinArt, unlockCard, celebrateCoins, coinSheet, renderMe, renderNext, splash, welcome};
  splash();
})();
