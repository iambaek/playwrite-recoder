var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// shared/playwright-generator.js
var require_playwright_generator = __commonJS({
  "shared/playwright-generator.js"(exports, module) {
    (function initGenerator(root, factory) {
      if (typeof module !== "undefined" && module.exports) {
        module.exports = factory();
        return;
      }
      root.PlaywrightRecorderGenerator = factory();
    })(typeof globalThis !== "undefined" ? globalThis : exports, function createGenerator() {
      function escapeJs(value) {
        return JSON.stringify(value == null ? "" : String(value));
      }
      function sanitizeText(value) {
        return String(value == null ? "" : value).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/g, "").trim();
      }
      function ensureArray(events) {
        return Array.isArray(events) ? events : [];
      }
      function sanitizeEvents2(events) {
        return ensureArray(events).filter(function keep(event) {
          return event && typeof event.type === "string";
        }).map(function normalizeEvent(event) {
          var next = Object.assign({}, event);
          if (typeof next.url === "string") {
            next.url = sanitizeText(next.url);
          }
          if (typeof next.selector === "string") {
            next.selector = sanitizeText(next.selector);
          }
          if (typeof next.value === "string") {
            next.value = sanitizeText(next.value);
          }
          if (typeof next.key === "string") {
            next.key = sanitizeText(next.key);
          }
          if (typeof next.text === "string") {
            next.text = sanitizeText(next.text);
          }
          if (Array.isArray(next.values)) {
            next.values = next.values.map(sanitizeText);
          }
          if (Array.isArray(next.fileNames)) {
            next.fileNames = next.fileNames.map(sanitizeText);
          }
          if (Array.isArray(next.frameSelectors)) {
            next.frameSelectors = next.frameSelectors.map(sanitizeText).filter(Boolean);
          }
          return next;
        });
      }
      function pushDelayStep(steps, event, options) {
        if (!options.includeDelays) {
          return;
        }
        if (typeof event.delayMs === "number" && event.delayMs > 0) {
          steps.push({
            type: "wait",
            durationMs: event.delayMs,
            isPopup: Boolean(event.isPopup)
          });
        }
      }
      function normalizeRecordingToSteps2(recording, options) {
        var settings = options || {};
        var events = sanitizeEvents2(recording && recording.events);
        var steps = [];
        events.forEach(function normalize(event, index) {
          var prevEvent = index > 0 ? events[index - 1] : null;
          if (event.type === "navigation" && prevEvent && (prevEvent.type === "click" || prevEvent.type === "dblclick")) {
            return;
          }
          pushDelayStep(steps, event, settings);
          if (event.type === "popup_opened") {
            steps.push({ type: "popup_opened" });
            return;
          }
          if (event.type === "navigation") {
            steps.push({ type: "goto", url: event.url || "", title: event.title || "", isPopup: Boolean(event.isPopup) });
            return;
          }
          if (event.type === "click") {
            steps.push({ type: "click", selector: event.selector || "body", text: event.text || "", frameSelectors: event.frameSelectors || [], isPopup: Boolean(event.isPopup) });
            return;
          }
          if (event.type === "dblclick") {
            steps.push({ type: "dblclick", selector: event.selector || "body", text: event.text || "", frameSelectors: event.frameSelectors || [], isPopup: Boolean(event.isPopup) });
            return;
          }
          if (event.type === "input") {
            steps.push({
              type: "fill",
              selector: event.selector || "body",
              value: event.value || "",
              frameSelectors: event.frameSelectors || [],
              isPopup: Boolean(event.isPopup)
            });
            return;
          }
          if (event.type === "keydown") {
            steps.push({
              type: "press",
              selector: event.selector || "body",
              key: event.key || "Enter",
              frameSelectors: event.frameSelectors || [],
              isPopup: Boolean(event.isPopup)
            });
            return;
          }
          if (event.type === "check") {
            steps.push({
              type: event.checked ? "check" : "uncheck",
              selector: event.selector || "body",
              frameSelectors: event.frameSelectors || [],
              isPopup: Boolean(event.isPopup)
            });
            return;
          }
          if (event.type === "select") {
            steps.push({
              type: "select",
              selector: event.selector || "body",
              values: Array.isArray(event.values) ? event.values : [event.value || ""],
              frameSelectors: event.frameSelectors || [],
              isPopup: Boolean(event.isPopup)
            });
            return;
          }
          if (event.type === "scroll") {
            steps.push({
              type: "scroll",
              x: typeof event.x === "number" ? event.x : 0,
              y: typeof event.y === "number" ? event.y : 0,
              isPopup: Boolean(event.isPopup)
            });
            return;
          }
          if (event.type === "upload") {
            steps.push({
              type: "upload",
              selector: event.selector || "body",
              fileNames: Array.isArray(event.fileNames) ? event.fileNames : [],
              frameSelectors: event.frameSelectors || [],
              isPopup: Boolean(event.isPopup)
            });
            return;
          }
          steps.push({
            type: "unsupported",
            originalType: event.type
          });
        });
        for (var pi = steps.length - 1; pi >= 0; pi--) {
          if (steps[pi].type !== "popup_opened") {
            continue;
          }
          for (var pj = pi - 1; pj >= 0; pj--) {
            if (steps[pj].type === "click" || steps[pj].type === "dblclick") {
              var popupStep = steps.splice(pi, 1)[0];
              steps.splice(pj + 1, 0, popupStep);
              break;
            }
          }
        }
        return steps;
      }
      function buildLocatorExpr(scope, selector) {
        var roleMatch = selector.match(/^role=(\w+)\[name="(.+)"\]$/);
        if (roleMatch) {
          return scope + ".getByRole(" + escapeJs(roleMatch[1]) + ", { name: " + escapeJs(roleMatch[2]) + " })";
        }
        var placeholderMatch = selector.match(/^\[placeholder="(.+)"\]$/);
        if (placeholderMatch) {
          return scope + ".getByPlaceholder(" + escapeJs(placeholderMatch[1]) + ")";
        }
        var testIdMatch = selector.match(/^\[data-testid="(.+)"\]$/);
        if (testIdMatch) {
          return scope + ".getByTestId(" + escapeJs(testIdMatch[1]) + ")";
        }
        return scope + ".locator(" + escapeJs(selector) + ")";
      }
      function buildStep(step) {
        var pageVar = step.isPopup ? "popupPage" : "page";
        var scope = pageVar;
        if (Array.isArray(step.frameSelectors) && step.frameSelectors.length) {
          scope = step.frameSelectors.reduce(function chain(target, selector) {
            return target + ".frameLocator(" + escapeJs(selector) + ")";
          }, pageVar);
        }
        var loc = step.selector ? buildLocatorExpr(scope, step.selector) : null;
        switch (step.type) {
          case "popup_opened":
            return null;
          case "wait":
            return "  await " + pageVar + ".waitForTimeout(" + String(step.durationMs || 0) + ");";
          case "goto":
            var titleComment = step.title ? "  // Page: " + step.title + "\n" : "";
            return titleComment + "  await " + pageVar + ".goto(" + escapeJs(step.url) + ");";
          case "click":
            return "  await " + loc + ".click();";
          case "dblclick":
            return "  await " + loc + ".dblclick();";
          case "fill":
            return "  await " + loc + ".fill(" + escapeJs(step.value) + ");";
          case "press":
            return "  await " + loc + ".press(" + escapeJs(step.key) + ");";
          case "check":
            return "  await " + loc + ".check();";
          case "uncheck":
            return "  await " + loc + ".uncheck();";
          case "select":
            return "  await " + loc + ".selectOption(" + JSON.stringify(step.values || []) + ");";
          case "scroll":
            return "  await " + pageVar + ".evaluate(({ x, y }) => window.scrollTo(x, y), " + JSON.stringify({ x: step.x || 0, y: step.y || 0 }) + ");";
          case "upload":
            return "  // Upload step recorded for " + escapeJs(step.selector) + " but local file paths are unavailable in extension recording.";
          default:
            return "  // Unsupported step: " + escapeJs(step.originalType || step.type);
        }
      }
      function buildMetadataComments(recording) {
        var lines = [];
        var consoleLogs = ensureArray(recording && recording.consoleLogs);
        var errors = consoleLogs.filter(function(l) {
          return l.level === "error" || l.level === "warning";
        });
        if (errors.length > 0) {
          lines.push("/*");
          lines.push(" * Console " + (errors[0].level === "error" ? "errors" : "warnings") + " during recording:");
          for (var j = 0; j < Math.min(errors.length, 10); j++) {
            lines.push(" *   [" + errors[j].level + "] " + errors[j].text.slice(0, 120));
          }
          if (errors.length > 10) {
            lines.push(" *   ... and " + (errors.length - 10) + " more");
          }
          lines.push(" */");
        }
        return lines.join("\n");
      }
      function generatePlaywrightCode(recording, options) {
        var settings = options || {};
        var steps = normalizeRecordingToSteps2(recording, {
          includeDelays: settings.useDelays !== false
        });
        var testName = settings.testName || "test";
        var renderedLines = [];
        for (var si = 0; si < steps.length; si++) {
          var nextStep = steps[si + 1];
          if ((steps[si].type === "click" || steps[si].type === "dblclick") && nextStep && nextStep.type === "popup_opened") {
            var clickLine = buildStep(steps[si]).trim().replace(/^await\s+/, "").replace(/;$/, "");
            renderedLines.push("  const [popupPage] = await Promise.all([");
            renderedLines.push("    page.waitForEvent('popup'),");
            renderedLines.push("    " + clickLine + ",");
            renderedLines.push("  ]);");
            renderedLines.push("  await popupPage.waitForLoadState();");
            si++;
            continue;
          }
          var line = buildStep(steps[si]);
          if (line !== null) {
            renderedLines.push(line);
          }
        }
        var renderedSteps = renderedLines.join("\n");
        var metadata = buildMetadataComments(recording);
        var parts = [
          "import { test, expect } from '@playwright/test';"
        ];
        if (metadata) {
          parts.push("");
          parts.push(metadata);
        }
        parts.push("");
        parts.push("test(" + escapeJs(testName) + ", async ({ page }) => {");
        parts.push(renderedSteps);
        parts.push("});");
        parts.push("");
        return parts.join("\n");
      }
      return {
        generatePlaywrightCode,
        normalizeRecordingToSteps: normalizeRecordingToSteps2,
        sanitizeEvents: sanitizeEvents2
      };
    });
  }
});

