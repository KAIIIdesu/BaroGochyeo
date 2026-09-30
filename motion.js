/**
 * 바로고쳐 (BaroGochyeo) — Motion & Interaction System
 * Implements hackathon poster features:
 * - Live AR Detection Camera HUD with Torch, Lock, and real-time bounding box
 * - Celebration moment with falling Confetti and animated point counter
 * - Dual-tab Leaderboard (People & Neighborhoods) with 3D Podium & live countdown
 * - Web Audio API synthesized sound effects & mobile haptic feedback
 * - Baro mascot reactive mood expressions
 * - View Transitions & route animations
 */
(function() {
  "use strict";

  // -------------------------------------------------------------
  // 1. Web Audio Synthesizer (Zero External Audio Files Required)
  // -------------------------------------------------------------
  let audioCtx = null;
  let soundEnabled = true;

  try {
    const saved = localStorage.getItem("bg_sound");
    if (saved !== null) soundEnabled = saved === "1";
  } catch(e) {}

  function getAudioContext() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) audioCtx = new AudioContext();
    }
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  }

  const Sound = {
    tap() {
      if (!soundEnabled) return;
      const ctx = getAudioContext();
      if (!ctx) return;
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(420, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.05);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      } catch(e) {}
    },

    shutter() {
      if (!soundEnabled) return;
      const ctx = getAudioContext();
      if (!ctx) return;
      try {
        // Shutter click: white noise burst + snap tone
        const bufferSize = ctx.sampleRate * 0.04;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.value = 1600;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start();

        // Secondary mechanical click
        setTimeout(() => {
          if (!audioCtx) return;
          const osc = audioCtx.createOscillator();
          const g = audioCtx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(800, audioCtx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.03);
          g.gain.setValueAtTime(0.12, audioCtx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.03);
          osc.connect(g);
          g.connect(audioCtx.destination);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.03);
        }, 50);
      } catch(e) {}
    },

    lock() {
      if (!soundEnabled) return;
      const ctx = getAudioContext();
      if (!ctx) return;
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(1174, ctx.currentTime + 0.06);
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.14);
      } catch(e) {}
    },

    reward() {
      if (!soundEnabled) return;
      const ctx = getAudioContext();
      if (!ctx) return;
      try {
        // C - E - G - C major celebratory arpeggio
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.value = freq;
          const t = ctx.currentTime + idx * 0.09;
          gain.gain.setValueAtTime(0, t);
          gain.gain.linearRampToValueAtTime(0.12, t + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t);
          osc.stop(t + 0.3);
        });
      } catch(e) {}
    }
  };

  function vibrate(pattern) {
    try {
      if ("vibrate" in navigator) navigator.vibrate(pattern);
    } catch(e) {}
  }

  // -------------------------------------------------------------
  // 2. Confetti Particle Generator
  // -------------------------------------------------------------
  function spawnConfetti(container, count = 48) {
    if (!container) return;
    const colors = ["#E2A13D", "#2F705F", "#D46A4E", "#9CAF88", "#FFFDF8", "#5F8497", "#FFD700"];
    const field = document.createElement("div");
    field.className = "confetti-field";
    field.setAttribute("aria-hidden", "true");

    for (let i = 0; i < count; i++) {
      const el = document.createElement("span");
      el.className = "confetti";
      const x = (Math.random() * 280 - 140) + "px";
      const drift = (Math.random() * 60 - 30) + "px";
      const y = (100 + Math.random() * 70) + "px";
      const r = (Math.random() * 720 - 360) + "deg";
      const delay = (Math.random() * 260) + "ms";
      const time = (700 + Math.random() * 500) + "ms";
      const col = colors[Math.floor(Math.random() * colors.length)];

      el.style.setProperty("--confetti-x", x);
      el.style.setProperty("--confetti-drift", drift);
      el.style.setProperty("--confetti-y", y);
      el.style.setProperty("--confetti-r", r);
      el.style.setProperty("--confetti-delay", delay);
      el.style.setProperty("--confetti-time", time);
      el.style.setProperty("--confetti-color", col);
      el.style.width = (6 + Math.random() * 6) + "px";
      el.style.height = (10 + Math.random() * 8) + "px";
      field.appendChild(el);
    }

    container.appendChild(field);
    setTimeout(() => {
      if (field.parentNode) field.parentNode.removeChild(field);
    }, 2000);
  }

  // -------------------------------------------------------------
  // 3. Live AR Camera HUD (Matching Poster Screen 2)
  // -------------------------------------------------------------
  let arModeActive = true;
  let torchActive = false;

  function injectCameraHUD() {
    const scan = document.getElementById("scan");
    if (!scan || scan.dataset.motionReady) return;
    scan.dataset.motionReady = "true";

    // Mode Switcher in top bar
    const bar = scan.querySelector(".bar");
    if (bar && !bar.querySelector(".ar-mode-toggle")) {
      const toggle = document.createElement("div");
      toggle.className = "ar-mode-toggle";
      toggle.innerHTML = `
        <div class="ar-pill-tabs">
          <button type="button" class="ar-pill active" id="btnModeAR">AR</button>
          <button type="button" class="ar-pill" id="btnModePhoto">Photo</button>
        </div>
      `;
      bar.insertBefore(toggle, bar.children[1] || null);

      const btnAR = toggle.querySelector("#btnModeAR");
      const btnPhoto = toggle.querySelector("#btnModePhoto");

      btnAR.addEventListener("click", () => {
        arModeActive = true;
        btnAR.classList.add("active");
        btnPhoto.classList.remove("active");
        updateAROverlayVisibility(true);
        Sound.tap();
      });

      btnPhoto.addEventListener("click", () => {
        arModeActive = false;
        btnPhoto.classList.add("active");
        btnAR.classList.remove("active");
        updateAROverlayVisibility(false);
        Sound.tap();
      });
    }

    // AR Floating Detection HUD Overlay
    const arOverlay = document.createElement("div");
    arOverlay.id = "arLiveOverlay";
    arOverlay.className = "ar-live-overlay";
    arOverlay.innerHTML = `
      <div class="ar-hud-card" id="arHudCard">
        <div class="ar-hud-header">
          <span class="ar-hud-badge"><i class="ar-pulse-dot"></i> Pothole detected</span>
          <span class="chip risk-high" style="font-size:11px;padding:3px 7px">High</span>
        </div>
        <div class="ar-hud-metrics">
          <div class="ar-metric"><span>Approx. size</span><b>40 cm</b></div>
          <div class="ar-metric"><span>Distance</span><b>8 m ahead</b></div>
        </div>
        <div class="ar-hud-loc">📍 Sinwol-dong, Yangcheon-gu</div>
      </div>

      <!-- AR Dimension Measure Contour Box -->
      <div class="ar-live-contour" id="arLiveContour">
        <div class="ar-measure-ruler">
          <span class="ar-line-arrow"></span>
          <span class="ar-dimension-text">40 cm</span>
          <span class="ar-line-arrow"></span>
        </div>
      </div>

      <!-- Camera Floating Tool Actions -->
      <div class="ar-side-tools">
        <button type="button" class="ar-tool-btn" id="btnArTorch" title="Toggle flashlight" aria-label="Toggle flashlight">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 6l-3.5 3.5V17a2.5 2.5 0 0 1-5 0V9.5L6 6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2z"/><line x1="12" y1="12" x2="12" y2="12.01"/></svg>
        </button>
        <button type="button" class="ar-tool-btn" id="btnArRelock" title="Re-scan area" aria-label="Re-scan area">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="8"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>
        </button>
        <button type="button" class="ar-tool-btn" id="btnArGallery" title="Pick from gallery" aria-label="Choose photo from gallery">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        </button>
      </div>

      <!-- Live AR Instant Report Action Button -->
      <div class="ar-action-bar">
        <button type="button" class="btn lg ar-report-btn" id="btnArInstantReport">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>
          Report Issue
        </button>
      </div>
    `;

    scan.appendChild(arOverlay);

    // Bind Tool Buttons
    const btnTorch = arOverlay.querySelector("#btnArTorch");
    btnTorch.addEventListener("click", () => {
      torchActive = !torchActive;
      btnTorch.classList.toggle("active", torchActive);
      Sound.tap();
      toggleDeviceTorch(torchActive);
    });

    const btnRelock = arOverlay.querySelector("#btnArRelock");
    btnRelock.addEventListener("click", () => {
      Sound.lock();
      vibrate([15, 20]);
      triggerReticleLockAnim();
    });

    const btnGallery = arOverlay.querySelector("#btnArGallery");
    btnGallery.addEventListener("click", () => {
      Sound.tap();
      const lib = document.getElementById("fileLib");
      if (lib) lib.click();
    });

    const btnInstant = arOverlay.querySelector("#btnArInstantReport");
    btnInstant.addEventListener("click", () => {
      triggerCaptureFlow();
    });
  }

  function updateAROverlayVisibility(show) {
    const overlay = document.getElementById("arLiveOverlay");
    const reticle = document.getElementById("reticle");
    if (overlay) overlay.style.display = show ? "block" : "none";
    if (reticle) reticle.style.display = show ? "none" : "block";
  }

  function triggerReticleLockAnim() {
    const contour = document.getElementById("arLiveContour");
    const hud = document.getElementById("arHudCard");
    if (contour) {
      contour.classList.remove("ar-pulse-lock");
      void contour.offsetWidth;
      contour.classList.add("ar-pulse-lock");
    }
    if (hud) {
      hud.classList.remove("ar-hud-appear");
      void hud.offsetWidth;
      hud.classList.add("ar-hud-appear");
    }
  }

  function triggerCaptureFlow() {
    Sound.shutter();
    vibrate([25, 40]);
    const scan = document.getElementById("scan");
    if (scan) {
      scan.classList.add("camera-flash");
      setTimeout(() => scan.classList.remove("camera-flash"), 150);
    }
    const shutterBtn = document.querySelector('[data-act="shoot"]');
    if (shutterBtn) {
      shutterBtn.click();
    } else {
      const still = document.getElementById("still");
      if (still) still.hidden = false;
      const scanFoot = document.getElementById("scanFoot");
      if (scanFoot) {
        scanFoot.innerHTML = `<div class="analyzing"><ul class="status-lines on"><li class="on done"><span class="tick"></span>AI verified pothole (40 cm)</li></ul></div>`;
      }
    }
  }

  async function toggleDeviceTorch(on) {
    const video = document.getElementById("video");
    if (video && video.srcObject) {
      try {
        const track = video.srcObject.getVideoTracks()[0];
        if (track && track.applyConstraints) {
          await track.applyConstraints({
            advanced: [{ torch: on }]
          });
        }
      } catch(e) {}
    }
  }

  // -------------------------------------------------------------
  // 4. Leaderboard System (Poster Screen 5: People vs Neighborhoods)
  // -------------------------------------------------------------
  let activeBoardTab = "neighborhoods";

  const PEOPLE_LEADERBOARD = [
    { name: "Min-jun K. (민준)", dong: "Sinwol-dong", pts: 420, avatar: "MJ", delta: 0 },
    { name: "Ji-woo L. (지우)", dong: "Sinjeong-dong", pts: 380, avatar: "JW", delta: 0 },
    { name: "Seo-yeon P. (서연)", dong: "Mok-dong", pts: 310, avatar: "SY", delta: 0 },
    { name: "You (나)", dong: "Sinwol-dong", pts: 280, avatar: "ME", isMe: true, delta: 30 },
    { name: "Ha-eun C. (하은)", dong: "Sinwol-dong", pts: 240, avatar: "HE", delta: 0 },
    { name: "Do-hyun J. (도현)", dong: "Mok-dong", pts: 190, avatar: "DH", delta: 0 }
  ];

  function formatTimeRemaining() {
    const now = new Date();
    const daysUntilReset = (7 - now.getDay()) % 7;
    const hours = 23 - now.getHours();
    return `Resets in ${daysUntilReset}d ${hours}h`;
  }

  function renderEnhancedBoard() {
    const boardContainer = document.getElementById("boardBody");
    if (!boardContainer) return;

    const resetEl = document.getElementById("resetIn");
    if (resetEl) resetEl.textContent = formatTimeRemaining();

    // Inject Tabs if not present
    let tabWrap = document.getElementById("boardTabNav");
    if (!tabWrap) {
      tabWrap = document.createElement("div");
      tabWrap.id = "boardTabNav";
      tabWrap.className = "board-tab-nav";
      tabWrap.innerHTML = `
        <button type="button" class="board-tab-btn ${activeBoardTab==='people'?'active':''}" data-btab="people">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          People
        </button>
        <button type="button" class="board-tab-btn ${activeBoardTab==='neighborhoods'?'active':''}" data-btab="neighborhoods">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M3 7v14M21 7v14M6 11h4M6 15h4M14 11h4M14 15h4M9 3l3-2 3 2"/></svg>
          Neighborhoods
        </button>
      `;
      boardContainer.parentNode.insertBefore(tabWrap, boardContainer);

      tabWrap.querySelectorAll(".board-tab-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          activeBoardTab = btn.dataset.btab;
          tabWrap.querySelectorAll(".board-tab-btn").forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          Sound.tap();
          buildBoardContent();
        });
      });
    }

    buildBoardContent();
  }

  function buildBoardContent() {
    const boardContainer = document.getElementById("boardBody");
    if (!boardContainer) return;

    if (activeBoardTab === "people") {
      const top3 = PEOPLE_LEADERBOARD.slice(0, 3);
      const rest = PEOPLE_LEADERBOARD.slice(3);

      boardContainer.innerHTML = `
        <!-- Top 3 Podium for People -->
        <div class="podium" aria-label="Top 3 Citizen Reporters">
          <!-- 2nd Place -->
          <div class="podium-place second" style="--podium-delay:60ms;--podium-height:115px;--podium-color:#DCE2E1">
            <div class="podium-person">
              <span class="podium-avatar">🥈</span>
              <span class="podium-name">${escapeHtml(top3[1].name)}</span>
              <span class="podium-score">${top3[1].pts.toLocaleString()} <small>pts</small></span>
            </div>
            <div class="podium-base"><span class="podium-rank">2</span></div>
          </div>
          <!-- 1st Place (Gold) -->
          <div class="podium-place first" style="--podium-delay:0ms;--podium-height:145px;--podium-color:#F5E0A3">
            <div class="podium-person">
              <span class="podium-avatar">👑</span>
              <span class="podium-name">${escapeHtml(top3[0].name)}</span>
              <span class="podium-score">${top3[0].pts.toLocaleString()} <small>pts</small></span>
            </div>
            <div class="podium-base"><span class="podium-rank">1</span></div>
          </div>
          <!-- 3rd Place -->
          <div class="podium-place third" style="--podium-delay:120ms;--podium-height:95px;--podium-color:#E9D2C3">
            <div class="podium-person">
              <span class="podium-avatar">🥉</span>
              <span class="podium-name">${escapeHtml(top3[2].name)}</span>
              <span class="podium-score">${top3[2].pts.toLocaleString()} <small>pts</small></span>
            </div>
            <div class="podium-base"><span class="podium-rank">3</span></div>
          </div>
        </div>

        <!-- 4th Place Onwards -->
        <div class="leader-list">
          ${rest.map((p, idx) => `
            <div class="rank ${p.isMe ? 'me' : ''}">
              <span class="n">${idx + 4}</span>
              <span class="nm">
                ${escapeHtml(p.name)}
                <span class="small muted" style="display:block;font-weight:600">${escapeHtml(p.dong)}</span>
              </span>
              ${p.delta ? `<span class="delta contribution">+${p.delta}</span>` : ''}
              <span class="pts">${p.pts.toLocaleString()}</span>
            </div>
          `).join("")}
        </div>

        <div class="board-impact-banner">
          <span class="impact-horn">📣</span>
          <div>
            <b>You're in the top 4 this week!</b>
            <p class="small muted">Just 30 points behind 3rd place. Keep reporting to reach the podium!</p>
          </div>
        </div>
      `;
    } else {
      // Neighborhoods Tab
      const rawDongs = (window.BG?.S?.board?.dongs) || {
        "Sinwol 1-dong": 1240,
        "Yangcheon-gu": 1110,
        "Mok 1-dong": 980,
        "Gangseo-gu": 850,
        "Guro-gu": 720
      };

      const sorted = Object.entries(rawDongs)
        .map(([name, pts]) => ({ name, pts }))
        .sort((a, b) => b.pts - a.pts);

      const top3 = sorted.slice(0, 3);
      const rest = sorted.slice(3);

      boardContainer.innerHTML = `
        <!-- Top 3 Podium for Neighborhoods -->
        <div class="podium" aria-label="Top 3 Neighborhoods">
          <!-- 2nd Place -->
          <div class="podium-place second" style="--podium-delay:60ms;--podium-height:115px;--podium-color:#DCE2E1">
            <div class="podium-person">
              <span class="podium-avatar">🥈</span>
              <span class="podium-name">${escapeHtml(top3[1]?.name || "Yangcheon")}</span>
              <span class="podium-score">${(top3[1]?.pts || 1110).toLocaleString()} <small>pts</small></span>
            </div>
            <div class="podium-base"><span class="podium-rank">2</span></div>
          </div>
          <!-- 1st Place (Gold) -->
          <div class="podium-place first" style="--podium-delay:0ms;--podium-height:145px;--podium-color:#F5E0A3">
            <div class="podium-person">
              <span class="podium-avatar">🏆</span>
              <span class="podium-name">${escapeHtml(top3[0]?.name || "Sinwol 1-dong")}</span>
              <span class="podium-score">${(top3[0]?.pts || 1240).toLocaleString()} <small>pts</small></span>
            </div>
            <div class="podium-base"><span class="podium-rank">1</span></div>
          </div>
          <!-- 3rd Place -->
          <div class="podium-place third" style="--podium-delay:120ms;--podium-height:95px;--podium-color:#E9D2C3">
            <div class="podium-person">
              <span class="podium-avatar">🥉</span>
              <span class="podium-name">${escapeHtml(top3[2]?.name || "Mok-dong")}</span>
              <span class="podium-score">${(top3[2]?.pts || 980).toLocaleString()} <small>pts</small></span>
            </div>
            <div class="podium-base"><span class="podium-rank">3</span></div>
          </div>
        </div>

        <!-- Remaining Dongs -->
        <div class="leader-list">
          ${rest.map((r, idx) => `
            <div class="rank">
              <span class="n">${idx + 4}</span>
              <span class="nm">${escapeHtml(r.name)}</span>
              <span class="pts">${r.pts.toLocaleString()}</span>
            </div>
          `).join("")}
        </div>

        <!-- Banner: Your report moved Sinwol-dong to #1! -->
        <div class="board-impact-banner highlight">
          <span class="impact-horn">🎉</span>
          <div>
            <b>Your report moved Sinwol-dong to #1!</b>
            <p class="small" style="color:var(--green-dark);margin-top:2px">Thank you for making Yangcheon-gu safer and cleaner today.</p>
          </div>
        </div>
      `;
    }
  }

  // -------------------------------------------------------------
  // 5. Celebration & Confetti On Done Screen (Poster Screen 4)
  // -------------------------------------------------------------
  function enhanceDoneScreen() {
    const doneBody = document.getElementById("doneBody");
    if (!doneBody) return;

    Sound.reward();
    vibrate([20, 50, 30, 80]);
    spawnConfetti(doneBody, 55);

    const bigPts = document.getElementById("bigPts");
    if (bigPts) {
      bigPts.classList.add("reward-pop");
      bigPts.style.color = "var(--mustard-dark)";
    }
  }

  // -------------------------------------------------------------
  // 6. Navigation Transitions
  // -------------------------------------------------------------
  function setupTransitions() {
    document.addEventListener("click", e => {
      const btn = e.target.closest("[data-go]");
      if (!btn) return;
      Sound.tap();

      const screen = btn.dataset.go;
      if (screen === "board") {
        setTimeout(renderEnhancedBoard, 60);
      } else if (screen === "report") {
        setTimeout(() => {
          injectCameraHUD();
          updateAROverlayVisibility(arModeActive);
        }, 80);
      }
    });

    document.addEventListener("pointerdown", e => {
      const interactive = e.target.closest(".btn, .tile, .points-btn, .back, .icon-btn, .shutter, .ar-pill");
      if (interactive) {
        Sound.tap();
      }
    }, { passive: true });
  }

  // -------------------------------------------------------------
  // 7. Observer & Screen Change Watcher
  // -------------------------------------------------------------
  function observeScreenChanges() {
    const observer = new MutationObserver(mutations => {
      mutations.forEach(m => {
        if (m.type === "attributes" && m.attributeName === "class") {
          const target = m.target;
          if (target.classList.contains("screen") && target.classList.contains("on")) {
            const screen = target.dataset.screen;
            if (screen === "home") {
              target.classList.add("home-enter");
            } else if (screen === "board") {
              renderEnhancedBoard();
            } else if (screen === "done") {
              enhanceDoneScreen();
            } else if (screen === "review") {
              const body = document.getElementById("reviewBody");
              if (body) body.classList.add("review-enter");
            }
          }
        }
      });
    });

    document.querySelectorAll(".screen").forEach(s => {
      observer.observe(s, { attributes: true });
    });

    const scan = document.getElementById("scan");
    if (scan) {
      const scanObs = new MutationObserver(() => {
        if (scan.classList.contains("on")) {
          injectCameraHUD();
          updateAROverlayVisibility(arModeActive);
        }
      });
      scanObs.observe(scan, { attributes: true });
    }
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str).replace(/[&<>"']/g, m => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[m]);
  }

  // -------------------------------------------------------------
  // 8. Initialization
  // -------------------------------------------------------------
  function init() {
    setupTransitions();
    observeScreenChanges();

    const activeScreen = document.querySelector(".screen.on");
    if (activeScreen) {
      if (activeScreen.dataset.screen === "home") activeScreen.classList.add("home-enter");
      if (activeScreen.dataset.screen === "board") renderEnhancedBoard();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Expose Motion API to window
  window.BGMotion = {
    Sound,
    spawnConfetti,
    renderEnhancedBoard,
    enhanceDoneScreen,
    triggerReticleLockAnim,
    setSound(val) {
      soundEnabled = !!val;
      try { localStorage.setItem("bg_sound", soundEnabled ? "1" : "0"); } catch(e) {}
    }
  };

})();
