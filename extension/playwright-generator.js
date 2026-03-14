(function initGenerator(root, factory) {
  if (typeof module !== "undefined" && module.exports) {
    module.exports = factory();
    return;
  }

  root.PlaywriteRecoderGenerator = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function createGenerator() {
  function escapeJs(value) {
    return JSON.stringify(value == null ? "" : String(value));
  }

  function sanitizeText(value) {
    return String(value == null ? "" : value)
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/g, "")
      .trim();
  }

  function ensureArray(events) {
    return Array.isArray(events) ? events : [];
  }

  function sanitizeEvents(events) {
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
        durationMs: event.delayMs
      });
    }
  }

  function normalizeRecordingToSteps(recording, options) {
    var settings = options || {};
    var events = sanitizeEvents(recording && recording.events);
    var steps = [];

    events.forEach(function normalize(event, index) {
      var nextEvent = events[index + 1];

      if ((event.type === "click" || event.type === "dblclick") && nextEvent && nextEvent.type === "navigation") {
        return;
      }

      pushDelayStep(steps, event, settings);

      if (event.type === "navigation") {
        steps.push({ type: "goto", url: event.url || "" });
        return;
      }

      if (event.type === "click") {
        steps.push({ type: "click", selector: event.selector || "body", frameSelectors: event.frameSelectors || [] });
        return;
      }

      if (event.type === "dblclick") {
        steps.push({ type: "dblclick", selector: event.selector || "body", frameSelectors: event.frameSelectors || [] });
        return;
      }

      if (event.type === "input") {
        steps.push({
          type: "fill",
          selector: event.selector || "body",
          value: event.value || "",
          frameSelectors: event.frameSelectors || []
        });
        return;
      }

      if (event.type === "keydown") {
        steps.push({
          type: "press",
          selector: event.selector || "body",
          key: event.key || "Enter",
          frameSelectors: event.frameSelectors || []
        });
        return;
      }

      if (event.type === "check") {
        steps.push({
          type: event.checked ? "check" : "uncheck",
          selector: event.selector || "body",
          frameSelectors: event.frameSelectors || []
        });
        return;
      }

      if (event.type === "select") {
        steps.push({
          type: "select",
          selector: event.selector || "body",
          values: Array.isArray(event.values) ? event.values : [event.value || ""],
          frameSelectors: event.frameSelectors || []
        });
        return;
      }

      if (event.type === "scroll") {
        steps.push({
          type: "scroll",
          x: typeof event.x === "number" ? event.x : 0,
          y: typeof event.y === "number" ? event.y : 0
        });
        return;
      }

      if (event.type === "upload") {
        steps.push({
          type: "upload",
          selector: event.selector || "body",
          fileNames: Array.isArray(event.fileNames) ? event.fileNames : [],
          frameSelectors: event.frameSelectors || []
        });
        return;
      }

      steps.push({
        type: "unsupported",
        originalType: event.type
      });
    });

    return steps;
  }

  function buildStep(step) {
    var scope = "page";
    if (Array.isArray(step.frameSelectors) && step.frameSelectors.length) {
      scope = step.frameSelectors.reduce(function chain(target, selector) {
        return target + ".frameLocator(" + escapeJs(selector) + ")";
      }, "page");
    }

    switch (step.type) {
      case "wait":
        return "  await page.waitForTimeout(" + String(step.durationMs || 0) + ");";
      case "goto":
        return "  await page.goto(" + escapeJs(step.url) + ");";
      case "click":
        return "  await " + scope + ".locator(" + escapeJs(step.selector) + ").click();";
      case "dblclick":
        return "  await " + scope + ".locator(" + escapeJs(step.selector) + ").dblclick();";
      case "fill":
        return "  await " + scope + ".locator(" + escapeJs(step.selector) + ").fill(" + escapeJs(step.value) + ");";
      case "press":
        return "  await " + scope + ".locator(" + escapeJs(step.selector) + ").press(" + escapeJs(step.key) + ");";
      case "check":
        return "  await " + scope + ".locator(" + escapeJs(step.selector) + ").check();";
      case "uncheck":
        return "  await " + scope + ".locator(" + escapeJs(step.selector) + ").uncheck();";
      case "select":
        return "  await " + scope + ".locator(" + escapeJs(step.selector) + ").selectOption(" + JSON.stringify(step.values || []) + ");";
      case "scroll":
        return "  await page.evaluate(({ x, y }) => window.scrollTo(x, y), " + JSON.stringify({ x: step.x || 0, y: step.y || 0 }) + ");";
      case "upload":
        return "  // Upload step recorded for " + escapeJs(step.selector) + " but local file paths are unavailable in extension recording.";
      default:
        return "  // Unsupported step: " + escapeJs(step.originalType || step.type);
    }
  }

  function generatePlaywrightCode(recording, options) {
    var settings = options || {};
    var steps = normalizeRecordingToSteps(recording, {
      includeDelays: settings.useDelays !== false
    });
    var browserName = settings.browserName ? settings.browserName : "chromium";
    var headless = typeof settings.headless === "boolean" ? settings.headless : false;
    var renderedSteps = steps.map(buildStep).join("\n");

    return [
      "const { " + browserName + " } = require('playwright');",
      "",
      "(async () => {",
      "  const browser = await " + browserName + ".launch({ headless: " + String(headless) + " });",
      "  const context = await browser.newContext();",
      "  const page = await context.newPage();",
      renderedSteps,
      "  await browser.close();",
      "})().catch((error) => {",
      "  console.error(error);",
      "  process.exit(1);",
      "});",
      ""
    ].join("\n");
  }

  return {
    generatePlaywrightCode: generatePlaywrightCode,
    normalizeRecordingToSteps: normalizeRecordingToSteps,
    sanitizeEvents: sanitizeEvents
  };
});
