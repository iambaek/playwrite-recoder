const DEFAULT_SETTINGS = {
  defaultReuseSession: true,
  defaultUseDelay: true,
  liveSyncIntervalMs: 500,
  testIdAttribute: "data-testid",
  openSidePanelOnActionClick: true
};

const elements = {
  defaultReuseSession: document.getElementById("defaultReuseSession"),
  defaultUseDelay: document.getElementById("defaultUseDelay"),
  liveSyncIntervalMs: document.getElementById("liveSyncIntervalMs"),
  testIdAttribute: document.getElementById("testIdAttribute"),
  openSidePanelOnActionClick: document.getElementById("openSidePanelOnActionClick"),
  saveBtn: document.getElementById("saveBtn"),
  resetBtn: document.getElementById("resetBtn"),
  status: document.getElementById("status")
};

function setStatus(message) {
  elements.status.textContent = message;
}

function readForm() {
  return {
    defaultReuseSession: elements.defaultReuseSession.checked,
    defaultUseDelay: elements.defaultUseDelay.checked,
    liveSyncIntervalMs: Math.max(100, Number(elements.liveSyncIntervalMs.value) || DEFAULT_SETTINGS.liveSyncIntervalMs),
    testIdAttribute: (elements.testIdAttribute.value || DEFAULT_SETTINGS.testIdAttribute).trim(),
    openSidePanelOnActionClick: elements.openSidePanelOnActionClick.checked
  };
}

function writeForm(settings) {
  elements.defaultReuseSession.checked = settings.defaultReuseSession;
  elements.defaultUseDelay.checked = settings.defaultUseDelay;
  elements.liveSyncIntervalMs.value = String(settings.liveSyncIntervalMs);
  elements.testIdAttribute.value = settings.testIdAttribute;
  elements.openSidePanelOnActionClick.checked = settings.openSidePanelOnActionClick;
}

async function loadSettings() {
  const stored = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  writeForm(stored);
  setStatus("Loaded");
}

elements.saveBtn.addEventListener("click", async () => {
  await chrome.storage.sync.set(readForm());
  setStatus("Saved");
});

elements.resetBtn.addEventListener("click", async () => {
  await chrome.storage.sync.set(DEFAULT_SETTINGS);
  writeForm(DEFAULT_SETTINGS);
  setStatus("Reset to defaults");
});

loadSettings().catch((error) => {
  setStatus("Load failed: " + error.message);
});
