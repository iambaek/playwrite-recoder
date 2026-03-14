const DEFAULT_SETTINGS = {
  testIdAttribute: "data-testid"
};
let recorderSettings = {
  ...DEFAULT_SETTINGS
};
let isRecordingActive = false;
let inspectModeEnabled = false;
let inspectOverlay = null;
let inspectLabel = null;
let mouseMoveListenerAttached = false;

async function loadRecorderSettings() {
  const stored = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  recorderSettings = {
    ...DEFAULT_SETTINGS,
    ...stored
  };
}

function getAriaRole(element) {
  const explicit = element.getAttribute("role");
  if (explicit) {
    return explicit;
  }

  const tag = element.tagName.toLowerCase();
  const type = (element.getAttribute("type") || "").toLowerCase();
  const roleMap = {
    a: element.hasAttribute("href") ? "link" : null,
    button: "button",
    input: type === "submit" || type === "button" ? "button"
      : type === "checkbox" ? "checkbox"
      : type === "radio" ? "radio"
      : "textbox",
    textarea: "textbox",
    select: "combobox",
    img: "img",
    nav: "navigation",
    main: "main",
    header: "banner",
    footer: "contentinfo",
    h1: "heading", h2: "heading", h3: "heading",
    h4: "heading", h5: "heading", h6: "heading"
  };
  return roleMap[tag] || null;
}

function getAccessibleName(element) {
  const ariaLabel = element.getAttribute("aria-label");
  if (ariaLabel) {
    return ariaLabel.trim();
  }

  const labelledBy = element.getAttribute("aria-labelledby");
  if (labelledBy) {
    const label = document.getElementById(labelledBy);
    if (label) {
      return label.textContent.trim();
    }
  }

  const id = element.id;
  if (id) {
    const label = document.querySelector('label[for="' + CSS.escape(id) + '"]');
    if (label) {
      return label.textContent.trim();
    }
  }

  const parentLabel = element.closest("label");
  if (parentLabel) {
    const clone = parentLabel.cloneNode(true);
    const inputs = clone.querySelectorAll("input,select,textarea");
    inputs.forEach((el) => el.remove());
    const text = clone.textContent.trim();
    if (text) {
      return text;
    }
  }

  return "";
}

