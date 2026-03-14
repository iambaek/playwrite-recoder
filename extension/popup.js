const generator = globalThis.PlaywriteRecoderGenerator;

let currentRecording = {
  startedAt: null,
  stoppedAt: null,
  events: []
};
let isRecording = false;
let recordingTabId = null;
let eventsViewMode = "general";
let selectedProfileName = "default";
let liveSyncTimer = null;
let stateSyncTimer = null;
let healthCheckTimer = null;
const HEALTH_CHECK_INTERVAL_MS = 10000;
let serverHealth = {
  ok: null,
  openBrowsers: 0,
  lastTracePath: null,
  sharedSession: null
};
const DEFAULT_SETTINGS = {
  defaultReuseSession: true,
  defaultUseDelay: true,
  liveSyncIntervalMs: 500
};
let popupSettings = {
  ...DEFAULT_SETTINGS
};

const elements = {
  recordOnBtn: document.getElementById("recordOnBtn"),
  recordOffBtn: document.getElementById("recordOffBtn"),
  generalViewBtn: document.getElementById("generalViewBtn"),
  developerViewBtn: document.getElementById("developerViewBtn"),
  attachedTabText: document.getElementById("attachedTabText"),
  inspectSelectorText: document.getElementById("inspectSelectorText"),
  inspectMetaText: document.getElementById("inspectMetaText"),
  attachCurrentTabBtn: document.getElementById("attachCurrentTabBtn"),
  detachTabBtn: document.getElementById("detachTabBtn"),
  inspectOnBtn: document.getElementById("inspectOnBtn"),
  inspectOffBtn: document.getElementById("inspectOffBtn"),
  copyInspectSelectorBtn: document.getElementById("copyInspectSelectorBtn"),
  profileSelect: document.getElementById("profileSelect"),
  newProfileInput: document.getElementById("newProfileInput"),
  createProfileBtn: document.getElementById("createProfileBtn"),
  deleteProfileBtn: document.getElementById("deleteProfileBtn"),
  useDelayCheckbox: document.getElementById("useDelayCheckbox"),
  reuseSessionCheckbox: document.getElementById("reuseSessionCheckbox"),
  downloadJsonBtn: document.getElementById("downloadJsonBtn"),
  downloadCodeBtn: document.getElementById("downloadCodeBtn"),
  replayBtn: document.getElementById("replayBtn"),
  resetSessionBtn: document.getElementById("resetSessionBtn"),
  showTraceBtn: document.getElementById("showTraceBtn"),
  showReportBtn: document.getElementById("showReportBtn"),
  serverStatusText: document.getElementById("serverStatusText"),
  serverCommandText: document.getElementById("serverCommandText"),
  serverBadge: document.getElementById("serverBadge"),
  copyStartServerBtn: document.getElementById("copyStartServerBtn"),
  status: document.getElementById("status"),
  eventsOutput: document.getElementById("eventsOutput"),
  codeOutput: document.getElementById("codeOutput")
};
let lastTracePath = null;
let attachedTab = null;
let inspectState = {
  enabled: false,
  hoveredSelector: "",
  pickedSelector: "",
  frameSelectors: []
};

function formatLocalTime(isoString) {
  if (!isoString) {
    return "";
  }

  try {
    return new Date(isoString).toLocaleTimeString();
  } catch (_error) {
    return isoString;
  }
}

function notifyReplayFinished(result) {
  if (!chrome.notifications || !chrome.notifications.create) {
    return;
  }

  const message =
    "Completed at " +
    formatLocalTime(result.completedAt) +
    " • " +
    result.eventCount +
    " events • " +
    result.stepCount +
    " steps";

  chrome.notifications.create({
    type: "basic",
    iconUrl: "icons/idle-icon-128.png",
    title: "Playwrite Recoder",
    message
  });
}

function setStatus(message) {
  elements.status.textContent = message;
}

function safeHandler(fn) {
  return async function handler() {
    try {
      await fn.apply(this, arguments);
    } catch (error) {
      setStatus("Error: " + error.message);
    }
  };
}

function renderRecordingToggle() {
  elements.recordOnBtn.classList.toggle("is-active", isRecording);
  elements.recordOnBtn.classList.toggle("is-idle", !isRecording);
  elements.recordOffBtn.classList.toggle("is-active", !isRecording);
  elements.recordOffBtn.classList.toggle("is-idle", isRecording);
}

