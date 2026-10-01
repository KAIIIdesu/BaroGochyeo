/* BaroGochyeo — motion, mission, success and neighborhood layer.
   Wraps the core functions in index.html (go, openScan, handlePhoto, submit, renderDone, renderBoard). */
(() => {
  "use strict";
  const q = s => document.querySelector(s);
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const later = fn => requestAnimationFrame(() => requestAnimationFrame(fn));
  const pause = ms => new Promise(r => setTimeout(r, reduced() ? 0 : ms));
  const fmt = n => Math.round(n).toLocaleString();
  function replay(el, cls){ if(!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
  function count(el, from, to, ms = 620, format = fmt){
    if(!el) return; const token = `${Date.now()}${Math.random()}`; el.dataset.motionToken = token;
    if(reduced() || from === to){ el.textContent = format(to); return; }
    const start = performance.now(), frame = now => {
      if(el.dataset.motionToken !== token) return;
      const x = Math.max(0, Math.min(1, (now - start) / ms)), k = 1 - (1 - x) ** 3;
      el.textContent = format(from + (to - from) * k); if(x < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }
  const announce = msg => { const l = q("#live"); if(l){ l.textContent = ""; setTimeout(() => { l.textContent = msg; }, 60); } };
  const names = () => DONGS.map(d => d.en);

  /* ================= Shared weekly mission ================= */
  const MISSION_STORAGE = "bg_weekly_mission_v1";
  const missionWeekStartMs = () => new Date(weekKey() + "T00:00:00+09:00").getTime();
  const missionDeadlineMs = () => missionWeekStartMs() + 7 * 864e5;
  const rawMissionProgress = (dong = myDong()) => BGProgress.goalProgress(S.board, dong);
  function loadMissionStore(){ try{ return JSON.parse(localStorage.getItem(MISSION_STORAGE) || "{}") || {}; }catch{ return {}; } }
  function saveMissionStore(store){ try{ localStorage.setItem(MISSION_STORAGE, JSON.stringify(store)); }catch{} }
  /* Remembers the neighborhood's result per week, so last week's outcome survives the Monday reset. */
  function syncMissionStore(){
    const week = weekKey(), dong = myDong(), progress = rawMissionProgress(dong), store = loadMissionStore();
    if(!S.board) return store;
    if(store.current?.week && store.current.week !== week){
      store.previous = {...store.current, status: store.current.progress >= WEEKLY_GOAL ? "completed" : "expired", expiredAt: Date.now()};
      store.current = null;
    }
    if(!store.current || store.current.week !== week){
      store.current = {week, dong, progress, completionSeen: progress >= WEEKLY_GOAL, completedAt: progress >= WEEKLY_GOAL ? Date.now() : null};
    } else {
      store.current.dong = dong; store.current.progress = progress;
      if(progress >= WEEKLY_GOAL && !store.current.completedAt) store.current.completedAt = Date.now();
    }
    saveMissionStore(store); return store;
  }
  function remainingText(ms = missionDeadlineMs() - Date.now()){
    if(ms <= 0) return "Ended";
    const days = Math.floor(ms / 864e5), hours = Math.floor((ms % 864e5) / 36e5), mins = Math.max(0, Math.floor((ms % 36e5) / 6e4));
    if(days) return `${days}d ${hours}h left`;
    if(hours) return `${hours}h ${mins}m left`;
    return `${Math.max(1, mins)}m left`;
  }
  function missionSnapshot(){
    const store = syncMissionStore(), dong = myDong(), raw = rawMissionProgress(dong), progress = Math.min(raw, WEEKLY_GOAL), now = Date.now(), deadline = missionDeadlineMs();
    const status = now >= deadline ? "expired" : progress >= WEEKLY_GOAL ? "completed" : progress > 0 ? "in-progress" : "not-started";
    const sc = scores();
    return {store, dong, raw, progress, status, personal: sc.eligibleWeek, weekPoints: sc.week, deadline, week: weekKey()};
  }
  const missionLabels = {"not-started": "Not started", "in-progress": "In progress", completed: "Completed", expired: "Expired"};

  const shortLeft = ms => { if(ms <= 0) return "Ended"; const d = Math.floor(ms / 864e5), h = Math.floor(ms % 864e5 / 36e5); return d ? `${d}d left` : h ? `${h}h left` : "Ends soon"; };
  const plural = n => `${n} report${n === 1 ? "" : "s"}`;
  const SVG = d => `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">${d}</svg>`;

  /* Home: the number leads. Label, title, progress, one motivating line, time left, bar, one action. */
  function renderMissionSummary(){
    const m = missionSnapshot(), card = q(".mission-summary"); if(!card) return;
    const left = WEEKLY_GOAL - m.progress, ms = m.deadline - Date.now();
    const msg = left <= 0 ? "Goal reached this week" : m.progress === 0 ? "Be the first to report" : `${left <= 3 ? "Only " : ""}${plural(left)} to go`;
    card.dataset.state = m.status;
    q("#goalTitle").textContent = `Verify ${WEEKLY_GOAL} hazards`;
    q("#goalCount").innerHTML = `<strong>${m.progress}</strong><span> / ${WEEKLY_GOAL}</span>`;
    q("#goalMsg").textContent = msg;
    q("#missionDeadline").textContent = shortLeft(ms);
    const bar = q("#homeGoal"); if(bar) bar.style.width = `${m.progress / WEEKLY_GOAL * 100}%`;
    card.setAttribute("aria-label", `Weekly neighborhood mission: verify ${WEEKLY_GOAL} hazards. ${m.progress} of ${WEEKLY_GOAL} eligible reports. ${msg}. ${shortLeft(ms)}. View mission.`);
  }

  /* Mission detail: progress, what is left, the next action, then a three-step explanation. Rules sit in a closed accordion. */
  const RING = 2 * Math.PI * 50;
  function renderMission(){
    const m = missionSnapshot(), body = q("#missionBody"); if(!body) return;
    const left = WEEKLY_GOAL - m.progress, done = m.status === "completed", ms = m.deadline - Date.now();
    const entering = S.missionEntered !== S.screenVisit && !reduced(); S.missionEntered = S.screenVisit;
    const open = [...body.querySelectorAll("details[open]")].map(d => d.dataset.k);
    const head = done ? "Goal reached" : `${plural(left)} to go`;
    const lead = done ? `${esc(m.dong)} verified ${WEEKLY_GOAL} real hazards this week.` : `Help ${esc(m.dong)} verify ${left} more real hazard${left === 1 ? "" : "s"} this week.`;
    const previous = m.store.previous;
    const rule = (ok, what) => `<li class="${ok ? "yes" : "no"}"><span aria-hidden="true">${ok ? "✓" : "✕"}</span><b>${what}</b><small>${ok ? "counts" : "doesn't count"}</small></li>`;
    body.innerHTML = `
      <section class="mh ${m.status}${S.missionJustCompleted ? " just" : ""}${entering ? " mh-enter" : ""}" aria-label="Mission progress">
        <span class="mh-baro" aria-hidden="true">${mImg(done ? "three" : "front")}</span>
        <div class="mh-row">
          <div class="ring" role="progressbar" aria-valuemin="0" aria-valuemax="${WEEKLY_GOAL}" aria-valuenow="${m.progress}" aria-label="Neighborhood mission progress: ${m.progress} of ${WEEKLY_GOAL} eligible reports">
            <svg viewBox="0 0 120 120" aria-hidden="true"><circle class="ring-track" cx="60" cy="60" r="50"/><circle class="ring-fill" id="mhRing" cx="60" cy="60" r="50" stroke-dasharray="${RING.toFixed(1)}" stroke-dashoffset="${(RING * (1 - (entering ? 0 : m.progress / WEEKLY_GOAL))).toFixed(1)}"/></svg>
            <span class="ring-num num" aria-hidden="true"><b id="mhNum">${entering ? 0 : m.progress}</b><small>/ ${WEEKLY_GOAL}</small></span>
          </div>
          <div class="mh-copy"><h3>${head}</h3><span class="mission-time">${done ? "Completed" : remainingText(ms)}</span></div>
        </div>
        <p class="mh-lead">${lead}</p>
        <button class="btn lg accent" data-go="report">Report a hazard</button>
        <p class="mh-safe">Report hazards you naturally come across. Never search for danger.</p>
      </section>
      <p class="mh-mine">Your part this week: <b class="num">${plural(m.personal)}</b> · <b class="num">${fmt(m.weekPoints)}</b> points</p>
      <section class="help${entering ? " help-enter" : ""}" aria-label="How to help this week">
        <h3>How to help this week</h3>
        <ol class="help-steps">
          <li><span class="help-icon s1">${SVG('<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>')}</span><b>Take a clear photo</b></li>
          <li><span class="help-icon s2">${SVG('<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 15l2 2 4-4"/>')}</span><b>Complete the report</b></li>
          <li><span class="help-icon s3">${SVG('<path d="M12 19V6M6 11l6-6 6 6"/>')}</span><b>Neighborhood progress +1</b></li>
        </ol>
      </section>
      <details class="acc" data-k="rules"><summary>What counts as an eligible report?</summary>
        <ul class="acc-list">${rule(true, "New eligible report")}${rule(false, "Re-measurement")}${rule(false, "Duplicate report")}${rule(false, "Failed analysis")}${rule(false, "Sample report")}</ul>
        <p class="acc-note">Refreshing or reopening Success never adds progress. Completing the mission is recognition only: no bonus points.</p></details>
      ${previous ? `<p class="mh-prev"><span>Previous week</span><b>${previous.status === "completed" ? "Completed" : "Expired"} · ${Math.min(previous.progress || 0, WEEKLY_GOAL)} / ${WEEKLY_GOAL}</b></p>` : ""}
      ${window.BG_STANDALONE ? `<details class="note-row" data-k="sample"><summary>Sample neighborhood data</summary><p>The starting count is a sample baseline, not live district activity. Reports from this device are added on top.</p></details>` : ""}`;
    open.forEach(k => { const d = body.querySelector(`details[data-k="${k}"]`); if(d) d.open = true; });
    if(entering) later(() => { const r = q("#mhRing"); if(r) r.style.strokeDashoffset = (RING * (1 - m.progress / WEEKLY_GOAL)).toFixed(1); count(q("#mhNum"), 0, m.progress, 700, n => String(Math.round(n))); });
    if(S.missionJustCompleted) setTimeout(() => { S.missionJustCompleted = false; }, 900);
  }
  window.renderMission = renderMission;

  /* ================= Routing + entrances ================= */
  function enterHome(){
    const home = q('[data-screen="home"]'); if(!home) return;
    home.querySelectorAll(".home-stagger").forEach(el => el.classList.remove("home-stagger"));
    [home.querySelector(".mission-summary"), home.querySelector("#nextMission"), home.querySelector("#nextMission + .card"), home.querySelector(".quick"), home.querySelector(".points-row"), home.querySelector("#modeNote")].filter(Boolean)
      .forEach((el, i) => { el.classList.add("home-stagger"); el.style.setProperty("--home-delay", `${420 + i * 70}ms`); });
    const bar = home.querySelector("#homeGoal"), target = bar?.style.width || "0%";
    if(bar && !reduced()){ bar.style.width = "0%"; later(() => { if(bar.isConnected) bar.style.width = target; }); }
    replay(home, "home-enter");
  }
  function routeClass(screen, from){
    if(!screen) return; screen.classList.remove("route-enter", "route-from-done", "route-home"); void screen.offsetWidth; screen.classList.add("route-enter");
    if(from === "done") screen.classList.add("route-from-done"); if(screen.dataset.screen === "home") screen.classList.add("route-home");
    setTimeout(() => screen.classList.remove("route-enter", "route-from-done", "route-home"), 380);
  }
  /* "back" returns to the tab a sub-screen was opened from. */
  const ROOTS = ["home", "map", "board", "me"], BACK_DEFAULT = {mission: "board", reports: "me", shop: "me"};
  const backMap = {};
  const baseGo = window.go;
  window.go = function(name){
    if(name === "report") return baseGo(name);
    const from = S.screen || "home";
    if(name === "back") name = backMap[from] || BACK_DEFAULT[from] || "home";
    else if(BACK_DEFAULT[name] && ROOTS.includes(from)) backMap[name] = from;
    if(name !== "reportDetail") S.detailVisit = null;
    S.boardArrival = name === "board" && from === "done" && !!S.last && !S.last.boardShown;
    document.documentElement.dataset.route = `${from}-${name}`;
    if(name === "review" && q("#scan.on")) baseCloseScan();
    baseGo(name);
    routeClass(q(`.screen[data-screen="${name}"]`), from);
    if(name === "home") enterHome();
    const h = q(`.screen[data-screen="${name}"] h1, .screen[data-screen="${name}"] h2`); if(h && from !== name){ h.tabIndex = -1; h.focus({preventScroll: true}); }
  };

  /* ================= Camera ================= */
  const baseOpenScan = window.openScan, baseCloseScan = window.closeScan;
  const SCAN_STATES = ["locked", "camera-flash", "closing", "state-analyzing", "state-detected", "state-ready", "state-error", "state-blocked"];
  window.openScan = async function(keep){
    const scan = q("#scan"), reticle = q("#reticle"); scan.classList.remove(...SCAN_STATES); scan.classList.add("state-scanning"); reticle.removeAttribute("style");
    scanFrom = document.activeElement;
    const result = baseOpenScan(keep); replay(scan, "on"); return result;
  };
  let scanFrom = null;
  window.closeScan = function(){ baseCloseScan(); q("#scan").classList.remove(...SCAN_STATES, "state-scanning"); scanFrom?.focus?.({preventScroll: true}); scanFrom = null; };
  function finishLine(lines, i){
    if(!lines[i] || lines[i].classList.contains("done")) return; lines[i].classList.add("on", "done"); lines[i + 1]?.classList.add("on"); replay(q(".analyzing .mascot"), "step-nod");
  }
  function detectionPanel(d){
    const t = TYPES[d.type] || TYPES.other;
    return `<div class="detection-panel" role="status" aria-live="polite"><div class="detection-title"><span class="lock-dot" aria-hidden="true"></span>Hazard detected${window.BG_STANDALONE ? '<span class="hud-tag">Sample AI result</span>' : ""}</div>
      <dl class="detection-lines"><dt>Issue</dt><dd>${esc(t.en)}</dd><dt>Risk</dt><dd>${esc(RISKS[d.risk] || "Unknown")}</dd><dt>Size</dt><dd>${esc(sizeText(d.sizeCm, d.sizeMode))}</dd></dl>
      <button class="btn accent" data-act="reviewDetection">Review report</button></div>`;
  }
  function revealDetection(d){
    const scan = q("#scan"), r = q("#reticle"); q("#scanMode").textContent = "Hazard detected"; q("#scanFoot").innerHTML = detectionPanel(d); r.hidden = false;
    if(d.bbox){ const [x0, y0, x1, y1] = d.bbox; r.style.left = `${(x0 + x1) * 50}%`; r.style.top = `${(y0 + y1) * 50}%`; r.style.width = `${Math.max(22, (x1 - x0) * 100)}%`; r.style.height = `${Math.max(14, (y1 - y0) * 100)}%`; r.style.aspectRatio = "auto"; }
    scan.classList.remove("state-scanning", "state-analyzing"); scan.classList.add("locked", "state-detected");
    clearTimeout(d.motionReadyTimer);
    d.motionReadyTimer = setTimeout(() => { if(scan.classList.contains("locked")){ scan.classList.add("state-ready"); q("#scanMode").textContent = "Ready to review"; } }, reduced() ? 0 : 360);
    if(!d.motionHaptic){ d.motionHaptic = true; window.BGFx?.cue("detect"); }
  }
  function finishDetection(){ const d = S.draft; if(!d || d.motionReviewStarted) return; d.motionReviewStarted = true; clearTimeout(d.motionReviewTimer); window.go("review"); }
  /* Analysis problems stay on the photo: say what happened and offer retry, retake or manual entry. */
  function scanProblem(title, msg, canRetry){
    const scan = q("#scan"); scan.classList.remove("state-analyzing"); scan.classList.add("state-error"); q("#scanMode").textContent = canRetry ? "Analysis error" : "Nothing found";
    q("#scanFoot").innerHTML = `<div class="hud-panel" role="alert">${mImg("idle")}<div><h3>${esc(title)}</h3><p>${esc(msg)}</p></div></div>
      <div class="hud-actions">${canRetry ? '<button class="btn accent" data-act="retryAnalysis">Try analysis again</button>' : ""}
      <button class="btn ${canRetry ? "alt" : "accent"}" data-act="retake">Retake photo</button><button class="btn alt" data-act="manual">Choose the issue myself</button></div>`;
    q("#scanFoot button")?.focus({preventScroll: true}); window.BGFx?.cue("error");
  }

  window.handlePhoto = async function(blob, capturedAt, source){
    stopStream(); const scan = q("#scan"); scan.classList.add("on"); scan.classList.remove("state-scanning", "state-detected", "state-ready", "state-error", "state-blocked", "locked"); scan.classList.add("state-analyzing");
    if(source === "live"){ replay(scan.querySelector(".shutter"), "captured"); replay(scan, "camera-flash"); window.BGFx?.cue("shutter"); }
    const d = S.draft || (S.draft = {id: uid(), edited: {}}); Object.assign(d, {blob, url: await dataURL(blob), capturedAt, source, motionReviewStarted: false}); d.thumb = await thumbOf(blob).catch(() => null);
    const still = q("#still"); still.src = d.url; still.hidden = false; q("#reticle").hidden = true; q("#safety").hidden = true;
    scanSource(source === "live" ? "file" : source); q("#scanMode").textContent = "Analyzing";
    q("#scanFoot").innerHTML = `<div class="analyzing">${mImg("inspect")}<ul class="status-lines" id="lines" role="status" aria-live="polite"><li><span class="tick"></span>Identifying the issue</li><li><span class="tick"></span>Estimating risk and size</li><li><span class="tick"></span>Finding the responsible office</li></ul></div>`;
    const lines = [...document.querySelectorAll("#lines li")]; lines[0].classList.add("on");
    const started = Date.now(), t1 = setTimeout(() => finishLine(lines, 0), 520), t2 = setTimeout(() => finishLine(lines, 1), 1040);
    if(!d.loc) d.loc = S.loc || await (S.locP || locate());
    let ai = null, err = null; try{ ai = await analyze(d); }catch(e){ err = e; }
    if(S.draft !== d || !scan.classList.contains("on")){ clearTimeout(t1); clearTimeout(t2); return; } /* closed or retaken while analysing */
    const remaining = 1200 - (Date.now() - started); if(remaining > 0) await pause(remaining); clearTimeout(t1); clearTimeout(t2);
    if(ai?.is_hazard){
      for(let i = 0; i < lines.length; i++){ finishLine(lines, i); if(i < lines.length - 1) await pause(150); } await pause(180);
      applyAI(d, ai); revealDetection(d); d.motionReviewTimer = setTimeout(finishDetection, reduced() ? 600 : 1100); return;
    }
    if(ai && !ai.is_hazard) return scanProblem("No hazard found", "Nothing in this photo looked like a hazard. Retake it closer, or choose the issue yourself.", false);
    const why = !S.sample || !S.imagesOK ? "Analysis isn't available in this view." : err?.code === "not_granted" ? "Analysis was not allowed." : err?.code === "rate_limited" ? "The analyzer is busy right now." : "The analysis didn't finish.";
    scanProblem("Analysis didn't work", `${why} Your photo is safe. Try again, or choose the issue yourself.`, true);
  };

  document.addEventListener("click", e => {
    const el = e.target.closest("[data-act],[data-risk]"); if(!el) return;
    if(el.dataset.act === "reviewDetection"){ e.preventDefault(); e.stopPropagation(); finishDetection(); return; }
    if(el.dataset.act === "retryAnalysis"){ e.preventDefault(); e.stopPropagation(); const d = S.draft; if(d?.blob) window.handlePhoto(d.blob, d.capturedAt, d.source); return; }
    if(!S.draft) return; if(el.dataset.risk) S.draft.motionEdited = "risk"; if(["measureDone", "arManualUse"].includes(el.dataset.act)) S.draft.motionEdited = "size";
  }, true);
  document.addEventListener("change", e => { if(e.target.id === "fType" && S.draft) S.draft.motionEdited = "type"; }, true);

  /* ================= Review ================= */
  const baseReview = window.renderReview;
  function decorateReview(){
    const d = S.draft, body = q("#reviewBody"); if(!d || !body) return;
    if(!d.motionReviewOpened){ d.motionReviewOpened = true; body.classList.add("review-enter"); [...body.children].forEach((el, i) => el.style.setProperty("--review-delay", `${Math.min(i * 65, 390)}ms`)); } else body.classList.remove("review-enter");
    const fields = [...body.querySelectorAll(".fields .f")], map = {type: fields[0], risk: fields[1], size: fields[2]}; if(map[d.motionEdited]) replay(map[d.motionEdited], "motion-highlight");
    const p = pointsFor(d), changed = d.motionPreviousPoints !== undefined && d.motionPreviousPoints !== p.total; body.querySelectorAll(".ledger .li b").forEach(el => el.classList.add("points-value"));
    const btn = body.querySelector('[data-act="submit"]'); if(btn) btn.innerHTML = p.blocked ? `<span>Already measured · Available again in ${waitText(p.blocked)}</span>` : `<span>${d.dup ? "Add measurement" : "Submit report"}</span><span class="submit-reward points-value${changed ? " changed" : ""}">+${p.total}</span>`;
    d.motionPreviousPoints = p.total;
    ["type", "risk", "size"].forEach(key => { const field = map[key]; if(!field) return; field.classList.toggle("field-changed", !!d.edited?.[key]); });
    const complaint = body.querySelector("#fComplaint")?.closest(".card"); if(complaint) complaint.classList.toggle("field-changed", !!d.edited?.complaint);
    let feedback = body.querySelector("#submitFeedback"); if(!feedback && btn){ feedback = document.createElement("div"); feedback.id = "submitFeedback"; feedback.className = "submit-feedback"; feedback.setAttribute("role", "status"); feedback.setAttribute("aria-live", "polite"); btn.insertAdjacentElement("afterend", feedback); }
    if(feedback){ feedback.className = "submit-feedback" + (S.submitError ? " error" : ""); feedback.innerHTML = S.submitError ? `<b>${S.submitError.title}</b><span>${S.submitError.message}</span>` : p.blocked ? "<span>Re-measurement rewards are limited to one per hazard every 24 hours. A different hazard can be reported now.</span>" : "<span>Points and mission progress are added only after submission succeeds.</span>"; }
    if(btn){ btn.setAttribute("aria-busy", "false"); if(S.submitError?.retry && !p.blocked) btn.querySelector("span:first-child").textContent = "Try again"; }
    d.motionEdited = null;
  }
  window.renderReview = function(){ baseReview(); decorateReview(); };
  function updateReviewPoints(){
    const d = S.draft, body = q("#reviewBody"); if(!d || !body) return; const p = pointsFor(d); if(p.blocked) return; const changed = d.motionPreviousPoints !== undefined && d.motionPreviousPoints !== p.total, ledger = body.querySelector(".ledger");
    if(ledger) ledger.innerHTML = p.lines.map(([l, v]) => `<div class="li"><span>${esc(l)}</span><b class="points-value${changed ? " changed" : ""}">+${v}</b></div>`).join("") + (p.note ? `<p class="small muted" style="margin-top:6px">${esc(p.note)}</p>` : "");
    const reward = body.querySelector(".submit-reward"); if(reward){ reward.textContent = `+${p.total}`; if(changed) replay(reward, "changed"); } d.motionPreviousPoints = p.total;
  }
  document.addEventListener("input", e => { if(e.target.id !== "fComplaint" || !S.draft) return; S.draft.motionEdited = "complaint"; queueMicrotask(updateReviewPoints); });

  /* ================= Submit ================= */
  const baseSubmit = window.submit;
  window.submit = async function(){
    const d = S.draft; if(!d || S.busy) return; const dong = d.loc?.dong;
    S.submitError = null;
    S.motionSubmit = {previousTotal: score(), previousBoardScore: S.board?.dongs?.[dong] || 0, previousGoal: rawMissionProgress(dong), previousRank: BGProgress.standing(S.board, names(), dong).rank};
    const pending = baseSubmit();
    queueMicrotask(() => { const b = q('[data-act="submit"]'); if(b && S.busy){ b.disabled = true; b.setAttribute("aria-busy", "true"); b.classList.add("is-loading"); b.innerHTML = '<span class="motion-spinner" aria-hidden="true"></span><span>Submitting…</span>'; } });
    const outcome = await pending;
    /* One message per event: a locked re-measurement shows inline on the button; anything else is one error card. */
    if(S.screen === "review" && outcome && outcome !== "ok"){
      S.submitError = outcome === "measured" ? null
        : outcome === "cap" ? {title: "Daily limit reached", message: `You've sent ${DAILY_CAP} reports today. Try again tomorrow. No points or mission progress were added.`, retry: false}
        : {title: "Submission failed", message: "Check your connection, then try again. No points or mission progress were added.", retry: true};
      window.renderReview(); window.BGFx?.cue("error");
      announce(S.submitError ? `${S.submitError.title}. ${S.submitError.message}` : `Already measured. Available again in ${waitText(measuredUntil(d))}.`);
    } else if(S.screen === "done"){ syncMissionStore(); }
  };

  /* ================= Success =================
     Order of importance: 1 neighborhood rank and score, 2 shared mission, 3 personal points. */
  function confetti(){
    const colors = ["var(--sage)", "var(--mustard)", "var(--coral)", "var(--blue)"], xs = [-112, -92, -72, -49, -26, -8, 14, 34, 56, 78, 99, 118];
    return `<div class="confetti-field" aria-hidden="true">${xs.map((x, i) => `<i class="confetti" style="--confetti-x:${x}px;--confetti-y:${64 + i % 4 * 16}px;--confetti-drift:${i % 2 ? 14 : -12}px;--confetti-r:${i % 2 ? 150 : -135}deg;--confetti-color:${colors[i % 4]};--confetti-time:${720 + i % 3 * 70}ms;--confetti-delay:${i % 4 * 35}ms"></i>`).join("")}</div>`;
  }
  window.renderDone = function(){
    const L = S.last; if(!L) return; const r = L.rep, snap = S.motionSubmit || {}, fresh = !L.motionPlayed; L.motionPlayed = true;
    const st = BGProgress.standing(S.board, names(), r.dong), hoodNow = st.score, hoodWas = snap.previousBoardScore ?? hoodNow - L.points, oldRank = snap.previousRank || st.rank;
    const goal = rawMissionProgress(r.dong), oldGoal = snap.previousGoal ?? Math.max(0, goal - (L.aiOk ? 1 : 0));
    const eligible = !!L.aiOk && !r.remeasure, advanced = eligible && goal > oldGoal && oldGoal < WEEKLY_GOAL, completed = oldGoal < WEEKLY_GOAL && goal >= WEEKLY_GOAL;
    const rankUp = st.rank < oldRank, sc = scores();
    if(completed && fresh){ S.missionJustCompleted = true; const store = syncMissionStore(); if(store.current){ store.current.completionSeen = true; store.current.completedAt = Date.now(); saveMissionStore(store); } }
    const full = fresh && !r.remeasure && L.points > 0, compact = fresh && !full;
    const unlocked = fresh ? (window.BGShell?.collectUnlocks() || []) : [];
    const anim = fresh && !reduced();
    const g = n => Math.min(n, WEEKLY_GOAL);
    const hoodHead = L.points === 0 ? `No change for ${esc(r.dong)}` : rankUp ? `${esc(r.dong)} moved up to #${st.rank}` : `${esc(r.dong)} remains #${st.rank}`;
    const missionHead = completed ? "Mission complete" : advanced ? "+1 eligible report" : "No mission change";
    const missionNote = completed ? "Recognition only. Completion adds no bonus points." : advanced ? "Your report moved the shared goal." : r.remeasure ? "Re-measurements don't move the mission." : r.sample ? "Sample media never counts." : goal >= WEEKLY_GOAL ? "The shared goal was already reached." : "This report wasn't eligible for the mission.";
    q("#doneBody").innerHTML = `
      <div class="success-hero ${fresh ? "fresh" : ""} ${r.remeasure ? "remeasure" : ""}">${full ? confetti() : ""}${compact ? '<span class="remeasure-ring" aria-hidden="true"></span>' : ""}${mImg(r.remeasure ? "tap" : "three")}
        <div class="success-copy"><span class="success-check" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 12.5l4.2 4.2L19 7"/></svg></span>
        <h1>${r.remeasure ? "Measurement added" : "Report submitted"}</h1><p class="muted">${r.remeasure ? "Added to the existing issue." : `Sent to ${esc(TYPES[r.type].dept.replace(/.$/, ""))}.`} Not repaired yet.</p></div></div>
      <section class="card outcome outcome-hood ${rankUp ? "rank-up" : ""}" aria-label="Neighborhood impact">
        <p class="success-card-label">Neighborhood</p>
        <h2 class="outcome-head">${hoodHead}</h2>
        <p class="outcome-score num"><span class="was">${fmt(hoodWas)}</span><span class="arrow" aria-hidden="true">→</span><span class="sr-only"> to </span><b id="hoodScore">${fmt(anim ? hoodWas : hoodNow)}</b></p>
        <p class="outcome-note">Neighborhood score${window.BG_STANDALONE ? " · sample baseline plus reports from this device" : ""}</p>
      </section>
      <section class="card outcome outcome-mission ${completed ? "completed" : advanced ? "advanced" : "unchanged"}" aria-label="Weekly mission">
        <div class="row between"><p class="success-card-label">Weekly mission</p><span class="outcome-chip">${missionHead}</span></div>
        <p class="outcome-mid num"><span class="was">${g(oldGoal)} / ${WEEKLY_GOAL}</span><span class="arrow" aria-hidden="true">→</span><span class="sr-only"> to </span><b><span id="successGoalCount">${g(anim ? oldGoal : goal)}</span> / ${WEEKLY_GOAL}</b></p>
        <div class="meter" aria-hidden="true"><i id="goalBar" style="width:${g(anim ? oldGoal : goal) / WEEKLY_GOAL * 100}%"></i></div>
        <p class="outcome-note">${missionNote}</p>
      </section>
      <section class="card outcome outcome-me" aria-label="Personal reward">
        <div class="row between"><p class="success-card-label">Personal reward</p><b class="outcome-pts num">+<span id="bigPts">${anim ? 0 : L.points}</span> points</b></div>
        <details class="outcome-detail"><summary>How it adds up</summary>
          <div class="ledger">${r.breakdown.map(([l, v]) => `<div class="li"><span>${esc(l)}</span><b>+${v}</b></div>`).join("")}</div>
          <div class="ledger"><div class="li"><span>Total contribution</span><b class="num">${fmt(sc.total)}</b></div><div class="li"><span>Available now</span><b class="num">${fmt(sc.available)}</b></div></div>
          <p class="outcome-note">${L.points ? "These points become available once the district receives the report." : "No points for this submission."}</p></details>
      </section>
      ${unlocked.map(b => window.BGShell.unlockCard(b)).join("")}
      <button class="btn lg" data-go="board">View neighborhood</button>
      <button class="btn soft" data-act="toSafety" data-id="${r.id}">Also file on Safety e-Report</button>
      <button class="btn ghost" data-go="home">Done</button>`;
    syncMissionStore();
    if(!fresh) return;
    announce(`${r.remeasure ? "Measurement added" : "Report submitted"}. ${hoodHead.replace(/<[^>]+>/g, "")}, neighborhood score ${hoodNow}. Weekly mission ${g(goal)} of ${WEEKLY_GOAL}. You earned ${L.points} personal points.`);
    window.BGFx?.cue(full ? "success" : "tick");
    later(() => {
      count(q("#hoodScore"), hoodWas, hoodNow, 750); count(q("#bigPts"), 0, L.points, 650, n => String(Math.round(n)));
      count(q("#successGoalCount"), g(oldGoal), g(goal), 650, n => String(Math.round(n)));
      const bar = q("#goalBar"); if(bar) bar.style.width = `${g(goal) / WEEKLY_GOAL * 100}%`;
    });
    if(unlocked.length) setTimeout(() => window.BGShell.celebrateCoins(unlocked), reduced() ? 100 : 650);
  };

  /* ================= Neighborhood (leaderboard, mission, movement, impact) ================= */
  /* Sequence: where are we ranked, how close is the race, what can I do, what has the neighborhood achieved. */
  window.renderBoard = function(){
    q("#resetIn").textContent = resetText().replace("Resets", "resets");
    const list = BGProgress.rows(S.board?.dongs, names()), mine = myDong(), st = BGProgress.standing(S.board, names(), mine), m = missionSnapshot();
    const arrival = !!S.boardArrival, delta = arrival && S.last?.rep?.dong === mine ? S.last.points : 0, snap = S.motionSubmit || {};
    const entering = S.boardEntered !== S.screenVisit;
    /* one competitive message at a time */
    const ind = delta ? `+${delta} from your report` : st.moved > 0 ? `↑ ${st.moved} this week` : st.rank === 1 ? (st.behindName ? `${fmt(st.leadOverBehind)} pts ahead of #2` : "Leading") : `${fmt(st.gapToAhead)} pts to #${st.rank - 1}`;
    const indLabel = delta ? `Plus ${delta} points from your report` : st.moved > 0 ? `Up ${st.moved} place${st.moved > 1 ? "s" : ""} this week` : st.rank === 1 ? `${fmt(st.leadOverBehind)} points ahead of number 2` : `${fmt(st.gapToAhead)} points behind number ${st.rank - 1}`;
    const order = [list[1], list[0], list[2]].filter(Boolean);
    const podium = `<ol class="podium ${entering ? "podium-enter" : ""}" aria-label="Top three neighborhoods">${order.map(row => { const me = row.name === mine;
      return `<li class="podium-place p${row.rank} ${me ? "me" : ""}" style="order:${row.rank === 1 ? 2 : row.rank === 2 ? 1 : 3}" aria-label="Rank ${row.rank}, ${row.pts} points, ${esc(row.name)}${me ? ", your neighborhood" : ""}">
        <span class="podium-base"><span class="podium-rank" aria-hidden="true">${row.rank}</span><span class="podium-score board-score num" data-name="${esc(row.name)}" data-score="${row.pts}">${fmt(row.pts)}</span>${me ? '<span class="podium-yours">Yours</span>' : ""}</span>
        <span class="podium-name">${esc(row.name)}</span></li>`; }).join("")}</ol>`;
    const rest = `<ol class="leader-list" start="4" aria-label="Other neighborhoods">${list.slice(3).map(row => { const me = row.name === mine;
      return `<li class="lb-row ${me ? "me" : ""}"><span class="lb-n" aria-hidden="true">${row.rank}</span><span class="lb-name"><span class="sr-only">Rank ${row.rank}, </span>${esc(row.name)}${me ? ' <span class="podium-yours">Yours</span>' : ""}</span><span class="lb-pts board-score num" data-name="${esc(row.name)}" data-score="${row.pts}">${fmt(row.pts)}</span></li>`; }).join("")}</ol>`;
    const local = [...S.issues.values()].filter(i => i.dong === mine && i.status !== "rejected");
    const fixed = local.filter(i => i.status === "resolved").length, working = local.filter(i => i.status === "scheduled" || i.status === "in_repair").length, waiting = local.length - fixed - working;
    const moved30 = local.filter(i => ["scheduled", "in_repair", "resolved"].includes(i.status) && Date.now() - (i.updatedAt || 0) < 30 * 864e5).length;
    const left = WEEKLY_GOAL - m.progress, seg = (n, c) => n ? `<i class="${c}" style="flex-grow:${n}"></i>` : "";
    q("#boardBody").innerHTML = `
      <section class="hood-strip" aria-label="Your neighborhood">
        <p class="hood-id"><span>Your neighborhood</span> · <b>${esc(mine)}</b></p>
        <span class="hood-ind ${delta || st.moved > 0 ? "up" : ""} ${entering ? "ind-enter" : ""}" ${delta ? 'role="status"' : ""} aria-label="${indLabel}">${ind}</span>
      </section>
      <div class="section-head rank-head"><h3>Weekly ranking</h3>${window.BG_STANDALONE || S.board?.sample ? '<span class="sample-tag">Sample neighborhood data</span>' : ""}</div>
      ${podium}${rest}
      <button class="goal-strip" data-go="mission" aria-label="Weekly neighborhood goal: ${m.progress} of ${WEEKLY_GOAL}, ${left > 0 ? plural(left) + " left" : "goal reached"}. View mission.">
        <span class="goal-copy"><small>Weekly neighborhood goal</small><b class="num">${m.progress} / ${WEEKLY_GOAL} <span>· ${left > 0 ? plural(left) + " left" : "goal reached"}</span></b></span>
        <span class="goal-go">View mission <span aria-hidden="true">→</span></span>
        <span class="meter" aria-hidden="true"><i style="width:${m.progress / WEEKLY_GOAL * 100}%"></i></span>
      </button>
      <section class="impact" aria-label="Community impact in ${esc(mine)}">
        <div class="section-head"><h3>Community impact</h3><span class="small muted">${esc(mine)}</span></div>
        <div class="impact-bar" role="img" aria-label="${fixed} repaired, ${working} in progress, ${waiting} waiting">${seg(fixed, "fixed")}${seg(working, "working")}${seg(waiting, "waiting")}</div>
        <ul class="impact-legend"><li class="fixed"><b class="num">${fixed}</b><span>Repaired</span></li><li class="working"><b class="num">${working}</b><span>In progress</span></li><li class="waiting"><b class="num">${waiting}</b><span>Waiting</span></li></ul>
        ${moved30 ? `<p class="impact-sum">${moved30} issue${moved30 === 1 ? "" : "s"} moved forward in the last 30 days.${window.BG_STANDALONE ? "<small>Includes sample issues</small>" : ""}</p>` : ""}
      </section>
      <button class="link-btn block" data-act="scoreInfo">How scores, missions and points differ <span aria-hidden="true">→</span></button>`;
    if(entering && !reduced()) document.querySelectorAll("#boardBody .board-score").forEach(el => { const target = Number(el.dataset.score) || 0, from = arrival && el.dataset.name === mine ? (snap.previousBoardScore ?? Math.max(0, target - delta)) : Math.round(target * .82); count(el, from, target, 620); });
    S.boardEntered = S.screenVisit;
    if(S.last && arrival){ S.last.boardShown = true; if(delta) announce(`${mine} is rank ${st.rank} with ${st.score} points. Plus ${delta} from your report.`); }
    S.boardArrival = false;
  };
  /* A visit id lets the board animate once per entry, not on every data refresh. */
  { const routed = window.go; window.go = function(name){ S.screenVisit = (S.screenVisit || 0) + 1; return routed(name); }; }

  /* ================= Home + Rewards decorations ================= */
  const baseHomeRender = window.renderHome;
  window.renderHome = function(){ baseHomeRender(); renderMissionSummary(); };

  const baseShopRender = window.renderShop;
  window.renderShop = function(){
    baseShopRender();
    document.querySelectorAll("#shopList .reward").forEach(card => {
      const button = card.querySelector("button"), available = !button?.disabled;
      card.classList.toggle("reward-available", available); card.classList.toggle("reward-locked", !available);
      if(button){ button.setAttribute("aria-disabled", String(!available)); button.insertAdjacentHTML("beforebegin", `<span class="reward-state">${available ? "Available" : `Need ${Math.max(0, (Number(button.textContent.match(/\d+/)?.[0]) || 0) - spendable())} more`}</span>`); }
    });
  };

  /* ================= Press, hold and focus feedback ================= */
  function installPressFeedback(){
    const selector = 'button,[role="button"],.item,.pin,a.btn';
    const clear = el => el?.classList?.remove("is-pressed", "is-held");
    let hold = null;
    document.addEventListener("pointerdown", e => {
      const el = e.target.closest(selector); if(!el || el.disabled || el.getAttribute("aria-disabled") === "true") return;
      el.classList.add("is-pressed"); clearTimeout(hold); hold = setTimeout(() => el.classList.contains("is-pressed") && el.classList.add("is-held"), 350);
    }, true);
    ["pointerup", "pointercancel", "lostpointercapture"].forEach(type => document.addEventListener(type, e => { clearTimeout(hold); clear(e.target.closest?.(selector)); }, true));
    document.addEventListener("pointerleave", e => { if(e.buttons) clear(e.target.closest?.(selector)); }, true);
    document.addEventListener("keydown", e => { if((e.key === " " || e.key === "Enter") && e.target.matches?.(selector) && !e.target.disabled) e.target.classList.add("is-pressed"); }, true);
    document.addEventListener("keyup", e => { if(e.key === " " || e.key === "Enter") clear(e.target); }, true);
    addEventListener("blur", () => document.querySelectorAll(".is-pressed").forEach(clear));
    document.addEventListener("click", e => { if(e.target.closest("[data-go],[data-act],[data-filter],[data-risk],[data-lang],[data-report],[data-issue]")) window.BGFx?.cue("tap"); }, true);
  }
  installPressFeedback();

  document.addEventListener("focusin", e => { const field = e.target.closest("#reviewBody .f,#reviewBody .card"); if(field) field.classList.add("is-editing"); });
  document.addEventListener("focusout", e => { const field = e.target.closest("#reviewBody .f,#reviewBody .card"); if(field) field.classList.remove("is-editing"); });
  document.addEventListener("click", e => {
    const redeem = e.target.closest('[data-act="redeem"]'); if(redeem && !redeem.disabled){ redeem.classList.add("is-loading"); redeem.setAttribute("aria-busy", "true"); redeem.innerHTML = '<span class="motion-spinner" aria-hidden="true"></span><span>Redeeming</span>'; }
  }, true);

  window.BGJuice = {count, replay, reduced, announce, renderMission, renderMissionSummary, missionSnapshot, remainingText, shortLeft, enterHome};
  if(!S.screen) S.screen = "home"; renderMissionSummary();
})();