function buildSelector(element) {
  if (!element) {
    return "body";
  }

  const testIdAttribute = recorderSettings.testIdAttribute || DEFAULT_SETTINGS.testIdAttribute;
  const dataTestId = element.getAttribute(testIdAttribute);
  if (dataTestId) {
    return "[" + testIdAttribute + '="' + dataTestId.replace(/"/g, '\\"') + '"]';
  }

  const role = getAriaRole(element);
  const name = getAccessibleName(element);
  if (role && name) {
    return 'role=' + role + '[name="' + name.replace(/"/g, '\\"') + '"]';
  }

  const placeholder = element.getAttribute("placeholder");
  if (placeholder && (element.tagName === "INPUT" || element.tagName === "TEXTAREA")) {
    return '[placeholder="' + placeholder.replace(/"/g, '\\"') + '"]';
  }

  if (element.id) {
    return "#" + CSS.escape(element.id);
  }

  if (role) {
    const tag = element.tagName.toLowerCase();
    const visibleText = (element.innerText || "").trim().slice(0, 60);
    if (visibleText && (tag === "a" || tag === "button")) {
      return 'role=' + role + '[name="' + visibleText.replace(/"/g, '\\"') + '"]';
    }
  }

  if (element.name) {
    return element.tagName.toLowerCase() + '[name="' + element.name.replace(/"/g, '\\"') + '"]';
  }

  const parts = [];
  let current = element;

  while (current && current.nodeType === Node.ELEMENT_NODE && current.tagName.toLowerCase() !== "html") {
    const tag = current.tagName.toLowerCase();
    let part = tag;
    let parent = current.parentElement;

    if (!parent) {
      const root = current.getRootNode && current.getRootNode();
      if (root && root.host instanceof Element) {
        parent = root.host;
      }
    }

    if (parent) {
      const siblings = Array.from(parent.children).filter((node) => node.tagName === current.tagName);
      if (siblings.length > 1) {
        part += ":nth-of-type(" + (siblings.indexOf(current) + 1) + ")";
      }
    }

    parts.unshift(part);
    current = parent;
  }

  return parts.join(" > ");
}

function getFrameSelectors() {
  const selectors = [];
  let currentWindow = window;

  while (currentWindow !== currentWindow.top) {
    try {
      const frameElement = currentWindow.frameElement;
      if (!(frameElement instanceof Element)) {
        break;
      }
      selectors.unshift(buildSelector(frameElement));
      currentWindow = currentWindow.parent;
    } catch (_error) {
      break;
    }
  }

  return selectors;
}

function sendRecordedEvent(event) {
  if (!isRecordingActive) {
    return;
  }

  chrome.runtime.sendMessage({
    type: "RECORDED_EVENT",
    event: {
      ...event,
      frameSelectors: getFrameSelectors()
    }
  });
}

const pendingInputTimers = new Map();
let pendingScrollTimer = null;

function clearPendingInput(target) {
  const timerId = pendingInputTimers.get(target);
  if (timerId) {
    clearTimeout(timerId);
    pendingInputTimers.delete(target);
  }
}

function recordInput(target) {
  sendRecordedEvent({
    type: "input",
    selector: buildSelector(target),
    value: target.value,
    timestamp: Date.now()
  });
}

function scheduleInputRecord(target) {
  clearPendingInput(target);
  const timerId = setTimeout(() => {
    pendingInputTimers.delete(target);
    recordInput(target);
  }, 400);
  pendingInputTimers.set(target, timerId);
}

function flushAllPendingInputs() {
  for (const [target, timerId] of pendingInputTimers.entries()) {
    clearTimeout(timerId);
    pendingInputTimers.delete(target);
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement
    ) {
      recordInput(target);
    }
  }
}

function ensureInspectUi() {
  if (inspectOverlay && inspectLabel) {
    return;
  }

  inspectOverlay = document.createElement("div");
  inspectOverlay.style.position = "fixed";
  inspectOverlay.style.zIndex = "2147483646";
  inspectOverlay.style.border = "2px solid #0f766e";
  inspectOverlay.style.background = "rgba(15,118,110,0.12)";
  inspectOverlay.style.pointerEvents = "none";
  inspectOverlay.style.display = "none";
  inspectOverlay.style.boxSizing = "border-box";

  inspectLabel = document.createElement("div");
  inspectLabel.style.position = "fixed";
  inspectLabel.style.zIndex = "2147483647";
  inspectLabel.style.maxWidth = "420px";
  inspectLabel.style.padding = "6px 8px";
  inspectLabel.style.borderRadius = "8px";
  inspectLabel.style.background = "#111827";
  inspectLabel.style.color = "#e5e7eb";
  inspectLabel.style.font = '12px "IBM Plex Sans", sans-serif';
  inspectLabel.style.pointerEvents = "none";
  inspectLabel.style.display = "none";
  inspectLabel.style.wordBreak = "break-word";

  document.documentElement.appendChild(inspectOverlay);
  document.documentElement.appendChild(inspectLabel);
}

function hideInspectUi() {
  if (inspectOverlay) {
    inspectOverlay.style.display = "none";
  }
  if (inspectLabel) {
    inspectLabel.style.display = "none";
  }
}

function updateInspectUi(target, selector, clientX, clientY) {
  ensureInspectUi();
  const rect = target.getBoundingClientRect();
  inspectOverlay.style.display = "block";
  inspectOverlay.style.left = rect.left + "px";
  inspectOverlay.style.top = rect.top + "px";
  inspectOverlay.style.width = rect.width + "px";
  inspectOverlay.style.height = rect.height + "px";

  inspectLabel.style.display = "block";
  inspectLabel.textContent = selector;
  inspectLabel.style.left = Math.min(clientX + 12, window.innerWidth - 440) + "px";
  inspectLabel.style.top = Math.min(clientY + 12, window.innerHeight - 80) + "px";
}

document.addEventListener(
  "click",
  (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) {
      return;
    }

    if (inspectModeEnabled) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      inspectModeEnabled = false;
      const selector = buildSelector(target);
      chrome.runtime.sendMessage({
        type: "INSPECT_PICK",
        selector,
        frameSelectors: getFrameSelectors()
      });
      hideInspectUi();
      return;
    }

    sendRecordedEvent({
      type: "click",
      selector: buildSelector(target),
      text: target.innerText ? target.innerText.slice(0, 120) : "",
      timestamp: Date.now()
    });
  },
  true
);

function onInspectMouseMove(event) {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) {
    hideInspectUi();
    return;
  }

  const selector = buildSelector(target);
  updateInspectUi(target, selector, event.clientX, event.clientY);
  chrome.runtime.sendMessage({
    type: "INSPECT_HOVER",
    selector,
    frameSelectors: getFrameSelectors()
  });
}

function attachInspectMouseMove() {
  if (mouseMoveListenerAttached) {
    return;
  }
  document.addEventListener("mousemove", onInspectMouseMove, true);
  mouseMoveListenerAttached = true;
}

function detachInspectMouseMove() {
  if (!mouseMoveListenerAttached) {
    return;
  }
  document.removeEventListener("mousemove", onInspectMouseMove, true);
  mouseMoveListenerAttached = false;
}

document.addEventListener(
  "dblclick",
  (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) {
      return;
    }

    sendRecordedEvent({
      type: "dblclick",
      selector: buildSelector(target),
      text: target.innerText ? target.innerText.slice(0, 120) : "",
      timestamp: Date.now()
    });
  },
  true
);