function renderViewToggle() {
  elements.generalViewBtn.classList.toggle("is-active", eventsViewMode === "general");
  elements.generalViewBtn.classList.toggle("is-idle", eventsViewMode !== "general");
  elements.developerViewBtn.classList.toggle("is-active", eventsViewMode === "developer");
  elements.developerViewBtn.classList.toggle("is-idle", eventsViewMode !== "developer");
}

function renderAttachedTab() {
  if (!attachedTab || attachedTab.tabId == null) {
    elements.attachedTabText.textContent = "None";
    return;
  }

  const label = attachedTab.title || attachedTab.url || "Tab #" + attachedTab.tabId;
  elements.attachedTabText.textContent = label;
}

function renderInspectState() {
  elements.inspectOnBtn.classList.toggle("is-active", inspectState.enabled);
  elements.inspectOnBtn.classList.toggle("is-idle", !inspectState.enabled);
  elements.inspectOffBtn.classList.toggle("is-active", !inspectState.enabled);
  elements.inspectOffBtn.classList.toggle("is-idle", inspectState.enabled);
  elements.inspectSelectorText.textContent = inspectState.pickedSelector || inspectState.hoveredSelector || "None";
  const modeLabel = inspectState.pickedSelector ? "Picked" : inspectState.enabled ? "Inspecting" : "Idle";
  const frameLabel =
    Array.isArray(inspectState.frameSelectors) && inspectState.frameSelectors.length
      ? " • frames: " + inspectState.frameSelectors.join(" -> ")
      : "";
  elements.inspectMetaText.textContent = modeLabel + frameLabel;
}

function renderServerHealth() {
  const badge = elements.serverBadge;
  badge.classList.remove("is-checking", "is-online", "is-offline");

  if (serverHealth.ok === null) {
    badge.classList.add("is-checking");
    badge.textContent = "Checking";
    elements.serverStatusText.textContent = "Checking http://localhost:3100";
    elements.serverCommandText.textContent = "Run `npm start` in the project root.";
  } else if (serverHealth.ok) {
    badge.classList.add("is-online");
    badge.textContent = "Online";
    elements.serverStatusText.textContent =
      serverHealth.openBrowsers +
      " browser(s) open" +
      (serverHealth.sharedSession && serverHealth.sharedSession.isOpen
        ? " • shared session active"
        : " • no shared session");
    elements.serverCommandText.textContent = "Server is ready for replay, trace, report, and profile actions.";
  } else {
    badge.classList.add("is-offline");
    badge.textContent = "Offline";
    elements.serverStatusText.textContent = "Start `npm start` to enable replay, trace, report, and profiles";
    elements.serverCommandText.textContent = "Command: npm start";
  }

  const serverDependentControls = Array.from(document.querySelectorAll("[data-server-required='true']"));

  for (const control of serverDependentControls) {
    control.disabled = serverHealth.ok === false;
  }
}

async function refreshServerHealth() {
  try {
    const response = await fetch("http://localhost:3100/health");
    const result = await readApiResponse(response);
    serverHealth = {
      ok: Boolean(result.ok),
      openBrowsers: result.openBrowsers || 0,
      lastTracePath: result.lastTracePath || null,
      sharedSession: result.sharedSession || null
    };
    if (serverHealth.lastTracePath) {
      lastTracePath = serverHealth.lastTracePath;
    }
  } catch (_error) {
    serverHealth = {
      ok: false,
      openBrowsers: 0,
      lastTracePath: null,
      sharedSession: null
    };
  }

  renderServerHealth();
}

function renderProfileOptions(profiles) {
  const list = Array.isArray(profiles) && profiles.length ? profiles : ["default"];
  if (!list.includes(selectedProfileName)) {
    selectedProfileName = list[0];
  }

  elements.profileSelect.innerHTML = "";
  for (const profileName of list) {
    const option = document.createElement("option");
    option.value = profileName;
    option.textContent = profileName;
    option.selected = profileName === selectedProfileName;
    elements.profileSelect.appendChild(option);
  }
}

async function saveProfileSelection() {
  await chrome.storage.local.set({ selectedProfileName });
}

async function saveCachedProfiles(profiles) {
  await chrome.storage.local.set({ cachedProfiles: profiles });
}

