// background.js — PhishGuard v3
// Auto-scans every HTTP tab immediately on load

const BACKEND_URL = "http://localhost:5000";
const CACHE = {}; // url -> result (session memory)

function urlKey(url) {
  return "pg_" + btoa(encodeURIComponent(url)).replace(/[^a-zA-Z0-9]/g, "").slice(0, 90);
}

// ── AUTO-SCAN ON TAB LOAD ──────────────────────────────────────────────────
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete") return;
  if (!tab.url || !tab.url.startsWith("http")) return;
  const url = tab.url;

  // Already have result — just push to content script
  if (CACHE[url] && !CACHE[url]._error) {
    pushToContent(tabId, CACHE[url]);
    return;
  }

  // Mark scanning
  chrome.storage.local.set({ [urlKey(url)]: { status: "scanning" } });

  doScan(url).then(data => {
    CACHE[url] = data;
    chrome.storage.local.set({ [urlKey(url)]: { status: "done", data } });
    pushToContent(tabId, data);
  }).catch(err => {
    CACHE[url] = { _error: true };
    chrome.storage.local.set({ [urlKey(url)]: { status: "error", msg: err.message } });
  });
});

async function doScan(url) {
  const res = await fetch(`${BACKEND_URL}/check-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

function pushToContent(tabId, data) {
  chrome.tabs.sendMessage(tabId, { type: "SCAN_RESULT", data }).catch(() => {});
}

// ── POPUP MESSAGES ─────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  if (msg.type === "GET_RESULT") {
    const mem = CACHE[msg.url];
    if (mem && !mem._error) {
      sendResponse({ status: "done", data: mem });
      return;
    }
    chrome.storage.local.get([urlKey(msg.url)], items => {
      sendResponse(items[urlKey(msg.url)] || { status: "none" });
    });
    return true;
  }

  if (msg.type === "MANUAL_SCAN") {
    delete CACHE[msg.url];
    chrome.storage.local.set({ [urlKey(msg.url)]: { status: "scanning" } });
    doScan(msg.url).then(data => {
      CACHE[msg.url] = data;
      chrome.storage.local.set({ [urlKey(msg.url)]: { status: "done", data } });
      sendResponse({ status: "done", data });
      chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        if (tabs[0]?.id) pushToContent(tabs[0].id, data);
      });
    }).catch(e => {
      sendResponse({ status: "error", msg: e.message });
    });
    return true;
  }

});