document.addEventListener(
  "input",
  (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) {
      return;
    }

    scheduleInputRecord(target);
  },
  true
);

document.addEventListener(
  "change",
  (event) => {
    const target = event.target;
    if (
      !(
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      )
    ) {
      return;
    }

    if (target instanceof HTMLInputElement && (target.type === "checkbox" || target.type === "radio")) {
      clearPendingInput(target);
      sendRecordedEvent({
        type: "check",
        selector: buildSelector(target),
        checked: target.checked,
        timestamp: Date.now()
      });
      return;
    }

    if (target instanceof HTMLSelectElement) {
      clearPendingInput(target);
      sendRecordedEvent({
        type: "select",
        selector: buildSelector(target),
        value: target.value,
        values: Array.from(target.selectedOptions).map((option) => option.value),
        timestamp: Date.now()
      });
      return;
    }

    if (target instanceof HTMLInputElement && target.type === "file") {
      clearPendingInput(target);
      sendRecordedEvent({
        type: "upload",
        selector: buildSelector(target),
        fileNames: Array.from(target.files || []).map((file) => file.name),
        timestamp: Date.now()
      });
      return;
    }

    clearPendingInput(target);
    recordInput(target);
  },
  true
);

document.addEventListener(
  "keydown",
  (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target || event.key !== "Enter") {
      return;
    }

    sendRecordedEvent({
      type: "keydown",
      selector: buildSelector(target),
      key: event.key,
      timestamp: Date.now()
    });
  },
  true
);

document.addEventListener(
  "submit",
  () => {
    flushAllPendingInputs();
  },
  true
);

window.addEventListener("beforeunload", flushAllPendingInputs, true);
window.addEventListener("pagehide", flushAllPendingInputs, true);

function recordCurrentLocation() {
  sendRecordedEvent({
    type: "navigation",
    url: location.href,
    title: document.title || "",
    timestamp: Date.now()
  });
}

const originalPushState = history.pushState;
history.pushState = function patchedPushState(...args) {
  const result = originalPushState.apply(this, args);
  recordCurrentLocation();
  return result;
};

const originalReplaceState = history.replaceState;
history.replaceState = function patchedReplaceState(...args) {
  const result = originalReplaceState.apply(this, args);
  recordCurrentLocation();
  return result;
};

window.addEventListener("popstate", recordCurrentLocation, true);
window.addEventListener("hashchange", recordCurrentLocation, true);

window.addEventListener(
  "scroll",
  () => {
    if (pendingScrollTimer) {
      clearTimeout(pendingScrollTimer);
    }

    pendingScrollTimer = setTimeout(() => {
      pendingScrollTimer = null;
      sendRecordedEvent({
        type: "scroll",
        x: Math.round(window.scrollX),
        y: Math.round(window.scrollY),
        timestamp: Date.now()
      });
    }, 250);
  },
  true
);

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "sync") {
    return;
  }

  if (changes.testIdAttribute) {
    recorderSettings.testIdAttribute = changes.testIdAttribute.newValue || DEFAULT_SETTINGS.testIdAttribute;
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "SET_INSPECT_MODE") {
    inspectModeEnabled = Boolean(message.enabled);
    if (inspectModeEnabled) {
      attachInspectMouseMove();
    } else {
      detachInspectMouseMove();
      hideInspectUi();
    }
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === "SET_RECORDING_STATE") {
    isRecordingActive = Boolean(message.recording);
    sendResponse({ ok: true });
    return true;
  }

  return false;
});

loadRecorderSettings().catch(() => {});