// shared/stepExecutor.js
var require_stepExecutor = __commonJS({
  "shared/stepExecutor.js"(exports, module) {
    (function initStepExecutor(root, factory) {
      if (typeof module !== "undefined" && module.exports) {
        module.exports = factory();
        return;
      }
      root.PlaywrightStepExecutor = factory();
    })(typeof globalThis !== "undefined" ? globalThis : exports, function createStepExecutor() {
      async function executeStep2(page, step, options) {
        var actionTimeoutMs = options && options.actionTimeoutMs || 1e4;
        var navigationTimeoutMs = options && options.navigationTimeoutMs || 15e3;
        var maxDelayMs = options && options.maxDelayMs || 5e3;
        if (step.type === "wait") {
          await page.waitForTimeout(Math.min(step.durationMs || 0, maxDelayMs));
          return;
        }
        if (step.type === "goto") {
          if (step.url && step.url.startsWith("chrome://")) return;
          await page.goto(step.url, {
            waitUntil: "domcontentloaded",
            timeout: navigationTimeoutMs
          });
          return;
        }
        if (step.type === "scroll") {
          await page.evaluate(function scrollTo(coords) {
            window.scrollTo(coords.x, coords.y);
          }, { x: step.x || 0, y: step.y || 0 });
          return;
        }
        if (step.type === "unsupported" || step.type === "upload") {
          return;
        }
        var scope = page;
        if (Array.isArray(step.frameSelectors) && step.frameSelectors.length) {
          for (var i = 0; i < step.frameSelectors.length; i++) {
            scope = scope.frameLocator(step.frameSelectors[i]);
          }
        }
        var locator = scope.locator(step.selector);
        if (step.type === "click") {
          await locator.click({ timeout: actionTimeoutMs });
        } else if (step.type === "dblclick") {
          await locator.dblclick({ timeout: actionTimeoutMs });
        } else if (step.type === "fill") {
          await locator.fill(step.value || "", { timeout: actionTimeoutMs });
        } else if (step.type === "press") {
          await locator.press(step.key || "Enter", { timeout: actionTimeoutMs });
        } else if (step.type === "check") {
          await locator.check({ timeout: actionTimeoutMs });
        } else if (step.type === "uncheck") {
          await locator.uncheck({ timeout: actionTimeoutMs });
        } else if (step.type === "select") {
          await locator.selectOption(step.values || [], { timeout: actionTimeoutMs });
        }
      }
      function describeStep2(step, index) {
        var num = "Step " + (index + 1);
        if (step.type === "goto") return num + " goto: " + (step.url || "");
        if (step.type === "click") return num + " click: " + (step.selector || "");
        if (step.type === "fill") return num + " fill: " + (step.selector || "") + ' = "' + (step.value || "") + '"';
        if (step.type === "press") return num + " press: " + (step.key || "");
        return num + " " + step.type + ": " + (step.selector || step.url || "");
      }
      return {
        executeStep: executeStep2,
        describeStep: describeStep2
      };
    });
  }
});

