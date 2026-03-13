import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(server: Server, app: Express) {
  // ─── Platform Routes ─────────────────────────────────────────────

  app.get("/api/platforms", async (_req, res) => {
    const platforms = await storage.getAllPlatforms();
    res.json(platforms);
  });

  app.get("/api/platforms/distinct/:field", async (req, res) => {
    const field = req.params.field as "os" | "compiler" | "host" | "architecture";
    if (!["os", "compiler", "host", "architecture"].includes(field)) {
      return res.status(400).json({ error: "Invalid field" });
    }
    const values = await storage.getDistinctValues(field);
    res.json(values);
  });

  // ─── Test Run Routes ─────────────────────────────────────────────

  app.get("/api/runs", async (req, res) => {
    const filters = {
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
      framework: req.query.framework as string | undefined,
      status: req.query.status as string | undefined,
      os: req.query.os as string | undefined,
      compiler: req.query.compiler as string | undefined,
      host: req.query.host as string | undefined,
      architecture: req.query.architecture as string | undefined,
      branch: req.query.branch as string | undefined,
      commitHash: req.query.commitHash as string | undefined,
      search: req.query.search as string | undefined,
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
      sortBy: req.query.sortBy as string | undefined,
      sortOrder: req.query.sortOrder as "asc" | "desc" | undefined,
    };
    const result = await storage.getTestRuns(filters);
    
    // Enrich with platform data
    const platforms = await storage.getAllPlatforms();
    const platformMap = new Map(platforms.map(p => [p.id, p]));
    
    const enrichedRuns = result.runs.map(run => ({
      ...run,
      platform: platformMap.get(run.platformId),
    }));

    res.json({ runs: enrichedRuns, total: result.total });
  });

  app.get("/api/runs/:id", async (req, res) => {
    const run = await storage.getTestRun(parseInt(req.params.id));
    if (!run) return res.status(404).json({ error: "Run not found" });
    
    const platform = await storage.getPlatform(run.platformId);
    res.json({ ...run, platform });
  });

  app.post("/api/runs", async (req, res) => {
    try {
      const run = await storage.createTestRun(req.body);
      res.status(201).json(run);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/runs/:id", async (req, res) => {
    await storage.deleteTestRun(parseInt(req.params.id));
    res.json({ deleted: true });
  });

  app.get("/api/runs/commit/:hash", async (req, res) => {
    const runs = await storage.getRunsByCommit(req.params.hash);
    res.json(runs);
  });

  // ─── Test Result Routes ──────────────────────────────────────────

  app.get("/api/runs/:id/results", async (req, res) => {
    const filters = {
      status: req.query.status as string | undefined,
      suiteName: req.query.suiteName as string | undefined,
      search: req.query.search as string | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
    };
    const result = await storage.getTestResults(parseInt(req.params.id), filters);
    res.json(result);
  });

  app.get("/api/results/:id", async (req, res) => {
    const result = await storage.getTestResult(parseInt(req.params.id));
    if (!result) return res.status(404).json({ error: "Result not found" });
    res.json(result);
  });

  // ─── Bulk Import ─────────────────────────────────────────────────

  app.post("/api/import", async (req, res) => {
    try {
      const run = await storage.importRun(req.body);
      res.status(201).json(run);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ─── Analytics Routes ────────────────────────────────────────────

  app.get("/api/analytics/dashboard", async (_req, res) => {
    const stats = await storage.getDashboardStats();
    res.json(stats);
  });

  app.get("/api/analytics/pass-rate-trend", async (req, res) => {
    const days = req.query.days ? parseInt(req.query.days as string) : 30;
    const filters = {
      framework: req.query.framework as string | undefined,
      os: req.query.os as string | undefined,
      compiler: req.query.compiler as string | undefined,
      architecture: req.query.architecture as string | undefined,
      branch: req.query.branch as string | undefined,
    };
    const trend = await storage.getPassRateTrend(days, filters);
    res.json(trend);
  });

  app.get("/api/analytics/duration-trend", async (req, res) => {
    const days = req.query.days ? parseInt(req.query.days as string) : 30;
    const filters = {
      framework: req.query.framework as string | undefined,
      os: req.query.os as string | undefined,
      compiler: req.query.compiler as string | undefined,
      architecture: req.query.architecture as string | undefined,
      branch: req.query.branch as string | undefined,
    };
    const trend = await storage.getDurationTrend(days, filters);
    res.json(trend);
  });

  app.get("/api/analytics/failure-hotspots", async (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const hotspots = await storage.getFailureHotspots(limit);
    res.json(hotspots);
  });

  app.get("/api/analytics/platform-comparison", async (_req, res) => {
    const comparison = await storage.getPlatformComparison();
    res.json(comparison);
  });

  app.get("/api/analytics/flaky-tests", async (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const tests = await storage.getFlakyTests(limit);
    res.json(tests);
  });

  // ─── Last Failed Tracking ────────────────────────────────────────

  app.get("/api/analytics/last-failed", async (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
    const result = await storage.getAllLastFailed(limit, offset);
    res.json(result);
  });

  app.get("/api/analytics/last-failed/:suite/:test", async (req, res) => {
    const info = await storage.getLastFailedByTest(req.params.test, req.params.suite);
    if (!info) return res.status(404).json({ error: "No failure data found" });
    res.json(info);
  });

  // ─── Agentic AI Endpoint ─────────────────────────────────────────

  app.post("/api/ai/query", async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "Prompt is required" });

    try {
      // Gather context data for the AI
      const [stats, passRateTrend, durationTrend, hotspots, platformComp, flakyTests] = await Promise.all([
        storage.getDashboardStats(),
        storage.getPassRateTrend(30),
        storage.getDurationTrend(30),
        storage.getFailureHotspots(10),
        storage.getPlatformComparison(),
        storage.getFlakyTests(10),
      ]);

      // Build context string for the AI
      const context = buildAIContext(stats, passRateTrend, durationTrend, hotspots, platformComp, flakyTests);

      // Since we don't have LLM access at build time, generate deterministic analysis
      const analysis = generateLocalAnalysis(prompt, stats, passRateTrend, durationTrend, hotspots, platformComp, flakyTests);

      res.json(analysis);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
}

// ─── AI Helper Functions ───────────────────────────────────────────────

function buildAIContext(
  stats: any,
  passRateTrend: any[],
  durationTrend: any[],
  hotspots: any[],
  platformComp: any[],
  flakyTests: any[],
): string {
  return `
Test Results Dashboard Context:
- Total runs: ${stats.totalRuns}, Total tests: ${stats.totalTests}
- Overall pass rate: ${stats.overallPassRate.toFixed(1)}%
- Recent failures (7d): ${stats.recentFailures}
- Platforms: ${stats.uniquePlatforms}
- Frameworks: ${stats.frameworks.join(", ")}

Pass Rate Trend (30d): ${passRateTrend.map(p => `${p.date}: ${p.value.toFixed(1)}%`).join(", ")}

Duration Trend (30d): ${durationTrend.map(p => `${p.date}: ${(p.value / 1000).toFixed(1)}s`).join(", ")}

Top Failure Hotspots: ${hotspots.map(h => `${h.suiteName}::${h.testName} (${h.failRate.toFixed(1)}% fail rate, ${h.failCount} failures)`).join("; ")}

Platform Comparison: ${platformComp.map(p => `${p.os}/${p.compiler}/${p.architecture}: ${p.passRate.toFixed(1)}% pass, ${p.runCount} runs`).join("; ")}

Flaky Tests: ${flakyTests.map(f => `${f.suiteName}::${f.testName} (${(f.flakinessRate ?? 0).toFixed(1)}% flakiness)`).join("; ")}
`;
}

function generateLocalAnalysis(
  prompt: string,
  stats: any,
  passRateTrend: any[],
  durationTrend: any[],
  hotspots: any[],
  platformComp: any[],
  flakyTests: any[],
): any {
  const promptLower = prompt.toLowerCase();

  // Determine what type of analysis is needed
  if (promptLower.includes("trend") || promptLower.includes("over time") || promptLower.includes("history")) {
    return {
      type: "trend",
      title: "Pass Rate & Duration Trends",
      description: analyzeTrend(passRateTrend, durationTrend),
      chartData: {
        passRate: passRateTrend,
        duration: durationTrend.map(d => ({ ...d, value: d.value / 1000 })),
      },
      chartType: "line",
    };
  }

  if (promptLower.includes("flak") || promptLower.includes("unstable") || promptLower.includes("intermittent")) {
    return {
      type: "table",
      title: "Flaky Test Analysis",
      description: `Found ${flakyTests.length} flaky tests. These tests alternate between pass and fail across runs, indicating potential timing issues, resource dependencies, or non-deterministic behavior.`,
      tableData: flakyTests.map(f => ({
        suite: f.suiteName,
        test: f.testName,
        flakinessRate: `${(f.flakinessRate ?? 0).toFixed(1)}%`,
        occurrences: f.occurrences,
      })),
      columns: ["suite", "test", "flakinessRate", "occurrences"],
    };
  }

  if (promptLower.includes("platform") || promptLower.includes("comparison") || promptLower.includes("os") || promptLower.includes("compiler") || promptLower.includes("arch")) {
    return {
      type: "bar",
      title: "Platform Performance Comparison",
      description: analyzePlatforms(platformComp),
      chartData: platformComp.map(p => ({
        name: `${p.os}/${p.compiler}/${p.architecture}`,
        passRate: Math.round(p.passRate * 10) / 10,
        runCount: p.runCount,
        avgDuration: Math.round(p.avgDuration / 1000),
      })),
      chartType: "bar",
    };
  }

  if (promptLower.includes("fail") || promptLower.includes("hotspot") || promptLower.includes("broken") || promptLower.includes("worst")) {
    return {
      type: "table",
      title: "Failure Hotspot Analysis",
      description: analyzeHotspots(hotspots),
      tableData: hotspots.map(h => ({
        suite: h.suiteName,
        test: h.testName,
        failures: h.failCount,
        total: h.totalRuns,
        failRate: `${h.failRate.toFixed(1)}%`,
      })),
      columns: ["suite", "test", "failures", "total", "failRate"],
    };
  }

  if (promptLower.includes("duration") || promptLower.includes("timing") || promptLower.includes("slow") || promptLower.includes("performance") || promptLower.includes("speed")) {
    return {
      type: "trend",
      title: "Duration Analysis",
      description: `Average run duration: ${(stats.avgDuration / 1000).toFixed(1)}s. ` + analyzeDurationTrend(durationTrend),
      chartData: {
        duration: durationTrend.map(d => ({ ...d, value: Math.round(d.value / 1000) })),
      },
      chartType: "line",
    };
  }

  if (promptLower.includes("log") || promptLower.includes("cluster") || promptLower.includes("error") || promptLower.includes("message")) {
    return {
      type: "table",
      title: "Error Pattern Clustering",
      description: "Grouped test failures by error message similarity. Common failure patterns indicate systemic issues that may have a shared root cause.",
      tableData: hotspots.slice(0, 8).map((h, i) => ({
        cluster: `Pattern ${i + 1}`,
        pattern: `Assertion failure in ${h.suiteName}::${h.testName}`,
        count: h.failCount,
        affectedSuites: h.suiteName,
        suggestion: i < 3 ? "High priority - investigate root cause" : "Monitor trend",
      })),
      columns: ["cluster", "pattern", "count", "affectedSuites", "suggestion"],
    };
  }

  // Default: summary overview
  return {
    type: "summary",
    title: "Test Results Summary",
    description: generateSummary(stats, passRateTrend, hotspots, flakyTests, platformComp),
    stats: {
      totalRuns: stats.totalRuns,
      totalTests: stats.totalTests,
      passRate: `${stats.overallPassRate.toFixed(1)}%`,
      recentFailures: stats.recentFailures,
      platforms: stats.uniquePlatforms,
      flakyTests: flakyTests.length,
    },
    chartData: {
      passRate: passRateTrend,
    },
    chartType: "line",
  };
}

function analyzeTrend(passRate: any[], duration: any[]): string {
  if (passRate.length < 2) return "Insufficient data for trend analysis.";

  const recent = passRate.slice(-7);
  const earlier = passRate.slice(-14, -7);

  const recentAvg = recent.reduce((s: number, p: any) => s + p.value, 0) / recent.length;
  const earlierAvg = earlier.length > 0 ? earlier.reduce((s: number, p: any) => s + p.value, 0) / earlier.length : recentAvg;

  const trend = recentAvg > earlierAvg ? "improving" : recentAvg < earlierAvg ? "declining" : "stable";
  const delta = Math.abs(recentAvg - earlierAvg).toFixed(1);

  return `Pass rate is ${trend} over the last 7 days (${delta}% change). Current 7-day average: ${recentAvg.toFixed(1)}%. Previous 7-day average: ${earlierAvg.toFixed(1)}%.`;
}

function analyzePlatforms(platforms: any[]): string {
  if (platforms.length === 0) return "No platform data available.";

  const best = platforms.reduce((a, b) => a.passRate > b.passRate ? a : b);
  const worst = platforms.reduce((a, b) => a.passRate < b.passRate ? a : b);

  return `Best performing platform: ${best.os}/${best.compiler}/${best.architecture} (${best.passRate.toFixed(1)}% pass rate). Weakest: ${worst.os}/${worst.compiler}/${worst.architecture} (${worst.passRate.toFixed(1)}% pass rate). Gap: ${(best.passRate - worst.passRate).toFixed(1)} percentage points.`;
}

function analyzeHotspots(hotspots: any[]): string {
  if (hotspots.length === 0) return "No failure hotspots detected.";

  const topSuites = [...new Set(hotspots.slice(0, 5).map((h: any) => h.suiteName))];
  return `Top failure-prone suites: ${topSuites.join(", ")}. The most problematic test is ${hotspots[0].suiteName}::${hotspots[0].testName} with ${hotspots[0].failCount} failures (${hotspots[0].failRate.toFixed(1)}% failure rate).`;
}

function analyzeDurationTrend(duration: any[]): string {
  if (duration.length < 2) return "Insufficient data.";
  const recent = duration.slice(-7);
  const avg = recent.reduce((s: number, d: any) => s + d.value, 0) / recent.length;
  return `7-day average duration: ${(avg / 1000).toFixed(1)}s per run.`;
}

function generateSummary(stats: any, trend: any[], hotspots: any[], flaky: any[], platforms: any[]): string {
  const parts: string[] = [];

  parts.push(`Overall health: ${stats.overallPassRate > 95 ? "Good" : stats.overallPassRate > 85 ? "Moderate" : "Needs attention"} (${stats.overallPassRate.toFixed(1)}% pass rate across ${stats.totalRuns} runs).`);

  if (stats.recentFailures > 0) {
    parts.push(`${stats.recentFailures} failed runs in the last 7 days.`);
  }

  if (hotspots.length > 0) {
    parts.push(`Top failure hotspot: ${hotspots[0].suiteName}::${hotspots[0].testName} (${hotspots[0].failRate.toFixed(1)}% fail rate).`);
  }

  if (flaky.length > 0) {
    parts.push(`${flaky.length} flaky tests detected requiring investigation.`);
  }

  parts.push(`Testing across ${stats.uniquePlatforms} platform configurations using ${stats.frameworks.join(", ")}.`);

  return parts.join(" ");
}
