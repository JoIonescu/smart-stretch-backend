let timerInterval = null;
let popupRefreshInterval = null;

function sendMessage(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      resolve(response);
    });
  });
}

function formatRemaining(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatTime(timestamp) {
  if (!timestamp) return "";
  const d = new Date(timestamp);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

function setTimerInactive() {
  const el = document.getElementById("timerDisplay");
  if (el) el.textContent = "Timer Inactive";
}

function stopPopupTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

/* ---- Stats carousel (original) ---- */

function updateCarouselDots() {
  const carousel = document.getElementById("statsCarousel");
  const dot0 = document.getElementById("dot0");
  const dot1 = document.getElementById("dot1");
  if (!carousel || !dot0 || !dot1) return;

  const slideIndex = Math.round(carousel.scrollLeft / carousel.clientWidth);
  dot0.classList.toggle("active", slideIndex === 0);
  dot1.classList.toggle("active", slideIndex >= 1);
}

function scrollToStatsSlide(index) {
  const carousel = document.getElementById("statsCarousel");
  if (!carousel) return;

  carousel.scrollTo({ left: carousel.clientWidth * index, behavior: "smooth" });

  const dot0 = document.getElementById("dot0");
  const dot1 = document.getElementById("dot1");
  if (dot0 && dot1) {
    dot0.classList.toggle("active", index === 0);
    dot1.classList.toggle("active", index === 1);
  }
}

function initStatsCarousel() {
  const carousel = document.getElementById("statsCarousel");
  const dot0 = document.getElementById("dot0");
  const dot1 = document.getElementById("dot1");
  if (!carousel) return;

  requestAnimationFrame(() => {
    carousel.scrollLeft = carousel.clientWidth;
    updateCarouselDots();
  });

  carousel.addEventListener("scroll", updateCarouselDots);
  dot0?.addEventListener("click", () => scrollToStatsSlide(0));
  dot1?.addEventListener("click", () => scrollToStatsSlide(1));
}

async function loadStats() {
  const res = await sendMessage({ type: "getSmartStats" });
  if (!res?.ok) return;

  const stats = res.stats || {};
  const lastWeekStats = res.lastWeekStats || {};

  const completedCount = document.getElementById("completedCount");
  const snoozedCount   = document.getElementById("snoozedCount");
  const skippedCount   = document.getElementById("skippedCount");

  if (completedCount) completedCount.textContent = stats.completedCount ?? 0;
  if (snoozedCount)   snoozedCount.textContent   = stats.snoozedCount   ?? 0;
  if (skippedCount)   skippedCount.textContent   = stats.skippedCount   ?? 0;

  const lastCompleted = document.getElementById("lastCompletedCount");
  const lastSnoozed   = document.getElementById("lastSnoozedCount");
  const lastSkipped   = document.getElementById("lastSkippedCount");

  if (lastCompleted) lastCompleted.textContent = lastWeekStats.completedCount ?? 0;
  if (lastSnoozed)   lastSnoozed.textContent   = lastWeekStats.snoozedCount   ?? 0;
  if (lastSkipped)   lastSkipped.textContent   = lastWeekStats.skippedCount   ?? 0;
}

/* ---- Timer ---- */

async function startPopupTimerFromState(settings) {
  stopPopupTimer();

  const timerDisplay = document.getElementById("timerDisplay");
  const timerLabel   = document.getElementById("timerLabel");
  if (!timerDisplay) return;

  // Meeting in progress — show meeting state, no countdown
  if (settings.stretchReminderState === "in_meeting") {
    if (timerLabel) timerLabel.textContent = "Meeting in progress";
    if (settings.meetingEndTime) {
      timerDisplay.textContent = `Until ${formatTime(settings.meetingEndTime)}`;
    } else {
      timerDisplay.textContent = "Stretch paused";
    }
    // Apply blue colour to match badge
    timerDisplay.style.color = "var(--blue)";
    return;
  }

  // Reset label and colour for normal states
  if (timerLabel) timerLabel.textContent = "Next stretch break";
  timerDisplay.style.color = "var(--yellow)";

  if (
    settings.stretchReminderState === "shown"
  ) {
    setTimerInactive();
    return;
  }

  if (!settings.startTime || !settings.stretchInterval) {
    setTimerInactive();
    return;
  }

  const render = () => {
    const totalMs   = settings.stretchInterval * 60 * 1000;
    const elapsed   = Date.now() - settings.startTime;
    const remaining = totalMs - elapsed;
    if (remaining <= 0) { timerDisplay.textContent = "0:00"; return; }
    timerDisplay.textContent = formatRemaining(remaining);
  };

  render();
  timerInterval = setInterval(render, 1000);
}

async function loadSettings() {
  const res = await sendMessage({ type: "getSettings" });
  if (!res?.ok) return;

  const intervalSelect  = document.getElementById("intervalSelect");
  const smartModeToggle = document.getElementById("smartModeToggle");
  const soundToggle     = document.getElementById("soundToggle");

  if (intervalSelect)  intervalSelect.value   = String(res.stretchInterval || 30);
  if (smartModeToggle) smartModeToggle.checked = !!res.smartModeEnabled;
  if (soundToggle)     soundToggle.checked     = !!res.soundEnabled;

  await startPopupTimerFromState(res);
}

/* ---- Pro license UI ---- */

async function loadLicenseStatus() {
  const res = await sendMessage({ type: "getLicenseStatus" });
  const isPro = res?.isPro || false;

  const proBadge            = document.getElementById("proBadge");
  const upgradeCard         = document.getElementById("upgradeCard");
  const proIntegrationsCard = document.getElementById("proIntegrationsCard");

  if (isPro) {
    if (proBadge)            proBadge.style.display           = "inline-block";
    if (upgradeCard)         upgradeCard.style.display         = "none";
    if (proIntegrationsCard) proIntegrationsCard.style.display = "block";
  } else {
    if (proBadge)            proBadge.style.display           = "none";
    if (upgradeCard)         upgradeCard.style.display         = "block";
    if (proIntegrationsCard) proIntegrationsCard.style.display = "none";
  }

  return isPro;
}

async function loadIntegrationSettings() {
  const res = await sendMessage({ type: "getIntegrationSettings" });
  if (!res?.ok) return;

  const calendarToggle = document.getElementById("calendarToggle");
  const calendarStatus = document.getElementById("calendarStatus");

  if (calendarToggle) calendarToggle.checked      = !!res.calendarEnabled;
  if (calendarStatus) calendarStatus.style.display = res.calendarEnabled ? "block" : "none";
}

function showPendingState() {
  const verifyBtn   = document.getElementById("verifyBtn");
  const pendingNote = document.getElementById("pendingNote");
  const upgradeBtn  = document.getElementById("upgradeBtn");

  if (verifyBtn)   verifyBtn.style.display  = "block";
  if (pendingNote) pendingNote.style.display = "block";
  if (upgradeBtn)  upgradeBtn.textContent    = "Upgrade — €3.00 ↗";
}

/* ---- Init ---- */

async function init() {
  initStatsCarousel();
  await loadSettings();
  await loadStats();

  const isPro = await loadLicenseStatus();

  if (!isPro) {
    const pending = await new Promise((resolve) => {
      chrome.storage.local.get(["pendingSessionId"], (d) => resolve(d.pendingSessionId || null));
    });
    if (pending) showPendingState();
  }

  if (isPro) {
    await loadIntegrationSettings();
  }

  /* ---- Original button handlers ---- */

  const startBtn        = document.getElementById("startBtn");
  const stopBtn         = document.getElementById("stopBtn");
  const intervalSelect  = document.getElementById("intervalSelect");
  const smartModeToggle = document.getElementById("smartModeToggle");
  const soundToggle     = document.getElementById("soundToggle");

  startBtn?.addEventListener("click", async () => {
    const minutes = Number(intervalSelect?.value || 30);
    const res = await sendMessage({ type: "startTimer", minutes });
    if (res?.ok) await loadSettings();
  });

  stopBtn?.addEventListener("click", async () => {
    const res = await sendMessage({ type: "stopTimer" });
    if (res?.ok) { stopPopupTimer(); setTimerInactive(); }
  });

  intervalSelect?.addEventListener("change", async () => {
    const minutes = Number(intervalSelect.value || 30);
    await sendMessage({ type: "setStretchInterval", minutes });
    await loadSettings();
  });

  smartModeToggle?.addEventListener("change", async () => {
    await sendMessage({ type: "setSmartMode", enabled: smartModeToggle.checked });
  });

  soundToggle?.addEventListener("change", async () => {
    await sendMessage({ type: "setSound", enabled: soundToggle.checked });
  });

  /* ---- Upgrade button ---- */

  const upgradeBtn = document.getElementById("upgradeBtn");
  upgradeBtn?.addEventListener("click", async () => {
    upgradeBtn.textContent = "Opening checkout…";
    upgradeBtn.disabled    = true;

    const res = await sendMessage({ type: "startCheckout" });

    upgradeBtn.disabled = false;

    if (res?.ok) {
      showPendingState();
    } else {
      upgradeBtn.textContent = "Upgrade — €3.00";
      alert("Could not open checkout. Please try again.");
    }
  });

  /* ---- Verify payment button ---- */

  const verifyBtn = document.getElementById("verifyBtn");
  verifyBtn?.addEventListener("click", async () => {
    verifyBtn.textContent = "Verifying…";
    verifyBtn.disabled    = true;

    const res = await sendMessage({ type: "verifyPayment" });

    if (res?.paid) {
      await loadLicenseStatus();
      await loadIntegrationSettings();
    } else {
      verifyBtn.textContent = "✓ I've paid — Verify Payment";
      verifyBtn.disabled    = false;
      const pendingNote = document.getElementById("pendingNote");
      if (pendingNote) {
        pendingNote.textContent = "Payment not found yet. Complete checkout in the other tab, then try again.";
      }
    }
  });

  /* ---- Calendar toggle ---- */

  const calendarToggle = document.getElementById("calendarToggle");
  const calendarStatus = document.getElementById("calendarStatus");

  calendarToggle?.addEventListener("change", async () => {
    await sendMessage({ type: "setCalendarEnabled", enabled: calendarToggle.checked });
    if (calendarStatus) {
      calendarStatus.style.display = calendarToggle.checked ? "block" : "none";
    }
  });

  /* ---- Periodic refresh (original) ---- */

  if (popupRefreshInterval) clearInterval(popupRefreshInterval);

  popupRefreshInterval = setInterval(async () => {
    await loadSettings();
    await loadStats();
  }, 3000);
}

/* ---- Info button — wired immediately, no async dependency ---- */

document.addEventListener("DOMContentLoaded", () => {
  const infoBtn   = document.getElementById("infoBtn");
  const infoPanel = document.getElementById("infoPanel");

  if (infoBtn && infoPanel) {
    infoBtn.addEventListener("click", () => {
      const isOpen = infoPanel.classList.toggle("open");
      infoBtn.classList.toggle("active", isOpen);
    });
  }

  init();
});