// extension/src/crxPlayer.js
import { crx } from "playwright-crx";
async function getCrxApp() {
  if (activeCrxApp) {
    try {
      await activeCrxApp.close().catch(() => {
      });
    } catch (_e) {
    }
    activeCrxApp = null;
  }
  activeCrxApp = await crx.start();
  return activeCrxApp;
}
async function releaseCrxApp(page) {
  if (!activeCrxApp) return;
  try {
    await activeCrxApp.detach(page).catch(() => {
    });
    await activeCrxApp.close().catch(() => {
    });
  } catch (_e) {
  }
  activeCrxApp = null;
}
function extractTestBody(codeText) {
  const lines = codeText.split("\n");
  const bodyLines = [];
  let insideTest = false;
  let braceDepth = 0;
  for (const line of lines) {
    if (!insideTest) {
      if (/^\s*(?:test|it)\s*\(/.test(line) || /async\s*\(\s*\{/.test(line)) {
        insideTest = true;
        braceDepth = 0;
        for (const ch of line) {
          if (ch === "{") braceDepth++;
          if (ch === "}") braceDepth--;
        }
        continue;
      }
      if (/^\s*(?:import|const\s*\{.*\}\s*=\s*require)/.test(line)) {
        continue;
      }
      if (line.trim() === "") continue;
      bodyLines.push(line);
      continue;
    }
    for (const ch of line) {
      if (ch === "{") braceDepth++;
      if (ch === "}") braceDepth--;
    }
    if (braceDepth <= 0) {
      insideTest = false;
      continue;
    }
    bodyLines.push(line);
  }
  return bodyLines.map((l) => l.replace(/^  /, "")).join("\n").trim();
}
function parseCodeToSteps(codeText) {
  const body = extractTestBody(codeText);
  const lines = body.split("\n").map((l) => l.trim()).filter(Boolean);
  const steps = [];
  let pendingPopup = false;
  let popupInitialized = false;
  for (const line of lines) {
    if (line.startsWith("//")) continue;
    let m;
    if (/waitForEvent\(["'`]popup["'`]\)/.test(line) || /context\(\)\.waitForEvent\(["'`]page["'`]\)/.test(line)) {
      pendingPopup = true;
      continue;
    }
    if (/popupPage\.waitForLoadState/.test(line)) {
      continue;
    }
    if (/popupPromise/.test(line) && !/waitForEvent/.test(line)) {
      continue;
    }
    if (/Promise\.all/.test(line) || /^\s*\]\s*\)\s*;?\s*$/.test(line)) {
      continue;
    }
    if (/^\s*\[popupPage\]/.test(line) || /const\s+popupPage\s*=/.test(line)) {
      continue;
    }
    const isPopup = /popupPage\./.test(line);
    if (isPopup && !popupInitialized && !pendingPopup) {
      let inserted = false;
      for (let si = steps.length - 1; si >= 0; si--) {
        if (steps[si].type === "click" || steps[si].type === "dblclick") {
          steps.splice(si + 1, 0, { type: "popup_opened" });
          inserted = true;
          break;
        }
      }
      if (!inserted) {
        steps.push({ type: "popup_opened" });
      }
      popupInitialized = true;
    }
    m = line.match(/(?:popup)?[Pp]age\.goto\(["'`](.+?)["'`]/);
    if (m) {
      steps.push({ type: "goto", url: m[1], isPopup });
      continue;
    }
    m = line.match(/(?:popup)?[Pp]age\.waitForTimeout\((\d+)\)/);
    if (m) {
      steps.push({ type: "wait", durationMs: Number(m[1]), isPopup });
      continue;
    }
    m = line.match(/(?:popup)?[Pp]age\.evaluate\(.+?scrollTo.+?x:\s*(\d+).+?y:\s*(\d+)/s);
    if (m) {
      steps.push({ type: "scroll", x: Number(m[1]), y: Number(m[2]), isPopup });
      continue;
    }
    m = line.match(/\.locator\(["'`](.+?)["'`]\)\.click\(/);
    if (m) {
      const frames = parseFrameLocators(line);
      steps.push({ type: "click", selector: m[1], frameSelectors: frames, isPopup });
      if (pendingPopup) {
        steps.push({ type: "popup_opened" });
        pendingPopup = false;
        popupInitialized = true;
      }
      continue;
    }
    m = line.match(/\.locator\(["'`](.+?)["'`]\)\.dblclick\(/);
    if (m) {
      const frames = parseFrameLocators(line);
      steps.push({ type: "dblclick", selector: m[1], frameSelectors: frames, isPopup });
      if (pendingPopup) {
        steps.push({ type: "popup_opened" });
        pendingPopup = false;
        popupInitialized = true;
      }
      continue;
    }
    m = line.match(/\.locator\(["'`](.+?)["'`]\)\.fill\(["'`](.*?)["'`]/);
    if (m) {
      const frames = parseFrameLocators(line);
      steps.push({ type: "fill", selector: m[1], value: m[2], frameSelectors: frames, isPopup });
      continue;
    }
    m = line.match(/\.locator\(["'`](.+?)["'`]\)\.press\(["'`](.+?)["'`]/);
    if (m) {
      const frames = parseFrameLocators(line);
      steps.push({ type: "press", selector: m[1], key: m[2], frameSelectors: frames, isPopup });
      continue;
    }
    m = line.match(/\.locator\(["'`](.+?)["'`]\)\.check\(/);
    if (m) {
      const frames = parseFrameLocators(line);
      steps.push({ type: "check", selector: m[1], frameSelectors: frames, isPopup });
      continue;
    }
    m = line.match(/\.locator\(["'`](.+?)["'`]\)\.uncheck\(/);
    if (m) {
      const frames = parseFrameLocators(line);
      steps.push({ type: "uncheck", selector: m[1], frameSelectors: frames, isPopup });
      continue;
    }
    m = line.match(/\.locator\(["'`](.+?)["'`]\)\.selectOption\((.+?)\)/);
    if (m) {
      const frames = parseFrameLocators(line);
      let values = [];
      try {
        values = JSON.parse(m[2]);
      } catch (_e) {
        values = [m[2].replace(/["'`]/g, "")];
      }
      steps.push({ type: "select", selector: m[1], values, frameSelectors: frames, isPopup });
      continue;
    }
    m = line.match(/\.getByRole\(["'`](.+?)["'`](?:,\s*\{[^}]*name:\s*["'`](.+?)["'`])?/);
    if (m) {
      const selector = m[2] ? "role=" + m[1] + '[name="' + m[2] + '"]' : "role=" + m[1];
      const action = parseAction(line);
      if (action) {
        steps.push({ ...action, selector, frameSelectors: [], isPopup });
        if (pendingPopup && (action.type === "click" || action.type === "dblclick")) {
          steps.push({ type: "popup_opened" });
          pendingPopup = false;
          popupInitialized = true;
        }
        continue;
      }
    }
    m = line.match(/\.getByText\(["'`](.+?)["'`]/);
    if (m) {
      const selector = "text=" + m[1];
      const action = parseAction(line);
      if (action) {
        steps.push({ ...action, selector, frameSelectors: [], isPopup });
        if (pendingPopup && (action.type === "click" || action.type === "dblclick")) {
          steps.push({ type: "popup_opened" });
          pendingPopup = false;
          popupInitialized = true;
        }
        continue;
      }
    }
    m = line.match(/\.getByPlaceholder\(["'`](.+?)["'`]/);
    if (m) {
      const selector = '[placeholder="' + m[1] + '"]';
      const action = parseAction(line);
      if (action) {
        steps.push({ ...action, selector, frameSelectors: [], isPopup });
        if (pendingPopup && (action.type === "click" || action.type === "dblclick")) {
          steps.push({ type: "popup_opened" });
          pendingPopup = false;
          popupInitialized = true;
        }
        continue;
      }
    }
    m = line.match(/\.getByTestId\(["'`](.+?)["'`]/);
    if (m) {
      const selector = '[data-testid="' + m[1] + '"]';
      const action = parseAction(line);
      if (action) {
        steps.push({ ...action, selector, frameSelectors: [], isPopup });
        if (pendingPopup && (action.type === "click" || action.type === "dblclick")) {
          steps.push({ type: "popup_opened" });
          pendingPopup = false;
          popupInitialized = true;
        }
        continue;
      }
    }
  }
  return steps;
}
function parseFrameLocators(line) {
  const frames = [];
  const re = /\.frameLocator\(["'`](.+?)["'`]\)/g;
  let fm;
  while ((fm = re.exec(line)) !== null) {
    frames.push(fm[1]);
  }
  return frames;
}
function parseAction(line) {
  let m;
  m = line.match(/\.click\(/);
  if (m) return { type: "click" };
  m = line.match(/\.dblclick\(/);
  if (m) return { type: "dblclick" };
  m = line.match(/\.fill\(["'`](.*?)["'`]/);
  if (m) return { type: "fill", value: m[1] };
  m = line.match(/\.press\(["'`](.+?)["'`]/);
  if (m) return { type: "press", key: m[1] };
  m = line.match(/\.check\(/);
  if (m) return { type: "check" };
  m = line.match(/\.uncheck\(/);
  if (m) return { type: "uncheck" };
  return null;
}
async function executeStepWithPopup(page, step) {
  if (step.type === "click" || step.type === "dblclick") {
    const popupPromise = page.waitForEvent("popup", { timeout: 3e3 }).catch(() => null);
    await executeStep(page, step);
    const popup = await popupPromise;
    if (popup) {
      await popup.waitForLoadState("domcontentloaded").catch(() => {
      });
      return popup;
    }
    return null;
  }
  await executeStep(page, step);
  return null;
}
async function executeStep(page, step) {
  return (0, import_stepExecutor.executeStep)(page, step, stepOptions);
}
async function replayCode(codeText, options = {}, onProgress) {
  if (typeof codeText !== "string") {
    throw new Error("Invalid replay code: expected a string");
  }
  const skipOnError = options.skipOnError === true;
  const notify = typeof onProgress === "function" ? onProgress : () => {
  };
  const rawSteps = parseCodeToSteps(codeText);
  const steps = rawSteps.filter((step) => ALLOWED_STEP_TYPES.has(step.type));
  const crxApp = await getCrxApp();
  let page = await crxApp.newPage();
  let popupPage = null;
  const context = page.context();
  context.setDefaultTimeout(DEFAULT_ACTION_TIMEOUT_MS);
  context.setDefaultNavigationTimeout(DEFAULT_NAVIGATION_TIMEOUT_MS);
  let completedSteps = 0;
  let currentPageUrl = "";
  const errors = [];
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    if (step.type === "goto") {
      currentPageUrl = step.url || "";
    }
    notify({ type: "step", index: i, total: steps.length, step: (0, import_stepExecutor.describeStep)(step, i), status: "running" });
    try {
      if (step.type === "popup_opened") {
        completedSteps += 1;
        notify({ type: "step", index: i, total: steps.length, step: (0, import_stepExecutor.describeStep)(step, i), status: "done" });
        continue;
      }
      const targetPage = step.isPopup && popupPage ? popupPage : page;
      const nextStep = steps[i + 1];
      if ((step.type === "click" || step.type === "dblclick") && nextStep && nextStep.type === "popup_opened") {
        let newTabId = null;
        const tabCreatedListener = (tab) => {
          newTabId = tab.id;
        };
        chrome.tabs.onCreated.addListener(tabCreatedListener);
        await executeStep(targetPage, step);
        const waitStart = Date.now();
        while (!newTabId && Date.now() - waitStart < DEFAULT_NAVIGATION_TIMEOUT_MS) {
          await new Promise((r) => setTimeout(r, 100));
        }
        chrome.tabs.onCreated.removeListener(tabCreatedListener);
        if (newTabId) {
          await new Promise((resolve) => {
            const onUpdated = (tabId, changeInfo) => {
              if (tabId === newTabId && changeInfo.status === "complete") {
                chrome.tabs.onUpdated.removeListener(onUpdated);
                resolve();
              }
            };
            chrome.tabs.onUpdated.addListener(onUpdated);
            setTimeout(() => {
              chrome.tabs.onUpdated.removeListener(onUpdated);
              resolve();
            }, 5e3);
          });
          popupPage = await crxApp.attach(newTabId);
          await popupPage.waitForLoadState("load").catch(() => {
          });
          currentPageUrl = popupPage.url();
        }
        completedSteps += 1;
        notify({ type: "step", index: i, total: steps.length, step: (0, import_stepExecutor.describeStep)(step, i), status: "done" });
        continue;
      }
      if (step.type === "goto" && step.isPopup && popupPage) {
        const currentUrl = popupPage.url();
        const targetUrl = step.url || "";
        if (currentUrl === targetUrl || currentUrl.split("?")[0] === targetUrl.split("?")[0]) {
          completedSteps += 1;
          notify({ type: "step", index: i, total: steps.length, step: (0, import_stepExecutor.describeStep)(step, i), status: "done" });
          continue;
        }
        await popupPage.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: DEFAULT_NAVIGATION_TIMEOUT_MS });
        currentPageUrl = popupPage.url();
        completedSteps += 1;
        notify({ type: "step", index: i, total: steps.length, step: (0, import_stepExecutor.describeStep)(step, i), status: "done" });
        continue;
      }
      const popup = await executeStepWithPopup(targetPage, step);
      if (popup) {
        if (step.isPopup) {
          popupPage = popup;
        } else {
          page = popup;
        }
        currentPageUrl = (step.isPopup ? popupPage : page).url();
      }
      completedSteps += 1;
      notify({ type: "step", index: i, total: steps.length, step: (0, import_stepExecutor.describeStep)(step, i), status: "done" });
    } catch (error) {
      const errInfo = {
        stepIndex: i,
        stepDescription: (0, import_stepExecutor.describeStep)(step, i),
        pageUrl: currentPageUrl || page.url(),
        errorMessage: error.message
      };
      errors.push(errInfo);
      if (skipOnError) {
        notify({ type: "step", index: i, total: steps.length, step: (0, import_stepExecutor.describeStep)(step, i), status: "skipped", error: error.message });
        completedSteps += 1;
        continue;
      }
      await crxApp.detach(page).catch(() => {
      });
      if (popupPage) {
        await crxApp.detach(popupPage).catch(() => {
        });
      }
      await crxApp.close().catch(() => {
      });
      return {
        ok: false,
        stepCount: steps.length,
        completedSteps,
        failedStep: errInfo,
        errors,
        errorMessage: errInfo.stepDescription + " \u2014 " + error.message + " (page: " + errInfo.pageUrl + ")",
        completedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
    }
  }
  await crxApp.detach(page).catch(() => {
  });
  if (popupPage) {
    await crxApp.detach(popupPage).catch(() => {
    });
  }
  await crxApp.close().catch(() => {
  });
  return {
    ok: errors.length === 0,
    stepCount: steps.length,
    completedSteps,
    errors,
    errorMessage: errors.length > 0 ? errors.length + " step(s) skipped: " + errors.map((e) => e.stepDescription).join(", ") : "",
    completedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
async function replayRecording(recording, options = {}) {
  const useDelays = options.useDelays === true;
  const actionTimeoutMs = Math.max(1e3, Number(options.actionTimeoutMs) || DEFAULT_ACTION_TIMEOUT_MS);
  const navigationTimeoutMs = Math.max(1e3, Number(options.navigationTimeoutMs) || DEFAULT_NAVIGATION_TIMEOUT_MS);
  const maxDelayMs = Math.max(0, Number(options.maxDelayMs) || DEFAULT_MAX_DELAY_MS);
  const events = (0, import_playwright_generator.sanitizeEvents)(recording.events);
  const steps = (0, import_playwright_generator.normalizeRecordingToSteps)(recording, { includeDelays: useDelays });
  const crxApp = await getCrxApp();
  const page = await crxApp.newPage();
  const context = page.context();
  context.setDefaultTimeout(actionTimeoutMs);
  context.setDefaultNavigationTimeout(navigationTimeoutMs);
  let completedSteps = 0;
  try {
    for (let index = 0; index < steps.length; index += 1) {
      const step = steps[index];
      if (step.type === "wait") {
        await page.waitForTimeout(Math.min(step.durationMs || 0, maxDelayMs));
        completedSteps += 1;
        continue;
      }
      if (step.type === "goto") {
        if (step.url && step.url.startsWith("chrome://")) {
          completedSteps += 1;
          continue;
        }
        await page.goto(step.url, {
          waitUntil: "domcontentloaded",
          timeout: navigationTimeoutMs
        });
        completedSteps += 1;
        continue;
      }
      if (step.type === "scroll") {
        await page.evaluate(({ x, y }) => window.scrollTo(x, y), { x: step.x || 0, y: step.y || 0 });
        completedSteps += 1;
        continue;
      }
      if (step.type === "unsupported" || step.type === "upload") {
        completedSteps += 1;
        continue;
      }
      let scope = page;
      if (Array.isArray(step.frameSelectors) && step.frameSelectors.length) {
        for (const frameSelector of step.frameSelectors) {
          scope = scope.frameLocator(frameSelector);
        }
      }
      const locator = scope.locator(step.selector);
      if (step.type === "click") {
        await locator.click({ timeout: actionTimeoutMs });
        completedSteps += 1;
        continue;
      }
      if (step.type === "dblclick") {
        await locator.dblclick({ timeout: actionTimeoutMs });
        completedSteps += 1;
        continue;
      }
      if (step.type === "fill") {
        await locator.fill(step.value || "", { timeout: actionTimeoutMs });
        completedSteps += 1;
        continue;
      }
      if (step.type === "press") {
        await locator.press(step.key || "Enter", { timeout: actionTimeoutMs });
        completedSteps += 1;
        continue;
      }
      if (step.type === "check") {
        await locator.check({ timeout: actionTimeoutMs });
        completedSteps += 1;
        continue;
      }
      if (step.type === "uncheck") {
        await locator.uncheck({ timeout: actionTimeoutMs });
        completedSteps += 1;
        continue;
      }
      if (step.type === "select") {
        await locator.selectOption(step.values || [], { timeout: actionTimeoutMs });
        completedSteps += 1;
        continue;
      }
    }
  } catch (error) {
    await releaseCrxApp(page);
    const failedStep = steps[completedSteps] || null;
    const target = failedStep ? failedStep.selector || failedStep.url || failedStep.type : "unknown";
    return {
      ok: false,
      eventCount: events.length,
      stepCount: steps.length,
      completedSteps,
      failedStepIndex: completedSteps,
      failedStepTarget: target,
      failedStepType: failedStep ? failedStep.type : "unknown",
      errorMessage: error.message,
      completedAt: (/* @__PURE__ */ new Date()).toISOString(),
      useDelays
    };
  }
  await crxApp.detach(page).catch(() => {
  });
  await crxApp.close().catch(() => {
  });
  return {
    ok: true,
    eventCount: events.length,
    stepCount: steps.length,
    completedSteps,
    completedAt: (/* @__PURE__ */ new Date()).toISOString(),
    useDelays
  };
}
var import_playwright_generator, import_stepExecutor, DEFAULT_ACTION_TIMEOUT_MS, DEFAULT_NAVIGATION_TIMEOUT_MS, DEFAULT_MAX_DELAY_MS, activeCrxApp, stepOptions, ALLOWED_STEP_TYPES;
var init_crxPlayer = __esm({
  "extension/src/crxPlayer.js"() {
    import_playwright_generator = __toESM(require_playwright_generator());
    import_stepExecutor = __toESM(require_stepExecutor());
    DEFAULT_ACTION_TIMEOUT_MS = 1e4;
    DEFAULT_NAVIGATION_TIMEOUT_MS = 15e3;
    DEFAULT_MAX_DELAY_MS = 5e3;
    activeCrxApp = null;
    stepOptions = {
      actionTimeoutMs: DEFAULT_ACTION_TIMEOUT_MS,
      navigationTimeoutMs: DEFAULT_NAVIGATION_TIMEOUT_MS,
      maxDelayMs: DEFAULT_MAX_DELAY_MS
    };
    ALLOWED_STEP_TYPES = /* @__PURE__ */ new Set([
      "goto",
      "click",
      "dblclick",
      "fill",
      "press",
      "check",
      "uncheck",
      "select",
      "scroll",
      "wait",
      "popup_opened"
    ]);
  }
});

// extension/src/background.js
var require_background = __commonJS({
  "extension/src/background.js"() {
    init_crxPlayer();
    var sessions = /* @__PURE__ */ new Map();
    var idleIconPaths = {
      16: "icons/idle-icon-16.png",
      32: "icons/idle-icon-32.png",
      48: "icons/idle-icon-48.png",
      128: "icons/idle-icon-128.png"
    };
    var recordingIconPaths = {
      16: "icons/recording-icon-16.png",
      32: "icons/recording-icon-32.png",
      48: "icons/recording-icon-48.png",
      128: "icons/recording-icon-128.png"
    };
    var DEFAULT_SETTINGS = {
      openSidePanelOnActionClick: true
    };
    var childToParentTab = /* @__PURE__ */ new Map();
    var CONTEXT_MENU_OPEN = "playwright-recorder-open-panel";
    var CONTEXT_MENU_TOGGLE = "playwright-recorder-toggle-recording";
    async function configureSidePanel() {
      if (!chrome.sidePanel || !chrome.sidePanel.setPanelBehavior) {
        return;
      }
      const settings = await chrome.storage.sync.get(DEFAULT_SETTINGS);
      await chrome.sidePanel.setPanelBehavior({
        openPanelOnActionClick: settings.openSidePanelOnActionClick
      });
    }
    async function updateActionIcon(tabId, isRecording) {
      if (tabId == null || !chrome.action || !chrome.action.setIcon) {
        return;
      }
      await chrome.action.setIcon({
        tabId,
        path: isRecording ? recordingIconPaths : idleIconPaths
      });
    }
    function getSession(tabId) {
      if (!sessions.has(tabId)) {
        sessions.set(tabId, {
          recording: false,
          startedAt: null,
          events: [],
          networkRequests: [],
          consoleLogs: [],
          debuggerAttached: false
        });
      }
      return sessions.get(tabId);
    }
    async function attachDebugger(tabId) {
      const session = getSession(tabId);
      try {
        await chrome.debugger.attach({ tabId }, "1.3");
        session.debuggerAttached = true;
        await chrome.debugger.sendCommand({ tabId }, "Network.enable", {});
        await chrome.debugger.sendCommand({ tabId }, "Runtime.enable", {});
        await chrome.debugger.sendCommand({ tabId }, "Page.enable", {});
        console.log("[CDP] Debugger attached to tab", tabId);
      } catch (error) {
        console.log("[CDP] Failed to attach:", error.message);
        session.debuggerAttached = false;
      }
    }
    async function detachDebugger(tabId) {
      const session = getSession(tabId);
      if (!session.debuggerAttached) return;
      try {
        await chrome.debugger.detach({ tabId });
        console.log("[CDP] Debugger detached from tab", tabId);
      } catch (_error) {
      }
      session.debuggerAttached = false;
    }
    chrome.debugger.onEvent.addListener(function(source, method, params) {
      const tabId = source.tabId;
      if (tabId == null) return;
      const session = sessions.get(tabId);
      if (!session || !session.recording) return;
      if (method === "Network.requestWillBeSent") {
        const req = params.request;
        if (!req || !req.url) return;
        if (req.url.startsWith("data:") || req.url.startsWith("chrome-extension:")) return;
        session.networkRequests.push({
          timestamp: Date.now(),
          method: req.method,
          url: req.url,
          type: params.type || "",
          requestId: params.requestId
        });
      }
      if (method === "Network.responseReceived") {
        const resp = params.response;
        if (!resp) return;
        const existing = session.networkRequests.find(function(r) {
          return r.requestId === params.requestId;
        });
        if (existing) {
          existing.status = resp.status;
          existing.statusText = resp.statusText || "";
          existing.mimeType = resp.mimeType || "";
        }
      }
      if (method === "Runtime.consoleAPICalled") {
        const args = (params.args || []).map(function(arg) {
          return arg.value !== void 0 ? String(arg.value) : arg.description || arg.type;
        });
        session.consoleLogs.push({
          timestamp: Date.now(),
          level: params.type || "log",
          text: args.join(" ")
        });
      }
    });
    chrome.debugger.onDetach.addListener(function(source, reason) {
      const tabId = source.tabId;
      if (tabId == null) return;
      const session = sessions.get(tabId);
      if (session) {
        session.debuggerAttached = false;
        console.log("[CDP] Debugger detached by", reason, "from tab", tabId);
      }
    });
    async function getActiveTab() {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      return tabs[0] || null;
    }
    function makeRecordingPayload(session) {
      return {
        startedAt: session.startedAt,
        stoppedAt: session.recording ? null : Date.now(),
        events: session.events,
        networkRequests: session.networkRequests || [],
        consoleLogs: session.consoleLogs || []
      };
    }
    async function openRecorderPanel(tab) {
      if (!chrome.sidePanel || !chrome.sidePanel.open || !tab) {
        return false;
      }
      await chrome.sidePanel.open({
        tabId: tab.id,
        windowId: tab.windowId
      });
      return true;
    }
    function createInitialRecording(initialUrl) {
      return initialUrl ? [
        {
          type: "navigation",
          url: initialUrl,
          timestamp: Date.now(),
          delayMs: 0
        }
      ] : [];
    }
    async function toggleRecordingForTab(tab) {
      if (!tab || tab.id == null) {
        return null;
      }
      const session = getSession(tab.id);
      if (session.recording) {
        session.recording = false;
        await updateActionIcon(tab.id, false).catch(() => {
        });
        chrome.tabs.sendMessage(tab.id, { type: "SET_RECORDING_STATE", recording: false }).catch(() => {
        });
        return { recording: false, recordingData: makeRecordingPayload(session) };
      }
      session.recording = true;
      session.startedAt = Date.now();
      session.events = createInitialRecording(tab.url);
      await updateActionIcon(tab.id, true).catch(() => {
      });
      chrome.tabs.sendMessage(tab.id, { type: "SET_RECORDING_STATE", recording: true }).catch(() => {
      });
      return { recording: true, session };
    }
    function createContextMenus() {
      chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
          id: CONTEXT_MENU_OPEN,
          title: "Open Recorder Panel",
          contexts: ["action", "page"]
        });
        chrome.contextMenus.create({
          id: CONTEXT_MENU_TOGGLE,
          title: "Toggle Recording",
          contexts: ["action", "page"]
        });
      });
    }
    function makeNavigationEvent(tab) {
      return {
        type: "navigation",
        url: tab.url,
        title: tab.title || "",
        timestamp: Date.now()
      };
    }
    function pushRecordedEvent(session, event) {
      const lastEvent = session.events[session.events.length - 1];
      const baseTimestamp = lastEvent ? lastEvent.timestamp : session.startedAt || event.timestamp || Date.now();
      const timestamp = event.timestamp || Date.now();
      session.events.push({
        ...event,
        timestamp,
        delayMs: Math.max(0, timestamp - baseTimestamp)
      });
    }
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      const fromExtensionPage = !sender.tab;
      if (message.type === "START_RECORDING") {
        if (!fromExtensionPage) return false;
        const tabId = message.tabId;
        const session = getSession(tabId);
        session.recording = true;
        session.startedAt = Date.now();
        session.events = createInitialRecording(message.initialUrl);
        session.networkRequests = [];
        session.consoleLogs = [];
        updateActionIcon(tabId, true).catch(() => {
        });
        chrome.tabs.sendMessage(tabId, { type: "SET_RECORDING_STATE", recording: true }).catch(() => {
        });
        attachDebugger(tabId).then(() => sendResponse({ ok: true, session }));
        return true;
      }
      if (message.type === "STOP_RECORDING") {
        if (!fromExtensionPage) return false;
        const tabId = message.tabId;
        const session = getSession(tabId);
        session.recording = false;
        updateActionIcon(tabId, false).catch(() => {
        });
        chrome.tabs.sendMessage(tabId, { type: "SET_RECORDING_STATE", recording: false }).catch(() => {
        });
        detachDebugger(tabId).then(() => {
          console.log("[CDP] Network requests:", session.networkRequests.length, "Console logs:", session.consoleLogs.length);
          sendResponse({
            ok: true,
            recording: makeRecordingPayload(session)
          });
        });
        return true;
      }
      if (message.type === "GET_STATE") {
        if (!fromExtensionPage) return false;
        const tabId = message.tabId;
        const session = getSession(tabId);
        sendResponse({
          ok: true,
          recording: session.recording,
          eventCount: session.events.length,
          startedAt: session.startedAt
        });
        return true;
      }
      if (message.type === "GET_RECORDING") {
        if (!fromExtensionPage) return false;
        const tabId = message.tabId;
        const session = getSession(tabId);
        sendResponse({
          ok: true,
          recording: makeRecordingPayload(session)
        });
        return true;
      }
      if (message.type === "REPLAY_RECORDING") {
        if (!fromExtensionPage) return false;
        const recording = message.recording;
        const options = message.options || {};
        replayRecording(recording, options).then((result) => sendResponse(result)).catch((error) => sendResponse({ ok: false, errorMessage: error.message }));
        return true;
      }
      if (message.type === "REPLAY_CODE") {
        let onProgress = function(info) {
          chrome.runtime.sendMessage({ type: "REPLAY_PROGRESS", ...info }).catch(() => {
          });
        };
        if (!fromExtensionPage) return false;
        replayCode(message.code, message.options || {}, onProgress).then((result) => sendResponse(result)).catch((error) => sendResponse({ ok: false, errorMessage: error.message }));
        return true;
      }
      if (message.type === "QUERY_RECORDING_STATE" && sender.tab && sender.tab.id != null) {
        const senderTabId = sender.tab.id;
        if (childToParentTab.has(senderTabId)) {
          const parentSession = getSession(childToParentTab.get(senderTabId));
          sendResponse({ ok: true, recording: parentSession.recording });
          return true;
        }
        const ownSession = sessions.get(senderTabId);
        if (ownSession && ownSession.recording) {
          sendResponse({ ok: true, recording: true });
          return true;
        }
        for (const [parentTabId, session] of sessions.entries()) {
          if (session.recording && parentTabId !== senderTabId) {
            childToParentTab.set(senderTabId, parentTabId);
            sendResponse({ ok: true, recording: true });
            return true;
          }
        }
        sendResponse({ ok: true, recording: false });
        return true;
      }
      if (message.type === "RECORDED_EVENT" && sender.tab && sender.tab.id != null) {
        const senderTabId = sender.tab.id;
        const isPopup = childToParentTab.has(senderTabId);
        const targetTabId = isPopup ? childToParentTab.get(senderTabId) : senderTabId;
        const session = getSession(targetTabId);
        if (!session.recording) {
          sendResponse({ ok: false, ignored: true });
          return true;
        }
        const event = isPopup ? { ...message.event, isPopup: true } : message.event;
        pushRecordedEvent(session, event);
        sendResponse({ ok: true, count: session.events.length });
        return true;
      }
      return false;
    });
    chrome.tabs.onRemoved.addListener((tabId) => {
      sessions.delete(tabId);
      childToParentTab.delete(tabId);
    });
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status !== "complete" || !tab.url) {
        return;
      }
      if (childToParentTab.has(tabId)) {
        chrome.tabs.sendMessage(tabId, { type: "SET_RECORDING_STATE", recording: true }).catch(() => {
        });
      }
      const isPopup = childToParentTab.has(tabId);
      const targetTabId = isPopup ? childToParentTab.get(tabId) : tabId;
      const session = getSession(targetTabId);
      if (!session.recording) {
        return;
      }
      const lastEvent = session.events[session.events.length - 1];
      if (lastEvent && lastEvent.type === "navigation" && lastEvent.url === tab.url) {
        return;
      }
      const navEvent = makeNavigationEvent(tab);
      if (isPopup) {
        navEvent.isPopup = true;
      }
      pushRecordedEvent(session, navEvent);
    });
    chrome.tabs.onActivated.addListener(async ({ tabId }) => {
      const session = sessions.get(tabId);
      await updateActionIcon(tabId, Boolean(session && session.recording)).catch(() => {
      });
    });
    chrome.runtime.onInstalled.addListener(() => {
      configureSidePanel().catch(() => {
      });
      createContextMenus();
    });
    chrome.runtime.onStartup.addListener(() => {
      configureSidePanel().catch(() => {
      });
      createContextMenus();
    });
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "sync") {
        return;
      }
      if (changes.openSidePanelOnActionClick) {
        configureSidePanel().catch(() => {
        });
      }
    });
    chrome.contextMenus.onClicked.addListener(async (info, tab) => {
      const targetTab = tab || await getActiveTab();
      if (!targetTab) {
        return;
      }
      if (info.menuItemId === CONTEXT_MENU_OPEN) {
        await openRecorderPanel(targetTab).catch(() => {
        });
        return;
      }
      if (info.menuItemId === CONTEXT_MENU_TOGGLE) {
        await toggleRecordingForTab(targetTab).catch(() => {
        });
      }
    });
    chrome.commands.onCommand.addListener(async (command) => {
      const activeTab = await getActiveTab();
      if (!activeTab) {
        return;
      }
      if (command === "open-recorder-panel") {
        await openRecorderPanel(activeTab).catch(() => {
        });
        return;
      }
      if (command === "toggle-recording") {
        await toggleRecordingForTab(activeTab).catch(() => {
        });
      }
    });
    chrome.tabs.onCreated.addListener((tab) => {
      if (tab.openerTabId != null) {
        const parentSession = sessions.get(tab.openerTabId);
        if (parentSession && parentSession.recording) {
          childToParentTab.set(tab.id, tab.openerTabId);
          pushRecordedEvent(parentSession, { type: "popup_opened", timestamp: Date.now() });
          return;
        }
      }
      for (const [parentTabId, session] of sessions.entries()) {
        if (session.recording) {
          childToParentTab.set(tab.id, parentTabId);
          pushRecordedEvent(session, { type: "popup_opened", timestamp: Date.now() });
          return;
        }
      }
    });
    configureSidePanel().catch(() => {
    });
    createContextMenus();
  }
});
export default require_background();
