// This page is opened in a dedicated window when the user enables
// Google Calendar. It handles the interactive OAuth flow, which
// cannot run from the popup (popup closes on focus loss).

const iconEl     = document.getElementById("icon");
const titleEl    = document.getElementById("title");
const subEl      = document.getElementById("sub");
const statusOk   = document.getElementById("statusOk");
const statusErr  = document.getElementById("statusErr");

function showSuccess() {
  if (iconEl)   iconEl.textContent  = "✅";
  if (titleEl)  titleEl.textContent = "Google Calendar connected";
  if (subEl)    subEl.style.display = "none";
  if (statusOk) statusOk.style.display = "block";
  setTimeout(() => window.close(), 1800);
}

function showError(msg) {
  if (iconEl)    iconEl.textContent  = "❌";
  if (titleEl)   titleEl.textContent = "Connection failed";
  if (subEl)     subEl.textContent   = msg || "Please try again from the extension.";
  if (statusErr) statusErr.style.display = "block";
  setTimeout(() => window.close(), 3000);
}

chrome.identity.getAuthToken({ interactive: true }, (token) => {
  if (chrome.runtime.lastError || !token) {
    const msg = chrome.runtime.lastError?.message || "Unknown error";
    console.warn("OAuth failed:", msg);

    // Tell background auth failed — disable calendar setting
    chrome.runtime.sendMessage({ type: "calendarAuthResult", success: false });
    showError(msg);
    return;
  }

  // Tell background auth succeeded
  chrome.runtime.sendMessage({ type: "calendarAuthResult", success: true });
  showSuccess();
});