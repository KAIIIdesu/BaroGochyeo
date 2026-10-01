/* BaroGochyeo — MOCK authentication adapter (local demo only).

   This is not real authentication. There is no server, no password and no cloud sync.
   It keeps a list of demo profiles in this browser and remembers which one is active.
   Nothing secret is ever stored: only a display name, an email-shaped identifier,
   a neighborhood and an avatar style.

   To connect a real backend, replace this file and keep the same interface:
     BGAuth.session()            -> {id, name, email, dong, avatar} | null
     BGAuth.namespace()          -> storage namespace for the active person's private data
     BGAuth.entered()            -> has this device passed the welcome screen before
     BGAuth.accounts()           -> demo profiles on this device (demo-only helper)
     BGAuth.register(fields)     -> Promise<session>   (rejects with {code, field, message})
     BGAuth.signIn({email})      -> Promise<session>   (rejects with {code, field, message})
     BGAuth.signOut()            -> Promise<void>
     BGAuth.continueAsGuest()    -> void
     BGAuth.update(fields)       -> session
     BGAuth.onChange(fn)         -> unsubscribe */
(() => {
  "use strict";
  const KEY = "bg_auth_v1", GUEST_NS = "local", LATENCY = 650;
  const AVATARS = ["sage", "blue", "mustard", "coral"];
  const subs = new Set();
  let mem = null; /* fallback when storage is blocked */

  function load() {
    try { const s = JSON.parse(localStorage.getItem(KEY) || "null"); if (s && Array.isArray(s.accounts)) return s; } catch {}
    return mem || { accounts: [], current: null, entered: false };
  }
  function save(s) { mem = s; try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} subs.forEach(f => f(session())); }
  const wait = () => new Promise(r => setTimeout(r, LATENCY));
  const fail = (code, field, message) => Object.assign(new Error(message), { code, field, message });
  const norm = e => String(e || "").trim().toLowerCase();

  function session() { const s = load(); return s.accounts.find(a => a.id === s.current) || null; }
  function namespace() { const a = session(); return a ? "u_" + a.id : GUEST_NS; }

  function validate({ name, email, dong }, forRegister) {
    const e = norm(email);
    if (forRegister && !(String(name || "").trim().length >= 2)) return fail("invalid_name", "name", "Enter a display name with at least 2 characters.");
    if (forRegister && String(name).trim().length > 24) return fail("invalid_name", "name", "Keep the display name under 24 characters.");
    if (!e) return fail("missing_email", "email", "Enter an email-shaped demo ID, like you@example.com.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) return fail("invalid_email", "email", "That doesn't look like an email. Try name@example.com.");
    if (forRegister && !dong) return fail("missing_dong", "dong", "Choose your neighborhood.");
    return null;
  }

  async function register(fields) {
    const bad = validate(fields, true); if (bad) throw bad;
    await wait();
    if (navigator.onLine === false) throw fail("offline", null, "You're offline. The demo keeps data on this device, but try again once you're back online.");
    const s = load(), email = norm(fields.email);
    if (s.accounts.some(a => a.email === email)) throw fail("exists", "email", "A demo profile with this ID already exists on this device. Log in instead.");
    const acct = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: String(fields.name).trim(), email, dong: fields.dong,
      avatar: AVATARS.includes(fields.avatar) ? fields.avatar : AVATARS[0], createdAt: Date.now() };
    s.accounts.push(acct); s.current = acct.id; s.entered = true; save(s);
    return acct;
  }
  async function signIn(fields) {
    const bad = validate(fields, false); if (bad) throw bad;
    await wait();
    const s = load(), acct = s.accounts.find(a => a.email === norm(fields.email));
    if (!acct) throw fail("not_found", "email", "No demo profile with this ID on this device. Create one first.");
    s.current = acct.id; s.entered = true; save(s);
    return acct;
  }
  async function signOut() { await new Promise(r => setTimeout(r, 250)); const s = load(); s.current = null; save(s); }
  function continueAsGuest() { const s = load(); s.current = null; s.entered = true; save(s); }
  function update(fields) { const s = load(), a = s.accounts.find(x => x.id === s.current); if (!a) return null; Object.assign(a, fields); save(s); return a; }

  window.BGAuth = {
    GUEST_NS, AVATARS, session, namespace, validate, register, signIn, signOut, continueAsGuest, update,
    entered: () => load().entered,
    accounts: () => load().accounts.map(({ id, name, email, avatar }) => ({ id, name, email, avatar })),
    onChange: fn => { subs.add(fn); return () => subs.delete(fn); }
  };
})();