async function loadCachedProfiles() {
  const stored = await chrome.storage.local.get(["cachedProfiles"]);
  return Array.isArray(stored.cachedProfiles) ? stored.cachedProfiles : [];
}

async function loadProfileSelection() {
  const stored = await chrome.storage.local.get(["selectedProfileName"]);
  if (stored && stored.selectedProfileName) {
    selectedProfileName = stored.selectedProfileName;
  }
}

async function loadPopupSettings() {
  const stored = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  popupSettings = {
    ...DEFAULT_SETTINGS,
    ...stored
  };
  elements.reuseSessionCheckbox.checked = popupSettings.defaultReuseSession;
  elements.useDelayCheckbox.checked = popupSettings.defaultUseDelay;
}

function downloadText(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function readApiResponse(response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Request failed");
    }
    return data;
  }

  const text = await response.text();
  if (!response.ok) {
    if (text.startsWith("<!DOCTYPE") || text.startsWith("<html")) {
      throw new Error("Node server route not found. Restart `npm start` and reload the extension.");
    }
    throw new Error(text || "Request failed");
  }

  throw new Error("Unexpected non-JSON response from Node server");
}

async function getCurrentTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

async function fetchProfiles() {
  if (serverHealth.ok === false) {
    const cachedProfiles = await loadCachedProfiles();
    const fallbackProfiles = Array.from(new Set(["default", selectedProfileName, ...cachedProfiles].filter(Boolean)));
    renderProfileOptions(fallbackProfiles);
    return false;
  }

  try {
    const response = await fetch("http://localhost:3100/api/profiles");
    const result = await readApiResponse(response);
    const profiles = Array.isArray(result.profiles) ? result.profiles : [];
    renderProfileOptions(profiles);
    await saveCachedProfiles(profiles);
    return true;
  } catch (_error) {
    const cachedProfiles = await loadCachedProfiles();
    const fallbackProfiles = Array.from(new Set(["default", selectedProfileName, ...cachedProfiles].filter(Boolean)));
    renderProfileOptions(fallbackProfiles);
    return false;
  }
}

function formatUrlHost(url) {
  try {
    return new URL(url).host;
  } catch (_error) {
    return url || "";
  }
}

function formatEventText(event) {
  if (event.type === "navigation") {
    return "site: " + formatUrlHost(event.url) + "\ndelay_ms: " + (event.delayMs || 0);
  }

  if (event.type === "click") {
    return (
      "action: click\nselector: " +
      (event.selector || "") +
      (event.frameSelectors && event.frameSelectors.length ? "\nframe_selectors: " + JSON.stringify(event.frameSelectors) : "") +
      "\ndelay_ms: " +
      (event.delayMs || 0) +
      (event.text ? "\nlabel: " + JSON.stringify(event.text) : "")
    );
  }

  if (event.type === "dblclick") {
    return (
      "action: dblclick\nselector: " +
      (event.selector || "") +
      (event.frameSelectors && event.frameSelectors.length ? "\nframe_selectors: " + JSON.stringify(event.frameSelectors) : "") +
      "\ndelay_ms: " +
      (event.delayMs || 0) +
      (event.text ? "\nlabel: " + JSON.stringify(event.text) : "")
    );
  }

  if (event.type === "input") {
    return (
      "action: input\nselector: " +
      (event.selector || "") +
      (event.frameSelectors && event.frameSelectors.length ? "\nframe_selectors: " + JSON.stringify(event.frameSelectors) : "") +
      "\ndelay_ms: " +
      (event.delayMs || 0) +
      "\nvalue: " +
      JSON.stringify(event.value || "")
    );
  }

  if (event.type === "keydown") {
    return (
      "action: keydown\nselector: " +
      (event.selector || "") +
      (event.frameSelectors && event.frameSelectors.length ? "\nframe_selectors: " + JSON.stringify(event.frameSelectors) : "") +
      "\ndelay_ms: " +
      (event.delayMs || 0) +
      "\nkey: " +
      JSON.stringify(event.key || "")
    );
  }

  if (event.type === "check") {
    return (
      "action: " +
      (event.checked ? "check" : "uncheck") +
      "\nselector: " +
      (event.selector || "") +
      (event.frameSelectors && event.frameSelectors.length ? "\nframe_selectors: " + JSON.stringify(event.frameSelectors) : "") +
      "\ndelay_ms: " +
      (event.delayMs || 0)
    );
  }

  if (event.type === "select") {
    return (
      "action: select\nselector: " +
      (event.selector || "") +
      (event.frameSelectors && event.frameSelectors.length ? "\nframe_selectors: " + JSON.stringify(event.frameSelectors) : "") +
      "\ndelay_ms: " +
      (event.delayMs || 0) +
      "\nvalues: " +
      JSON.stringify(event.values || [])
    );
  }

  if (event.type === "scroll") {
    return "action: scroll\ndelay_ms: " + (event.delayMs || 0) + "\nx: " + (event.x || 0) + "\ny: " + (event.y || 0);
  }

  if (event.type === "upload") {
    return (
      "action: upload\nselector: " +
      (event.selector || "") +
      (event.frameSelectors && event.frameSelectors.length ? "\nframe_selectors: " + JSON.stringify(event.frameSelectors) : "") +
      "\ndelay_ms: " +
      (event.delayMs || 0) +
      "\nfile_names: " +
      JSON.stringify(event.fileNames || [])
    );
  }

  return "action: " + (event.type || "unknown");
}

