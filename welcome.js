document.addEventListener("DOMContentLoaded", () => {
const openPopupBtn = document.getElementById("openPopupBtn");

if (openPopupBtn) {
openPopupBtn.addEventListener("click", () => {
const popupUrl = chrome.runtime.getURL("popup.html");

chrome.storage.local.set({ smartStretchWelcomeSeen: true }, () => {
try {
const width = 460;
const height = 820;

const left = Math.max(0, Math.round((screen.availWidth - width) / 2));
const top = Math.max(0, Math.round((screen.availHeight - height) / 2));

window.open(
popupUrl,
"SmartStretchPopup",
`width=${width},height=${height},left=${left},top=${top},resizable=no,scrollbars=yes`
);

window.close();
} catch (error) {
window.location.href = popupUrl;
}
});
});
}
});