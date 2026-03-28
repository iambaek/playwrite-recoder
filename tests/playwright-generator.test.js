const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  sanitizeEvents,
  normalizeRecordingToSteps,
  generatePlaywrightCode
} = require("../shared/playwright-generator");

describe("sanitizeEvents", () => {
  it("returns empty array for non-array input", () => {
    assert.deepStrictEqual(sanitizeEvents(null), []);
    assert.deepStrictEqual(sanitizeEvents(undefined), []);
    assert.deepStrictEqual(sanitizeEvents("string"), []);
  });

  it("filters out events without a type string", () => {
    const events = [
      { type: "click", selector: "#btn" },
      { noType: true },
      null,
      { type: 123 }
    ];
    const result = sanitizeEvents(events);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].type, "click");
  });

  it("strips control characters from string fields", () => {
    const events = [{ type: "input", value: "hello\x00world", selector: "input\x07" }];
    const result = sanitizeEvents(events);
    assert.strictEqual(result[0].value, "helloworld");
    assert.strictEqual(result[0].selector, "input");
  });

  it("sanitizes array fields", () => {
    const events = [{ type: "select", values: ["a\x00", "b"], frameSelectors: ["", "frame"] }];
    const result = sanitizeEvents(events);
    assert.deepStrictEqual(result[0].values, ["a", "b"]);
    assert.deepStrictEqual(result[0].frameSelectors, ["frame"]);
  });
});

describe("normalizeRecordingToSteps", () => {
  it("converts navigation event to goto step", () => {
    const recording = { events: [{ type: "navigation", url: "https://example.com" }] };
    const steps = normalizeRecordingToSteps(recording);
    assert.strictEqual(steps.length, 1);
    assert.deepStrictEqual(steps[0], { type: "goto", url: "https://example.com", title: "", isPopup: false });
  });

  it("converts click event to click step", () => {
    const recording = { events: [{ type: "click", selector: "#btn" }] };
    const steps = normalizeRecordingToSteps(recording);
    assert.strictEqual(steps[0].type, "click");
    assert.strictEqual(steps[0].selector, "#btn");
  });

  it("converts dblclick event to dblclick step", () => {
    const recording = { events: [{ type: "dblclick", selector: "#btn" }] };
    const steps = normalizeRecordingToSteps(recording);
    assert.strictEqual(steps[0].type, "dblclick");
  });

  it("converts input event to fill step", () => {
    const recording = { events: [{ type: "input", selector: "input", value: "hello" }] };
    const steps = normalizeRecordingToSteps(recording);
    assert.strictEqual(steps[0].type, "fill");
    assert.strictEqual(steps[0].value, "hello");
  });

  it("converts keydown event to press step", () => {
    const recording = { events: [{ type: "keydown", selector: "input", key: "Enter" }] };
    const steps = normalizeRecordingToSteps(recording);
    assert.strictEqual(steps[0].type, "press");
    assert.strictEqual(steps[0].key, "Enter");
  });

  it("converts check event to check/uncheck steps", () => {
    const recording = {
      events: [
        { type: "check", selector: "#cb1", checked: true },
        { type: "check", selector: "#cb2", checked: false }
      ]
    };
    const steps = normalizeRecordingToSteps(recording);
    assert.strictEqual(steps[0].type, "check");
    assert.strictEqual(steps[1].type, "uncheck");
  });

  it("converts select event to select step", () => {
    const recording = { events: [{ type: "select", selector: "select", values: ["a", "b"] }] };
    const steps = normalizeRecordingToSteps(recording);
    assert.strictEqual(steps[0].type, "select");
    assert.deepStrictEqual(steps[0].values, ["a", "b"]);
  });

  it("converts scroll event to scroll step", () => {
    const recording = { events: [{ type: "scroll", x: 0, y: 500 }] };
    const steps = normalizeRecordingToSteps(recording);
    assert.strictEqual(steps[0].type, "scroll");
    assert.strictEqual(steps[0].y, 500);
  });

  it("skips navigation following a click (keeps click)", () => {
    const recording = {
      events: [
        { type: "click", selector: "#link" },
        { type: "navigation", url: "https://example.com" }
      ]
    };
    const steps = normalizeRecordingToSteps(recording);
    assert.strictEqual(steps.length, 1);
    assert.strictEqual(steps[0].type, "click");
  });

  it("includes delay steps when includeDelays is true", () => {
    const recording = {
      events: [
        { type: "click", selector: "#btn", delayMs: 1000 },
        { type: "click", selector: "#btn2", delayMs: 500 }
      ]
    };
    const steps = normalizeRecordingToSteps(recording, { includeDelays: true });
    assert.strictEqual(steps.length, 4);
    assert.strictEqual(steps[0].type, "wait");
    assert.strictEqual(steps[0].durationMs, 1000);
    assert.strictEqual(steps[2].type, "wait");
    assert.strictEqual(steps[2].durationMs, 500);
  });

  it("excludes delay steps when includeDelays is false", () => {
    const recording = {
      events: [{ type: "click", selector: "#btn", delayMs: 1000 }]
    };
    const steps = normalizeRecordingToSteps(recording, { includeDelays: false });
    assert.strictEqual(steps.length, 1);
    assert.strictEqual(steps[0].type, "click");
  });

  it("marks unknown event types as unsupported", () => {
    const recording = { events: [{ type: "unknown_event" }] };
    const steps = normalizeRecordingToSteps(recording);
    assert.strictEqual(steps[0].type, "unsupported");
    assert.strictEqual(steps[0].originalType, "unknown_event");
  });

  it("preserves frameSelectors", () => {
    const recording = {
      events: [{ type: "click", selector: "#btn", frameSelectors: ["iframe#main"] }]
    };
    const steps = normalizeRecordingToSteps(recording);
    assert.deepStrictEqual(steps[0].frameSelectors, ["iframe#main"]);
  });
});

describe("generatePlaywrightCode", () => {
  it("generates valid playwright test runner script", () => {
    const recording = {
      events: [
        { type: "navigation", url: "https://example.com" },
        { type: "click", selector: "#btn" }
      ]
    };
    const code = generatePlaywrightCode(recording);
    assert.ok(code.includes("from '@playwright/test'"));
    assert.ok(code.includes("import { test, expect }"));
    assert.ok(code.includes("test("));
    assert.ok(code.includes("async ({ page }) =>"));
    assert.ok(code.includes('page.goto("https://example.com")'));
    assert.ok(code.includes('.locator("#btn").click()'));
  });

  it("respects testName option", () => {
    const recording = { events: [] };
    const code = generatePlaywrightCode(recording, { testName: "Login flow" });
    assert.ok(code.includes('"Login flow"'));
  });

  it("uses default test name when not specified", () => {
    const recording = { events: [] };
    const code = generatePlaywrightCode(recording);
    assert.ok(code.includes('"test"'));
  });

  it("generates frameLocator for iframe steps", () => {
    const recording = {
      events: [{ type: "click", selector: "#btn", frameSelectors: ["iframe#main"] }]
    };
    const code = generatePlaywrightCode(recording);
    assert.ok(code.includes('frameLocator("iframe#main")'));
  });

  it("generates upload comment", () => {
    const recording = {
      events: [{ type: "upload", selector: "input[type=file]", fileNames: ["test.png"] }]
    };
    const code = generatePlaywrightCode(recording);
    assert.ok(code.includes("// Upload step"));
  });
});
