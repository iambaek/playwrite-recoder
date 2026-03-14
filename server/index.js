const path = require("path");
const express = require("express");
const {
  activeBrowsers,
  deleteProfile,
  ensureProfile,
  closeSharedSession,
  getLastRunSummary,
  getLastTracePath,
  getSharedSessionState,
  listProfiles,
  loadRecordingFile,
  openFileInBrowser,
  openTraceViewer,
  runRecording,
  writeHtmlReport,
  writePlaywrightFile
} = require("./playwrightRunner");

const PORT = process.env.PORT || 3100;

const ALLOWED_ORIGIN_PATTERN = /^chrome-extension:\/\//;

function createServer() {
  const app = express();
  app.use(function allowCors(req, res, next) {
    const origin = req.headers.origin || "";
    if (ALLOWED_ORIGIN_PATTERN.test(origin) || origin === "http://localhost:3100") {
      res.setHeader("Access-Control-Allow-Origin", origin);
    }
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
    next();
  });
  app.options("*", function preflight(_req, res) {
    res.sendStatus(204);
  });
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", function health(_req, res) {
    res.json({
      ok: true,
      openBrowsers: activeBrowsers.size,
      lastTracePath: getLastTracePath(),
      sharedSession: getSharedSessionState()
    });
  });

  app.get("/api/profiles", function profiles(req, res) {
    try {
      const browserName = req.query.browserName || "chromium";
      const profiles = listProfiles({ browserName });
      res.json({ ok: true, profiles });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.post("/api/profiles", function createProfile(req, res) {
    try {
      const browserName = (req.body && req.body.browserName) || "chromium";
      const profileName = req.body && req.body.profileName;
      if (!profileName) {
        res.status(400).json({ ok: false, error: "profileName is required" });
        return;
      }

      const result = ensureProfile({ browserName, profileName });
      res.json({ ok: true, ...result, profiles: listProfiles({ browserName }) });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.delete("/api/profiles/:profileName", async function removeProfile(req, res) {
    try {
      const browserName = req.query.browserName || "chromium";
      const deleted = await deleteProfile({
        browserName,
        profileName: req.params.profileName
      });
      res.json({ ok: true, deleted, profiles: listProfiles({ browserName }) });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.post("/api/replay", async function replay(req, res) {
    try {
      const recording = req.body && req.body.recording ? req.body.recording : null;
      if (!recording || !Array.isArray(recording.events)) {
        res.status(400).json({ ok: false, error: "Invalid recording payload" });
        return;
      }

      const result = await runRecording(recording, req.body.options || {});
      res.json(result);
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.post("/api/show-trace", function showTrace(req, res) {
    try {
      const tracePath = (req.body && req.body.tracePath) || getLastTracePath();
      if (!tracePath) {
        res.status(400).json({ ok: false, error: "No trace file available" });
        return;
      }

      const openedPath = openTraceViewer(tracePath);
      res.json({ ok: true, tracePath: openedPath });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.post("/api/show-report", function showReport(req, res) {
    try {
      const summary = getLastRunSummary();
      if (!summary) {
        res.status(400).json({ ok: false, error: "No replay report available" });
        return;
      }

      const reportsDir = path.join(process.cwd(), "recordings", "reports");
      const rawOutput = (req.body && req.body.outputPath) || path.join(reportsDir, "latest-report.html");
      const resolvedOutput = path.resolve(rawOutput);
      if (!resolvedOutput.startsWith(path.join(process.cwd(), "recordings"))) {
        res.status(400).json({ ok: false, error: "Output path must be inside recordings/" });
        return;
      }
      const reportPath = writeHtmlReport(summary, resolvedOutput);
      const openedPath = openFileInBrowser(reportPath);
      res.json({ ok: true, reportPath: openedPath });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.post("/api/session/reset", async function resetSession(req, res) {
    try {
      const closed = await closeSharedSession(req.body || {});
      res.json({ ok: true, closed });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.post("/api/export", function exportCode(req, res) {
    try {
      const recording = req.body && req.body.recording ? req.body.recording : null;
      if (!recording || !Array.isArray(recording.events)) {
        res.status(400).json({ ok: false, error: "Invalid recording payload" });
        return;
      }

      const recordingsDir = path.join(process.cwd(), "recordings");
      const rawOutput = req.body.outputPath || path.join(recordingsDir, "session.js");
      const resolvedOutput = path.resolve(rawOutput);
      if (!resolvedOutput.startsWith(recordingsDir)) {
        res.status(400).json({ ok: false, error: "Output path must be inside recordings/" });
        return;
      }

      const absolutePath = writePlaywrightFile(recording, resolvedOutput, req.body.options || {});
      res.json({ ok: true, outputPath: absolutePath });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  return app;
}

async function runCli() {
  const command = process.argv[2] || "serve";

  if (command === "serve") {
    const app = createServer();
    app.listen(PORT, function onListen() {
      console.log("Server listening on http://localhost:" + PORT);
    });
    return;
  }

  if (command === "health") {
    process.stdout.write("ok\n");
    return;
  }

  if (command === "replay") {
    const sourcePath = process.argv[3];
    if (!sourcePath) {
      console.error("Usage: node server/index.js replay <recording.json>");
      process.exit(1);
    }

    const { recording, absolutePath } = loadRecordingFile(sourcePath);
    const result = await runRecording(recording, { headless: false, keepOpen: false, trace: true });
    console.log("Replayed:", absolutePath);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === "export") {
    const sourcePath = process.argv[3];
    const outputPath = process.argv[4] || path.join(process.cwd(), "recordings", "session.js");

    if (!sourcePath) {
      console.error("Usage: node server/index.js export <recording.json> [output.js]");
      process.exit(1);
    }

    const { recording } = loadRecordingFile(sourcePath);
    const savedPath = writePlaywrightFile(recording, outputPath, { headless: false });
    console.log("Exported:", savedPath);
    return;
  }

  if (command === "show-trace") {
    const tracePath = process.argv[3];
    const targetPath = tracePath || getLastTracePath();
    if (!targetPath) {
      console.error("Usage: node server/index.js show-trace <trace.zip>");
      process.exit(1);
    }

    const openedPath = openTraceViewer(targetPath);
    console.log("Opened trace viewer:", openedPath);
    return;
  }

  if (command === "show-report") {
    const reportPath = process.argv[3] || path.join(process.cwd(), "recordings", "reports", "latest-report.html");
    const openedPath = openFileInBrowser(reportPath);
    console.log("Opened report:", openedPath);
    return;
  }

  console.error("Unknown command:", command);
  process.exit(1);
}

if (require.main === module) {
  runCli().catch(function onError(error) {
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  createServer
};
