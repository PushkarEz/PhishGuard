// content.js — PhishGuard v3
// Shows website-matching teal banner + blocks forms on dangerous sites

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "SCAN_RESULT") {
    showBanner(msg.data);
    if (msg.data?.color === "red") blockForms();
  }
});

function showBanner(data) {
  const old = document.getElementById("pg-banner");
  if (old) old.remove();
  if (!data || data.error) return;

  // Colours matching website exactly
  const cfg = {
    red:    { bg: "rgba(255,59,59,0.96)",  border: "#ff3b3b", text: "#fff",     icon: "🚨", label: "DANGER",     msg: "⛔ Do NOT enter any passwords or personal info here." },
    orange: { bg: "rgba(245,158,11,0.95)", border: "#f59e0b", text: "#fff",     icon: "⚠️", label: "SUSPICIOUS", msg: "Be cautious. Avoid entering sensitive data on this site." },
    green:  { bg: "rgba(13,148,136,0.95)", border: "#0d9488", text: "#fff",     icon: "✅", label: "SAFE",       msg: "This site passed all security checks." },
  };
  const c = cfg[data.color] || cfg.orange;

  // Inject keyframes once
  if (!document.getElementById("pg-kf")) {
    const s = document.createElement("style");
    s.id = "pg-kf";
    s.textContent = `
      @keyframes pg-in { from{transform:translateY(-110%);opacity:0} to{transform:translateY(0);opacity:1} }
    `;
    document.head.appendChild(s);
  }

  const banner = document.createElement("div");
  banner.id = "pg-banner";
  banner.setAttribute("style", `
    all:initial!important;
    position:fixed!important;top:0!important;left:0!important;right:0!important;
    z-index:2147483647!important;
    background:${c.bg}!important;
    border-bottom:2px solid ${c.border}!important;
    font-family:'Segoe UI',sans-serif!important;
    display:flex!important;align-items:center!important;gap:10px!important;
    padding:10px 18px!important;
    box-shadow:0 4px 24px rgba(0,0,0,0.25)!important;
    animation:pg-in 0.35s cubic-bezier(.22,.68,0,1.2)!important;
  `);

  banner.innerHTML = `
    <span style="all:unset;font-size:20px">${c.icon}</span>
    <span style="all:unset;font-family:monospace;font-size:10px;font-weight:700;letter-spacing:2px;
      background:rgba(255,255,255,0.22);padding:2px 9px;border-radius:20px;color:${c.text}">
      PhishGuard · ${c.label}
    </span>
    <span style="all:unset;flex:1;font-size:12px;color:${c.text};opacity:0.95">
      <strong style="all:unset;font-weight:700">${data.verdict}</strong>
      &nbsp;—&nbsp;${c.msg}
    </span>
    <span style="all:unset;font-size:10px;color:rgba(255,255,255,0.65)">ByteX · VirusTotal</span>
    <button id="pg-x" style="all:unset;cursor:pointer;border:1px solid rgba(255,255,255,0.4);
      color:#fff;padding:3px 11px;border-radius:20px;font-size:11px;margin-left:6px">✕</button>
  `;

  document.body.prepend(banner);
  document.getElementById("pg-x").onclick = () => banner.remove();
  if (data.color === "green") setTimeout(() => banner?.remove(), 8000);
}

// ── FORM BLOCKER ─────────────────────────────────────────────────────────
function blockForms() {
  document.querySelectorAll("form").forEach(f => f.addEventListener("submit", stopSubmit, true));
  document.querySelectorAll('input[type=password]').forEach(i => i.addEventListener("focus", showModal, true));

  new MutationObserver(() => {
    document.querySelectorAll("form:not([data-pg])").forEach(f => {
      f.setAttribute("data-pg","1");
      f.addEventListener("submit", stopSubmit, true);
    });
  }).observe(document.body, { childList:true, subtree:true });
}

function stopSubmit(e) { e.preventDefault(); e.stopImmediatePropagation(); showModal(); }

function showModal() {
  if (document.getElementById("pg-modal")) return;

  // Inject animation
  if (!document.getElementById("pg-modal-kf")) {
    const s = document.createElement("style");
    s.id = "pg-modal-kf";
    s.textContent = `@keyframes pg-pop{from{opacity:0;transform:scale(0.92)}to{opacity:1;transform:scale(1)}}`;
    document.head.appendChild(s);
  }

  const ov = document.createElement("div");
  ov.id = "pg-modal";
  ov.style.cssText = `
    position:fixed;inset:0;z-index:2147483646;
    background:rgba(4,20,18,0.88);
    display:flex;align-items:center;justify-content:center;
    font-family:'Segoe UI',sans-serif;
    backdrop-filter:blur(6px);
  `;
  ov.innerHTML = `
    <div style="
      background:#e6f7f5;
      border:2px solid #0d9488;
      border-radius:18px;
      padding:36px 30px 28px;
      max-width:400px;width:90%;
      text-align:center;
      box-shadow:0 8px 60px rgba(13,148,136,0.35);
      animation:pg-pop 0.25s ease;
    ">
      <div style="font-size:54px;margin-bottom:14px">🚨</div>
      <div style="font-family:monospace;font-size:10px;letter-spacing:2px;color:#0d9488;margin-bottom:10px;font-weight:700">PHISHGUARD · THREAT BLOCKED</div>
      <h2 style="font-size:20px;font-weight:800;color:#0d1f1c;margin-bottom:10px;line-height:1.3;font-family:'Segoe UI',sans-serif">
        This site is likely FAKE
      </h2>
      <p style="font-size:13px;color:#374151;line-height:1.7;margin-bottom:8px">
        VirusTotal flagged this URL as <strong style="color:#dc2626">malicious</strong>.<br>
        Submitting this form could expose your personal data.
      </p>
      <p style="font-size:13px;color:#0d9488;font-weight:700;margin-bottom:24px">
        Do NOT enter your password, OTP, or any personal info.
      </p>
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
        <button id="pg-back" style="
          background:#0d9488;color:#fff;border:none;
          padding:11px 24px;border-radius:10px;
          font-size:14px;font-weight:700;cursor:pointer;
          font-family:'Segoe UI',sans-serif;
          box-shadow:0 4px 16px rgba(13,148,136,0.3);
        ">← Go Back to Safety</button>
        <button id="pg-skip" style="
          background:transparent;color:#9ca3af;border:1px solid #d1d5db;
          padding:11px 18px;border-radius:10px;
          font-size:13px;cursor:pointer;
          font-family:'Segoe UI',sans-serif;
        ">Proceed anyway (risky)</button>
      </div>
    </div>
  `;
  document.body.appendChild(ov);

  document.getElementById("pg-back").onclick = () => { window.history.back(); ov.remove(); };
  document.getElementById("pg-skip").onclick = () => {
    ov.remove();
    document.querySelectorAll("form").forEach(f => f.removeEventListener("submit", stopSubmit, true));
  };
}