function renderGeneralEvents(recording) {
  const lines = ["session:"];
  lines.push("  started_at: " + JSON.stringify(recording.startedAt));
  lines.push("  stopped_at: " + JSON.stringify(recording.stoppedAt));
  lines.push("  event_count: " + (recording.events || []).length);
  lines.push("events:");

  for (const event of recording.events || []) {
    lines.push("  - type: " + (event.type || "unknown"));
    const text = formatEventText(event).split("\n");
    for (const part of text) {
      const idx = part.indexOf(":");
      if (idx === -1) {
        lines.push("    detail: " + JSON.stringify(part));
        continue;
      }

      const key = part.slice(0, idx).trim().replace(/\s+/g, "_");
      const value = part.slice(idx + 1).trim();
      lines.push("    " + key + ": " + value);
    }
  }

  return lines.join("\n");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function wrapToken(className, value) {
  return '<span class="' + className + '">' + escapeHtml(value) + "</span>";
}

function highlightYaml(text) {
  return text
    .split("\n")
    .map((line) => {
      const match = line.match(/^(\s*)(-\s+)?([a-zA-Z0-9_-]+):(.*)$/);
      if (!match) {
        return escapeHtml(line);
      }

      const indent = escapeHtml(match[1] || "");
      const dash = match[2] ? wrapToken("tok-punct", match[2]) : "";
      const key = wrapToken("tok-key", match[3]);
      const value = (match[4] || "").trim();

      let renderedValue = "";
      if (value.length > 0) {
        if (/^"(?:[^"\\]|\\.)*"$/.test(value)) {
          renderedValue = " " + wrapToken("tok-string", value);
        } else if (/^\d+(?:\.\d+)?$/.test(value)) {
          renderedValue = " " + wrapToken("tok-number", value);
        } else if (/^(true|false)$/.test(value)) {
          renderedValue = " " + wrapToken("tok-boolean", value);
        } else if (/^null$/.test(value)) {
          renderedValue = " " + wrapToken("tok-null", value);
        } else {
          renderedValue = " " + escapeHtml(value);
        }
      }

      return indent + dash + key + wrapToken("tok-punct", ":") + renderedValue;
    })
    .join("\n");
}

