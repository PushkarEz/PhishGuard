// popup.js — PhishGuard v3

const $ = id => document.getElementById(id);
let currentUrl = "";

const ICONS   = { red:"🚨", orange:"⚠️", green:"✅" };
const ACTIONS = {
  red:    "⛔ Do NOT enter passwords or personal info.\nThis site is likely a phishing fake.",
  orange: "⚠️ Proceed with caution.\nAvoid entering any sensitive data here.",
  green:  "✔ This site passed all security checks.\nSafe to browse normally.",
};
const STATUS  = {
  red:    { cls:"danger",   text:"🚨 Danger — do not proceed" },
  orange: { cls:"warn",     text:"⚠️  Suspicious — be very careful" },
  green:  { cls:"safe",     text:"✅ Auto-scan complete — site is safe" },
};

// ── INIT ───────────────────────────────────────────────────────────────────
chrome.tabs.query({ active:true, currentWindow:true }, tabs => {
  currentUrl = tabs[0]?.url || "";
  const display = $("url-display");

  if (!currentUrl.startsWith("http")) {
    display.textContent = "Cannot scan this page.";
    setStatus("", "No HTTP URL detected");
    $("live-dot").className = "sdot off";
    $("live-label").textContent = "N/A";
    return;
  }
  display.textContent = currentUrl;

  chrome.runtime.sendMessage({ type:"GET_RESULT", url:currentUrl }, res => {
    if (!res || res.status === "none") {
      setStatus("", "Not scanned yet");
      $("scan-btn").classList.add("show");
      $("live-dot").className = "sdot off";
    } else if (res.status === "scanning") {
      setStatus("scanning", "Auto-scanning in background...");
      $("live-dot").className = "sdot scanning";
      $("live-label").textContent = "SCANNING";
      showScanning();
      pollResult();
    } else if (res.status === "done" && res.data) {
      render(res.data);
    } else {
      setStatus("", "Scan failed");
      $("scan-btn").classList.add("show");
      $("live-dot").className = "sdot off";
    }
  });
});

// ── MANUAL SCAN ────────────────────────────────────────────────────────────
$("scan-btn").onclick = () => {
  $("scan-btn").classList.remove("show");
  startScan();
};
$("rescan-btn").onclick = () => {
  $("rescan-btn").classList.remove("show");
  $("res-card").className = "res-card";
  startScan();
};

function startScan() {
  setStatus("scanning", "Scanning...");
  $("live-dot").className = "sdot scanning";
  $("live-label").textContent = "SCANNING";
  showScanning();
  chrome.runtime.sendMessage({ type:"MANUAL_SCAN", url:currentUrl }, res => {
    if (res?.status === "done" && res.data) render(res.data);
    else {
      hideScanning();
      setStatus("", "Scan failed — is Flask running?");
      $("scan-btn").classList.add("show");
      $("live-dot").className = "sdot off";
    }
  });
}

// ── POLL ───────────────────────────────────────────────────────────────────
function pollResult() {
  const iv = setInterval(() => {
    chrome.runtime.sendMessage({ type:"GET_RESULT", url:currentUrl }, res => {
      if (res?.status === "done" && res.data) { clearInterval(iv); render(res.data); }
      else if (res?.status === "error")        { clearInterval(iv); hideScanning(); setStatus("","Scan failed"); $("scan-btn").classList.add("show"); }
    });
  }, 3000);
  setTimeout(() => clearInterval(iv), 90000);
}

// ── RENDER RESULT ──────────────────────────────────────────────────────────
function render(data) {
  hideScanning();
  $("scan-btn").classList.remove("show");

  if (data.error) { setStatus("","Error: "+data.error); $("scan-btn").classList.add("show"); return; }

  const c = ["red","orange","green"].includes(data.color) ? data.color : "orange";

  // Header live dot
  const ld = { red:"danger", orange:"warn", green:"safe" };
  $("live-dot").className = `sdot ${c === "green" ? "on" : "off"}`;
  $("live-label").textContent = c === "green" ? "SAFE" : c === "red" ? "DANGER" : "WARN";
  setStatus(ld[c], STATUS[c].text);

  // Hero
  $("res-icon").textContent    = ICONS[c];
  $("res-verdict").textContent = data.verdict;
  $("res-verdict").className   = `res-verdict ${c}`;
  $("res-action").textContent  = ACTIONS[c];
  $("res-hero").className      = `res-hero ${c}`;

  // Stats
  const stats = [
    { v: data.malicious||0,  l:"Malicious", c: (data.malicious||0)>0?"red":"muted" },
    { v: data.suspicious||0, l:"Suspicious",c: (data.suspicious||0)>0?"orange":"muted" },
    { v: data.harmless||0,   l:"Clean",     c: "green" },
    { v: data.undetected||0, l:"Unknown",   c: "muted" },
  ];
  $("stat-row").innerHTML = stats.map(s =>
    `<div class="stat-box">
      <div class="stat-val ${s.c}">${s.v}</div>
      <div class="stat-lbl">${s.l}</div>
    </div>`
  ).join("");

  // AI
  if (data.ai_report) {
    $("ai-text").textContent = data.ai_report;
    $("ai-box").style.display = "";
  } else {
    $("ai-box").style.display = "none";
  }

  $("res-card").className = `res-card show ${c}`;
  $("rescan-btn").classList.add("show");
}

function showScanning() { $("scan-card").classList.add("show"); }
function hideScanning()  { $("scan-card").classList.remove("show"); }

function setStatus(type, text) {
  const dot = $("status-dot");
  dot.className = `status-dot ${type}`;
  $("status-text").textContent = text;
}
