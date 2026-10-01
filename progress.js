/* BaroGochyeo — score, mission, Achievement Coin and leaderboard maths.
   Pure functions only: no DOM, no storage. Every screen reads its numbers from here,
   so a backend can later supply the same inputs and keep the UI unchanged. */
(() => {
  "use strict";
  const WEEK_MS = 7 * 864e5;
  const WEEKLY_GOAL = 10;

  const counted = r => !r.reversed;
  const eligible = r => r.aiAnalyzed && !r.remeasure && !r.reversed; /* moves the shared weekly mission */
  const detailed = r => eligible(r) && (r.breakdown || []).some(l => l[0] === "Complete details");
  const inWeek = (r, start) => r.createdAt >= start && r.createdAt < start + WEEK_MS;

  /* Five separate measurements. They are never interchangeable:
     total      – every point this person has earned (contribution record)
     available  – points the district has acknowledged, minus what was redeemed (spendable)
     pending    – earned, waiting for the district to receive the report
     week       – points earned since Monday 00:00 KST
     eligibleWeek – count of reports that moved the shared mission this week */
  function scores({ reports, statusOf, profile, weekStart }) {
    const base = profile?.base || 0, redeemed = profile?.redeemed || 0;
    let total = base, unlocked = base, week = 0, eligibleWeek = 0;
    for (const r of reports) {
      if (!counted(r)) continue;
      const pts = r.points || 0, bonus = r.bonusClaimed ? 10 : 0;
      total += pts + bonus;
      unlocked += (statusOf(r) !== "submitted" ? pts : 0) + bonus;
      if (inWeek(r, weekStart)) { week += pts; if (eligible(r)) eligibleWeek++; }
    }
    const available = unlocked - redeemed;
    return { total, available, pending: total - unlocked, redeemed, week, eligibleWeek };
  }

  /* Deterministic sample baseline for a week, so the standalone prototype never shows an empty
     leaderboard after the Monday reset. Same week + same neighborhood always gives the same number. */
  function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function sampleBoard(week, names) {
    const dongs = {}, goals = {};
    names.forEach((n, i) => {
      dongs[n] = 1180 - i * 95 + (hash(week + "|" + n) % 17) * 10 - 80;
      goals[n] = 3 + hash(week + "#" + n) % 5;
    });
    return { week, dongs, goals, sample: true, base: { dongs: { ...dongs }, goals: { ...goals } } };
  }

  function rows(scoreMap, names) {
    return names.map(name => ({ name, pts: scoreMap?.[name] || 0 })).sort((a, b) => b.pts - a.pts || a.name.localeCompare(b.name)).map((r, i) => ({ ...r, rank: i + 1 }));
  }
  /* Where one neighborhood stands now, and how that compares with the start of the week. */
  function standing(board, names, dong) {
    const now = rows(board?.dongs, names), start = rows(board?.base?.dongs || board?.dongs, names);
    const me = now.find(r => r.name === dong) || { rank: names.length, pts: 0 };
    const was = start.find(r => r.name === dong) || me;
    const ahead = now[me.rank - 2], behind = now[me.rank];
    return { rank: me.rank, score: me.pts, startRank: was.rank, moved: was.rank - me.rank, added: me.pts - was.pts,
      gapToAhead: ahead ? ahead.pts - me.pts : 0, leadOverBehind: behind ? me.pts - behind.pts : 0, aheadName: ahead?.name || null, behindName: behind?.name || null };
  }
  function goalProgress(board, dong) { return Math.max(0, board?.goals?.[dong] || 0); }

  /* Private weekly missions. Each is capped at one completion a week and rewards quality or
     follow-through, never volume. None of them awards points.
     `can` = the person can act on it right now; the first such mission is the recommended one. */
  function missions({ reports, weekStart, progress, week, sharedProgress, hasUpdate }) {
    const mine = reports.filter(r => inWeek(r, weekStart));
    const reviewed = (progress?.reviewWeeks || []).includes(week);
    const waiting = reports.filter(hasUpdate).length;
    const d = mine.some(detailed), s = mine.some(eligible);
    const sharedFull = sharedProgress >= WEEKLY_GOAL;
    const list = [
      { id: "detail", title: "Complete a detailed report", note: "Add a clear photo and complete details.", done: d, can: !d, action: { label: "Start report", short: "Start", go: "report" } },
      { id: "review", title: "Follow an update", note: !reviewed && waiting ? `${waiting} of your reports changed status.`.replace("1 of your reports", "One of your reports") : "Return after one of your reports changes status.", done: reviewed, can: !reviewed && waiting > 0, action: { label: "View update", short: "View", go: "reports" } },
      { id: "shared", title: "Help the neighborhood", note: !s && sharedFull ? "This week's shared goal is already reached." : "Add one eligible report to the shared mission.", done: s, can: !s && !sharedFull, action: { label: "Start report", short: "Start", go: "report" } }
    ];
    list.forEach(m => { m.count = m.done ? 1 : 0; m.state = m.done ? "completed" : "open"; });
    const next = list.find(m => m.can); if (next) next.recommended = true;
    return list;
  }
  /* What happened to last week's missions: completed or expired. Null when there was no activity before this week. */
  function lastWeek({ reports, weekStart, progress, prevWeek }) {
    if (!reports.some(r => r.createdAt < weekStart)) return null;
    const prev = reports.filter(r => inWeek(r, weekStart - WEEK_MS));
    const items = [
      { title: "Complete a detailed report", done: prev.some(detailed) },
      { title: "Follow an update", done: (progress?.reviewWeeks || []).includes(prevWeek) },
      { title: "Help the neighborhood", done: prev.some(eligible) }
    ];
    return { items, total: items.length, completed: items.filter(i => i.done).length };
  }

  /* Private, permanent Achievement Coins. Weekly mission history is independent. */
  function coins({ reports, progress, statusOf = () => "submitted" }) {
    const ok = reports.filter(counted);
    const list = [
      { id: "first-report", name: "First Report", note: "Submitted your first eligible neighborhood report.", req: "Submit your first eligible new neighborhood report.", earned: ok.some(r => eligible(r) && !r.remeasure), need: 1 },
      { id: "measured", name: "Hazard Measured", note: "Measured a hazard with AR or a reference object.", req: "Complete a valid AR or reference-object measurement under the existing measurement rules.", earned: ok.some(r => r.sizeCm > 1 && r.sizeCm < 2000 && (r.sizeMode === "ar" || r.sizeMode === "measured")), started: ok.length > 0, need: 1 },
      { id: "follow-through", name: "Follow-up", note: "Returned to check a report after its status changed.", req: "Return to one of your reports after its status changes.", earned: !!progress?.coins?.["follow-through"]?.earned || !!progress?.followUpSeen, started: ok.some(r => statusOf(r) !== (progress?.seen?.[r.id] ?? "submitted")), need: 1 },
      { id: "issue-resolved", name: "Issue Resolved", note: "A hazard you reported was resolved.", req: "One of your reports reaches the resolved or repaired state.", earned: ok.some(r => r.bonusClaimed || statusOf(r) === "resolved"), started: ok.some(r => statusOf(r) !== "submitted"), need: 1 }
    ];
    return list.map(b => { const saved = progress?.coins?.[b.id] || {}; const earned = !!(saved.earned || b.earned); const have = earned ? 1 : Math.min(saved.progress || 0, 1); return { ...b, earned, have, state: earned ? "earned" : (b.started || have > 0) ? "progress" : "new", at: saved.earnedAt || null, viewed: !!saved.detailViewed }; });
  }

  window.BGProgress = { WEEKLY_GOAL, WEEK_MS, eligible, detailed, scores, sampleBoard, rows, standing, goalProgress, missions, lastWeek, coins };
})();