function highlightTypeScript(text) {
  const tokenRegex =
    /\/\/[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b(?:const|let|var|return|await|async|if|else|try|catch|require|new|true|false|null|undefined)\b|\b\d+(?:\.\d+)?\b|\b[A-Za-z_$][\w$]*(?=\s*\()/g;

  let result = "";
  let lastIndex = 0;
  let match;

  while ((match = tokenRegex.exec(text)) !== null) {
    const token = match[0];
    result += escapeHtml(text.slice(lastIndex, match.index));

    if (token.startsWith("//")) {
      result += wrapToken("tok-comment", token);
    } else if (/^["'`]/.test(token)) {
      result += wrapToken("tok-string", token);
    } else if (/^\d/.test(token)) {
      result += wrapToken("tok-number", token);
    } else if (/^(const|let|var|return|await|async|if|else|try|catch|require|new|true|false|null|undefined)$/.test(token)) {
      result += wrapToken("tok-keyword", token);
    } else {
      result += wrapToken("tok-fn", token);
    }

    lastIndex = tokenRegex.lastIndex;
  }

  result += escapeHtml(text.slice(lastIndex));
  return result;
}

function renderOutputs() {
  const eventsText =
    eventsViewMode === "developer"
      ? JSON.stringify(currentRecording, null, 2)
      : renderGeneralEvents(currentRecording);
  const codeText = generator.generatePlaywrightCode(currentRecording, {
    headless: false,
    useDelays: elements.useDelayCheckbox.checked
  });

  elements.eventsOutput.innerHTML =
    eventsViewMode === "developer" ? highlightTypeScript(eventsText) : highlightYaml(eventsText);
  elements.codeOutput.innerHTML = highlightTypeScript(codeText);
}

function startLiveSync() {
  stopLiveSync();
  liveSyncTimer = setInterval(() => {
    syncRecordingSnapshot().catch(() => {});
  }, Math.max(100, Number(popupSettings.liveSyncIntervalMs) || DEFAULT_SETTINGS.liveSyncIntervalMs));
}

function stopLiveSync() {
  if (liveSyncTimer) {
    clearInterval(liveSyncTimer);
    liveSyncTimer = null;
  }
}

function startStateSync() {
  stopStateSync();
  stateSyncTimer = setInterval(() => {
    refreshRecorderState(false).catch(() => {});
  }, Math.max(200, Number(popupSettings.liveSyncIntervalMs) || DEFAULT_SETTINGS.liveSyncIntervalMs));
}

function stopStateSync() {
  if (stateSyncTimer) {
    clearInterval(stateSyncTimer);
    stateSyncTimer = null;
  }
}

function startHealthCheck() {
  stopHealthCheck();
  healthCheckTimer = setInterval(() => {
    refreshServerHealth().catch(() => {});
  }, HEALTH_CHECK_INTERVAL_MS);
}

function stopHealthCheck() {
  if (healthCheckTimer) {
    clearInterval(healthCheckTimer);
    healthCheckTimer = null;
  }
}

async function syncRecordingSnapshot() {
  if (recordingTabId == null) {
    return;
  }

  const response = await chrome.runtime.sendMessage({
    type: "GET_RECORDING",
    tabId: recordingTabId
  });

  if (!response || !response.recording) {
    return;
  }

  currentRecording = response.recording;
  renderOutputs();
}

async function refreshRecorderState(loadUiDependencies = true) {
  let profilesLoaded = true;
  if (loadUiDependencies) {
    await loadPopupSettings();
    await loadProfileSelection();
    await refreshServerHealth();
    profilesLoaded = await fetchProfiles();
  }

  const tab = await getCurrentTab();
  if (recordingTabId == null) {
    recordingTabId = tab.id;
  }

  const recorderMeta = await chrome.runtime.sendMessage({
    type: "GET_RECORDER_META"
  });
  attachedTab = recorderMeta && recorderMeta.attachedTab ? recorderMeta.attachedTab : null;
  inspectState = recorderMeta && recorderMeta.inspect ? recorderMeta.inspect : inspectState;
  renderAttachedTab();
  renderInspectState();
  if (attachedTab && attachedTab.tabId != null) {
    recordingTabId = attachedTab.tabId;
  }

  const state = await chrome.runtime.sendMessage({
    type: "GET_STATE",
    tabId: recordingTabId
  });

  const recordingChanged = isRecording !== state.recording;
  isRecording = state.recording;
  renderRecordingToggle();
  if (isRecording) {
    await syncRecordingSnapshot();
    startLiveSync();
  } else {
    stopLiveSync();
  }

  if (recordingChanged && !isRecording) {
    await syncRecordingSnapshot();
  }

  if (!profilesLoaded) {
    if (serverHealth.ok === false) {
      setStatus("Node server offline. Recording works, replay/trace/report need `npm start`.");
      return;
    }
    setStatus("Profile list unavailable. Using cached/default profiles.");
    return;
  }

  setStatus(state.recording ? "Recording in progress" : "Idle");
}

elements.recordOnBtn.addEventListener("click", safeHandler(async () => {
  if (isRecording) {
    setStatus("Recording already on");
    return;
  }

  const tab = await getCurrentTab();
  const targetTabId = attachedTab && attachedTab.tabId != null ? attachedTab.tabId : tab.id;
  recordingTabId = targetTabId;
  const response = await chrome.runtime.sendMessage({
    type: "START_RECORDING",
    tabId: recordingTabId,
    initialUrl: attachedTab && attachedTab.tabId === targetTabId ? attachedTab.url : tab.url
  });

  currentRecording = {
    startedAt: response.session.startedAt,
    stoppedAt: null,
    events: response.session.events || []
  };

  isRecording = true;
  renderRecordingToggle();
  startLiveSync();
  renderOutputs();
  setStatus("Recording started");
}));

elements.inspectOnBtn.addEventListener("click", safeHandler(async () => {
  const targetTabId = attachedTab && attachedTab.tabId != null ? attachedTab.tabId : recordingTabId;
  if (targetTabId == null) {
    setStatus("Attach a tab first");
    return;
  }

  const response = await chrome.runtime.sendMessage({
    type: "SET_INSPECT_MODE",
    tabId: targetTabId,
    enabled: true
  });
  inspectState = response.inspect || inspectState;
  renderInspectState();
  setStatus("Inspect mode enabled");
}));

elements.inspectOffBtn.addEventListener("click", safeHandler(async () => {
  const targetTabId = attachedTab && attachedTab.tabId != null ? attachedTab.tabId : recordingTabId;
  if (targetTabId == null) {
    return;
  }

  const response = await chrome.runtime.sendMessage({
    type: "SET_INSPECT_MODE",
    tabId: targetTabId,
    enabled: false
  });
  inspectState = response.inspect || inspectState;
  renderInspectState();
  setStatus("Inspect mode disabled");
}));

elements.copyInspectSelectorBtn.addEventListener("click", safeHandler(async () => {
  const selector = inspectState.pickedSelector || inspectState.hoveredSelector;
  if (!selector) {
    setStatus("No inspect selector available");
    return;
  }

  await navigator.clipboard.writeText(selector);
  setStatus("Inspect selector copied");
}));

elements.copyStartServerBtn.addEventListener("click", safeHandler(async () => {
  await navigator.clipboard.writeText("npm start");
  setStatus("Copied: npm start");
}));

elements.attachCurrentTabBtn.addEventListener("click", safeHandler(async () => {
  const tab = await getCurrentTab();
  const response = await chrome.runtime.sendMessage({
    type: "ATTACH_TAB",
    tabId: tab.id
  });
  attachedTab = response.attachedTab || null;
  recordingTabId = attachedTab ? attachedTab.tabId : recordingTabId;
  renderAttachedTab();
  setStatus(attachedTab ? "Attached current tab" : "Attach failed");
}));

elements.detachTabBtn.addEventListener("click", safeHandler(async () => {
  const response = await chrome.runtime.sendMessage({
    type: "DETACH_TAB"
  });
  if (response && response.ok) {
    attachedTab = null;
    renderAttachedTab();
    setStatus("Detached tab");
  }
}));

elements.profileSelect.addEventListener("change", safeHandler(async () => {
  selectedProfileName = elements.profileSelect.value || "default";
  await saveProfileSelection();
  setStatus("Selected profile: " + selectedProfileName);
}));

elements.createProfileBtn.addEventListener("click", safeHandler(async () => {
  const rawName = elements.newProfileInput.value.trim();
  if (!rawName) {
    setStatus("Enter a profile name");
    return;
  }

  const response = await fetch("http://localhost:3100/api/profiles", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      browserName: "chromium",
      profileName: rawName
    })
  });

  const result = await readApiResponse(response);
  selectedProfileName = result.profileName;
  await saveProfileSelection();
  renderProfileOptions(result.profiles);
  await saveCachedProfiles(result.profiles);
  elements.newProfileInput.value = "";
  setStatus("Profile created: " + selectedProfileName);
}));

elements.deleteProfileBtn.addEventListener("click", safeHandler(async () => {
  if (selectedProfileName === "default") {
    setStatus("Default profile cannot be deleted");
    return;
  }

  const response = await fetch(
    "http://localhost:3100/api/profiles/" + encodeURIComponent(selectedProfileName) + "?browserName=chromium",
    {
      method: "DELETE"
    }
  );

  const result = await readApiResponse(response);
  selectedProfileName = "default";
  await saveProfileSelection();
  renderProfileOptions(result.profiles);
  await saveCachedProfiles(result.profiles);
  setStatus(result.deleted ? "Profile deleted" : "Profile not found");
}));

elements.recordOffBtn.addEventListener("click", safeHandler(async () => {
  if (!isRecording) {
    setStatus("Recording already off");
    return;
  }

  const response = await chrome.runtime.sendMessage({
    type: "STOP_RECORDING",
    tabId: recordingTabId
  });

  currentRecording = response.recording || currentRecording;
  isRecording = false;
  renderRecordingToggle();
  stopLiveSync();
  renderOutputs();
  setStatus("Recording stopped");
}));

elements.generalViewBtn.addEventListener("click", () => {
  eventsViewMode = "general";
  renderViewToggle();
  renderOutputs();
});

elements.developerViewBtn.addEventListener("click", () => {
  eventsViewMode = "developer";
  renderViewToggle();
  renderOutputs();
});

elements.downloadJsonBtn.addEventListener("click", () => {
  downloadText(
    "recording.json",
    JSON.stringify(currentRecording, null, 2),
    "application/json"
  );
});

elements.downloadCodeBtn.addEventListener("click", () => {
  downloadText(
    "recording.playwright.js",
    generator.generatePlaywrightCode(currentRecording, { headless: false }),
    "application/javascript"
  );
});

elements.replayBtn.addEventListener("click", safeHandler(async () => {
  if (serverHealth.ok === false) {
    setStatus("Node server offline. Start `npm start` first.");
    return;
  }

  setStatus("Sending recording to Node server...");

  const response = await fetch("http://localhost:3100/api/replay", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      recording: currentRecording,
      options: {
        browserName: "chromium",
        headless: false,
        keepOpen: true,
        profileName: selectedProfileName,
        reuseSession: elements.reuseSessionCheckbox.checked,
        useDelays: elements.useDelayCheckbox.checked,
        trace: true
      }
    })
  });

  const result = await readApiResponse(response);

  lastTracePath = result.tracePath || null;
  notifyReplayFinished(result);
    setStatus(
      "Replay completed at " +
        formatLocalTime(result.completedAt) +
        " • " +
        result.eventCount +
        " events • " +
        result.stepCount +
        " steps. " +
        (result.reuseSession ? "Profile `" + result.profileName + "` reused." : "New isolated session used.") +
        (result.useDelays ? " Delay applied." : " Delay skipped.")
    );
}));

elements.resetSessionBtn.addEventListener("click", safeHandler(async () => {
  if (serverHealth.ok === false) {
    setStatus("Node server offline. Start `npm start` first.");
    return;
  }

  setStatus("Resetting shared browser session...");

  const response = await fetch("http://localhost:3100/api/session/reset", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      browserName: "chromium",
      profileName: selectedProfileName
    })
  });

  const result = await readApiResponse(response);
  setStatus(result.closed ? "Shared browser session reset" : "No shared session to reset");
}));

elements.showTraceBtn.addEventListener("click", safeHandler(async () => {
  if (serverHealth.ok === false) {
    setStatus("Node server offline. Start `npm start` first.");
    return;
  }

  setStatus("Opening Playwright Trace Viewer...");

  const response = await fetch("http://localhost:3100/api/show-trace", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      tracePath: lastTracePath
    })
  });

  const result = await readApiResponse(response);
  lastTracePath = result.tracePath || lastTracePath;
  setStatus("Trace viewer opened");
}));

elements.showReportBtn.addEventListener("click", safeHandler(async () => {
  if (serverHealth.ok === false) {
    setStatus("Node server offline. Start `npm start` first.");
    return;
  }

  setStatus("Opening replay report...");

  const response = await fetch("http://localhost:3100/api/show-report", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    }
  });

  const result = await readApiResponse(response);
  setStatus("Report opened: " + result.reportPath);
}));

refreshRecorderState();
startStateSync();
startHealthCheck();
renderRecordingToggle();
renderViewToggle();
renderAttachedTab();
renderInspectState();
renderOutputs();

window.addEventListener("unload", () => {
  stopLiveSync();
  stopStateSync();
  stopHealthCheck();
});
