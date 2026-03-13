import type {
  Platform, InsertPlatform,
  TestRun, InsertTestRun,
  TestResult, InsertTestResult,
  FlakyTest, InsertFlakyTest,
} from "@shared/schema";

export interface IStorage {
  // Platforms
  createPlatform(platform: InsertPlatform): Promise<Platform>;
  getPlatform(id: number): Promise<Platform | undefined>;
  findPlatform(os: string, compiler: string, host: string, architecture: string): Promise<Platform | undefined>;
  getAllPlatforms(): Promise<Platform[]>;
  getDistinctValues(field: "os" | "compiler" | "host" | "architecture"): Promise<string[]>;

  // Test Runs
  createTestRun(run: InsertTestRun): Promise<TestRun>;
  getTestRun(id: number): Promise<TestRun | undefined>;
  getTestRuns(filters: TestRunFilters): Promise<{ runs: TestRun[]; total: number }>;
  updateTestRun(id: number, updates: Partial<TestRun>): Promise<TestRun | undefined>;
  deleteTestRun(id: number): Promise<void>;
  getRunsByCommit(commitHash: string): Promise<TestRun[]>;

  // Test Results
  createTestResult(result: InsertTestResult): Promise<TestResult>;
  createTestResults(results: InsertTestResult[]): Promise<TestResult[]>;
  getTestResults(runId: number, filters?: ResultFilters): Promise<{ results: TestResult[]; total: number }>;
  getTestResult(id: number): Promise<TestResult | undefined>;

  // Analytics
  getDashboardStats(): Promise<DashboardStats>;
  getPassRateTrend(days: number, filters?: TrendFilters): Promise<TrendPoint[]>;
  getDurationTrend(days: number, filters?: TrendFilters): Promise<TrendPoint[]>;
  getFailureHotspots(limit: number): Promise<FailureHotspot[]>;
  getPlatformComparison(): Promise<PlatformComparison[]>;
  getLastFailedByTest(testName: string, suiteName: string): Promise<LastFailedInfo | undefined>;
  getAllLastFailed(limit: number, offset: number): Promise<{ tests: LastFailedEntry[]; total: number }>;

  // Flaky tests
  getFlakyTests(limit: number): Promise<FlakyTest[]>;

  // Bulk import
  importRun(data: BulkImportData): Promise<TestRun>;
}

export interface TestRunFilters {
  limit?: number;
  offset?: number;
  framework?: string;
  status?: string;
  os?: string;
  compiler?: string;
  host?: string;
  architecture?: string;
  branch?: string;
  commitHash?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface ResultFilters {
  status?: string;
  suiteName?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface TrendFilters {
  framework?: string;
  os?: string;
  compiler?: string;
  architecture?: string;
  branch?: string;
}

export interface DashboardStats {
  totalRuns: number;
  totalTests: number;
  overallPassRate: number;
  avgDuration: number;
  recentFailures: number;
  runsToday: number;
  uniquePlatforms: number;
  frameworks: string[];
}

export interface TrendPoint {
  date: string;
  value: number;
  count?: number;
}

export interface FailureHotspot {
  suiteName: string;
  testName: string;
  failCount: number;
  totalRuns: number;
  failRate: number;
  lastFailed: string;
}

export interface PlatformComparison {
  platformId: number;
  os: string;
  compiler: string;
  architecture: string;
  runCount: number;
  passRate: number;
  avgDuration: number;
}

export interface LastFailedInfo {
  testName: string;
  suiteName: string;
  lastFailedCommit: string;
  lastFailedBranch: string | null;
  lastFailedAt: string;
  lastPassedCommit: string | null;
  lastPassedAt: string | null;
  failStreak: number;
}

export interface LastFailedEntry extends LastFailedInfo {
  platformOs?: string;
  platformCompiler?: string;
  platformArch?: string;
}

export interface BulkImportData {
  run: Omit<InsertTestRun, "platformId"> & {
    os: string;
    compiler: string;
    host: string;
    architecture: string;
  };
  results: Omit<InsertTestResult, "runId">[];
}

// ─── In-Memory Storage Implementation ──────────────────────────────────

export class MemStorage implements IStorage {
  private platforms: Map<number, Platform> = new Map();
  private testRuns: Map<number, TestRun> = new Map();
  private testResults: Map<number, TestResult> = new Map();
  private flakyTestsMap: Map<number, FlakyTest> = new Map();
  private nextIds = { platform: 1, run: 1, result: 1, flaky: 1 };

  constructor() {
    this.seedData();
  }

  // ─── Platform CRUD ─────────────────────────────────────────────────

  async createPlatform(p: InsertPlatform): Promise<Platform> {
    const existing = await this.findPlatform(p.os, p.compiler, p.host, p.architecture);
    if (existing) return existing;
    const platform: Platform = { id: this.nextIds.platform++, ...p };
    this.platforms.set(platform.id, platform);
    return platform;
  }

  async getPlatform(id: number): Promise<Platform | undefined> {
    return this.platforms.get(id);
  }

  async findPlatform(os: string, compiler: string, host: string, architecture: string): Promise<Platform | undefined> {
    return [...this.platforms.values()].find(
      (p) => p.os === os && p.compiler === compiler && p.host === host && p.architecture === architecture
    );
  }

  async getAllPlatforms(): Promise<Platform[]> {
    return [...this.platforms.values()];
  }

  async getDistinctValues(field: "os" | "compiler" | "host" | "architecture"): Promise<string[]> {
    const vals = new Set<string>();
    for (const p of this.platforms.values()) vals.add(p[field]);
    return [...vals].sort();
  }

  // ─── Test Run CRUD ─────────────────────────────────────────────────

  async createTestRun(run: InsertTestRun): Promise<TestRun> {
    const tr: TestRun = {
      id: this.nextIds.run++,
      name: run.name,
      framework: run.framework,
      platformId: run.platformId,
      commitHash: run.commitHash,
      branch: run.branch ?? null,
      gitTag: run.gitTag ?? null,
      buildRevision: run.buildRevision ?? null,
      commitMessage: run.commitMessage ?? null,
      commitAuthor: run.commitAuthor ?? null,
      commitTimestamp: run.commitTimestamp ?? null,
      startedAt: run.startedAt ?? new Date(),
      finishedAt: run.finishedAt ?? null,
      durationMs: run.durationMs ?? null,
      totalTests: run.totalTests ?? 0,
      passed: run.passed ?? 0,
      failed: run.failed ?? 0,
      skipped: run.skipped ?? 0,
      errors: run.errors ?? 0,
      status: run.status ?? "running",
      metadata: run.metadata ?? null,
    };
    this.testRuns.set(tr.id, tr);
    return tr;
  }

  async getTestRun(id: number): Promise<TestRun | undefined> {
    return this.testRuns.get(id);
  }

  async getTestRuns(filters: TestRunFilters): Promise<{ runs: TestRun[]; total: number }> {
    let runs = [...this.testRuns.values()];

    // Apply filters
    if (filters.framework) runs = runs.filter((r) => r.framework === filters.framework);
    if (filters.status) runs = runs.filter((r) => r.status === filters.status);
    if (filters.branch) runs = runs.filter((r) => r.branch === filters.branch);
    if (filters.commitHash) runs = runs.filter((r) => r.commitHash.startsWith(filters.commitHash!));

    if (filters.os || filters.compiler || filters.host || filters.architecture) {
      runs = runs.filter((r) => {
        const p = this.platforms.get(r.platformId);
        if (!p) return false;
        if (filters.os && p.os !== filters.os) return false;
        if (filters.compiler && p.compiler !== filters.compiler) return false;
        if (filters.host && p.host !== filters.host) return false;
        if (filters.architecture && p.architecture !== filters.architecture) return false;
        return true;
      });
    }

    if (filters.search) {
      const q = filters.search.toLowerCase();
      runs = runs.filter((r) =>
        r.name.toLowerCase().includes(q) ||
        r.commitHash.toLowerCase().includes(q) ||
        (r.commitMessage ?? "").toLowerCase().includes(q) ||
        (r.branch ?? "").toLowerCase().includes(q)
      );
    }

    if (filters.startDate) {
      const d = new Date(filters.startDate);
      runs = runs.filter((r) => r.startedAt >= d);
    }
    if (filters.endDate) {
      const d = new Date(filters.endDate);
      runs = runs.filter((r) => r.startedAt <= d);
    }

    const total = runs.length;

    // Sort
    const sortBy = filters.sortBy || "startedAt";
    const sortOrder = filters.sortOrder || "desc";
    runs.sort((a, b) => {
      const aVal = (a as any)[sortBy];
      const bVal = (b as any)[sortBy];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortOrder === "desc" ? -cmp : cmp;
    });

    // Paginate
    const offset = filters.offset || 0;
    const limit = filters.limit || 20;
    runs = runs.slice(offset, offset + limit);

    return { runs, total };
  }

  async updateTestRun(id: number, updates: Partial<TestRun>): Promise<TestRun | undefined> {
    const run = this.testRuns.get(id);
    if (!run) return undefined;
    const updated = { ...run, ...updates };
    this.testRuns.set(id, updated);
    return updated;
  }

  async deleteTestRun(id: number): Promise<void> {
    this.testRuns.delete(id);
    // Also delete results for this run
    for (const [key, result] of this.testResults) {
      if (result.runId === id) this.testResults.delete(key);
    }
  }

  async getRunsByCommit(commitHash: string): Promise<TestRun[]> {
    return [...this.testRuns.values()].filter((r) => r.commitHash === commitHash);
  }

  // ─── Test Result CRUD ──────────────────────────────────────────────

  async createTestResult(result: InsertTestResult): Promise<TestResult> {
    const tr: TestResult = {
      id: this.nextIds.result++,
      runId: result.runId,
      suiteName: result.suiteName,
      testName: result.testName,
      className: result.className ?? null,
      status: result.status,
      durationMs: result.durationMs ?? null,
      message: result.message ?? null,
      stackTrace: result.stackTrace ?? null,
      stdout: result.stdout ?? null,
      stderr: result.stderr ?? null,
      tags: result.tags ?? null,
      metadata: result.metadata ?? null,
    };
    this.testResults.set(tr.id, tr);
    return tr;
  }

  async createTestResults(results: InsertTestResult[]): Promise<TestResult[]> {
    return Promise.all(results.map((r) => this.createTestResult(r)));
  }

  async getTestResults(runId: number, filters?: ResultFilters): Promise<{ results: TestResult[]; total: number }> {
    let results = [...this.testResults.values()].filter((r) => r.runId === runId);

    if (filters?.status) results = results.filter((r) => r.status === filters.status);
    if (filters?.suiteName) results = results.filter((r) => r.suiteName === filters.suiteName);
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      results = results.filter(
        (r) => r.testName.toLowerCase().includes(q) || r.suiteName.toLowerCase().includes(q)
      );
    }

    const total = results.length;
    const offset = filters?.offset || 0;
    const limit = filters?.limit || 50;
    results = results.slice(offset, offset + limit);

    return { results, total };
  }

  async getTestResult(id: number): Promise<TestResult | undefined> {
    return this.testResults.get(id);
  }

  // ─── Analytics ─────────────────────────────────────────────────────

  async getDashboardStats(): Promise<DashboardStats> {
    const runs = [...this.testRuns.values()];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalTests = runs.reduce((s, r) => s + (r.totalTests ?? 0), 0);
    const totalPassed = runs.reduce((s, r) => s + (r.passed ?? 0), 0);
    const overallPassRate = totalTests > 0 ? (totalPassed / totalTests) * 100 : 0;
    const avgDuration = runs.length > 0
      ? runs.reduce((s, r) => s + (r.durationMs ?? 0), 0) / runs.length
      : 0;

    const recentRuns = runs.filter((r) => {
      const d = new Date(r.startedAt);
      return d >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    });
    const recentFailures = recentRuns.filter((r) => r.status === "failed").length;
    const runsToday = runs.filter((r) => new Date(r.startedAt) >= today).length;

    const frameworks = [...new Set(runs.map((r) => r.framework))];

    return {
      totalRuns: runs.length,
      totalTests,
      overallPassRate,
      avgDuration,
      recentFailures,
      runsToday,
      uniquePlatforms: this.platforms.size,
      frameworks,
    };
  }

  async getPassRateTrend(days: number, filters?: TrendFilters): Promise<TrendPoint[]> {
    const runs = this.filterRunsForTrend(days, filters);
    const groups = this.groupByDate(runs);

    return Object.entries(groups).map(([date, dateRuns]) => {
      const total = dateRuns.reduce((s, r) => s + (r.totalTests ?? 0), 0);
      const passed = dateRuns.reduce((s, r) => s + (r.passed ?? 0), 0);
      return {
        date,
        value: total > 0 ? (passed / total) * 100 : 0,
        count: dateRuns.length,
      };
    }).sort((a, b) => a.date.localeCompare(b.date));
  }

  async getDurationTrend(days: number, filters?: TrendFilters): Promise<TrendPoint[]> {
    const runs = this.filterRunsForTrend(days, filters);
    const groups = this.groupByDate(runs);

    return Object.entries(groups).map(([date, dateRuns]) => {
      const avg = dateRuns.reduce((s, r) => s + (r.durationMs ?? 0), 0) / dateRuns.length;
      return { date, value: avg, count: dateRuns.length };
    }).sort((a, b) => a.date.localeCompare(b.date));
  }

  async getFailureHotspots(limit: number): Promise<FailureHotspot[]> {
    const resultsByTest = new Map<string, { fail: number; total: number; lastFailed: Date }>();

    for (const result of this.testResults.values()) {
      const key = `${result.suiteName}::${result.testName}`;
      const existing = resultsByTest.get(key) || { fail: 0, total: 0, lastFailed: new Date(0) };
      existing.total++;
      if (result.status === "failed" || result.status === "error") {
        existing.fail++;
        const run = this.testRuns.get(result.runId);
        if (run && new Date(run.startedAt) > existing.lastFailed) {
          existing.lastFailed = new Date(run.startedAt);
        }
      }
      resultsByTest.set(key, existing);
    }

    return [...resultsByTest.entries()]
      .filter(([, v]) => v.fail > 0)
      .map(([key, v]) => {
        const [suiteName, testName] = key.split("::");
        return {
          suiteName,
          testName,
          failCount: v.fail,
          totalRuns: v.total,
          failRate: (v.fail / v.total) * 100,
          lastFailed: v.lastFailed.toISOString(),
        };
      })
      .sort((a, b) => b.failCount - a.failCount)
      .slice(0, limit);
  }

  async getPlatformComparison(): Promise<PlatformComparison[]> {
    const platformRuns = new Map<number, TestRun[]>();
    for (const run of this.testRuns.values()) {
      const arr = platformRuns.get(run.platformId) || [];
      arr.push(run);
      platformRuns.set(run.platformId, arr);
    }

    const result: PlatformComparison[] = [];
    for (const [platformId, runs] of platformRuns) {
      const p = this.platforms.get(platformId);
      if (!p) continue;

      const totalTests = runs.reduce((s, r) => s + (r.totalTests ?? 0), 0);
      const passed = runs.reduce((s, r) => s + (r.passed ?? 0), 0);
      const avgDur = runs.reduce((s, r) => s + (r.durationMs ?? 0), 0) / runs.length;

      result.push({
        platformId,
        os: p.os,
        compiler: p.compiler,
        architecture: p.architecture,
        runCount: runs.length,
        passRate: totalTests > 0 ? (passed / totalTests) * 100 : 0,
        avgDuration: avgDur,
      });
    }

    return result.sort((a, b) => b.runCount - a.runCount);
  }

  async getLastFailedByTest(testName: string, suiteName: string): Promise<LastFailedInfo | undefined> {
    const results = [...this.testResults.values()].filter(
      (r) => r.testName === testName && r.suiteName === suiteName
    );
    if (results.length === 0) return undefined;

    // Get runs for these results, sorted by commit timestamp / startedAt
    const runsWithStatus = results.map((r) => {
      const run = this.testRuns.get(r.runId);
      return { result: r, run };
    }).filter((x) => x.run != null)
      .sort((a, b) => new Date(b.run!.startedAt).getTime() - new Date(a.run!.startedAt).getTime());

    const lastFailed = runsWithStatus.find((x) => x.result.status === "failed" || x.result.status === "error");
    const lastPassed = runsWithStatus.find((x) => x.result.status === "passed");

    if (!lastFailed) return undefined;

    // Count consecutive failures from the most recent
    let failStreak = 0;
    for (const x of runsWithStatus) {
      if (x.result.status === "failed" || x.result.status === "error") failStreak++;
      else break;
    }

    return {
      testName,
      suiteName,
      lastFailedCommit: lastFailed.run!.commitHash,
      lastFailedBranch: lastFailed.run!.branch,
      lastFailedAt: new Date(lastFailed.run!.startedAt).toISOString(),
      lastPassedCommit: lastPassed?.run?.commitHash ?? null,
      lastPassedAt: lastPassed ? new Date(lastPassed.run!.startedAt).toISOString() : null,
      failStreak,
    };
  }

  async getAllLastFailed(limit: number, offset: number): Promise<{ tests: LastFailedEntry[]; total: number }> {
    // Find all tests that have at least one failure
    const testKeys = new Set<string>();
    for (const r of this.testResults.values()) {
      if (r.status === "failed" || r.status === "error") {
        testKeys.add(`${r.suiteName}::${r.testName}`);
      }
    }

    const allTests: LastFailedEntry[] = [];
    for (const key of testKeys) {
      const [suiteName, testName] = key.split("::");
      const info = await this.getLastFailedByTest(testName, suiteName);
      if (info) {
        // Find platform info from last failed run
        const lastFailedRun = [...this.testRuns.values()].find((r) => r.commitHash === info.lastFailedCommit);
        const platform = lastFailedRun ? this.platforms.get(lastFailedRun.platformId) : undefined;
        allTests.push({
          ...info,
          platformOs: platform?.os,
          platformCompiler: platform?.compiler,
          platformArch: platform?.architecture,
        });
      }
    }

    // Sort by lastFailedAt descending
    allTests.sort((a, b) => new Date(b.lastFailedAt).getTime() - new Date(a.lastFailedAt).getTime());

    return {
      tests: allTests.slice(offset, offset + limit),
      total: allTests.length,
    };
  }

  async getFlakyTests(limit: number): Promise<FlakyTest[]> {
    return [...this.flakyTestsMap.values()]
      .sort((a, b) => (b.flakinessRate ?? 0) - (a.flakinessRate ?? 0))
      .slice(0, limit);
  }

  // ─── Bulk Import ───────────────────────────────────────────────────

  async importRun(data: BulkImportData): Promise<TestRun> {
    // Find or create platform
    const platform = await this.createPlatform({
      os: data.run.os,
      compiler: data.run.compiler,
      host: data.run.host,
      architecture: data.run.architecture,
    });

    // Create the run
    const { os, compiler, host, architecture, ...runData } = data.run;
    const run = await this.createTestRun({
      ...runData,
      platformId: platform.id,
    });

    // Create results
    let passed = 0, failed = 0, skipped = 0, errors = 0;
    for (const result of data.results) {
      await this.createTestResult({ ...result, runId: run.id });
      if (result.status === "passed") passed++;
      else if (result.status === "failed") failed++;
      else if (result.status === "skipped") skipped++;
      else if (result.status === "error") errors++;
    }

    // Update run with aggregated counts
    await this.updateTestRun(run.id, {
      totalTests: data.results.length,
      passed,
      failed,
      skipped,
      errors,
      status: failed > 0 || errors > 0 ? "failed" : "passed",
    });

    return (await this.getTestRun(run.id))!;
  }

  // ─── Private Helpers ───────────────────────────────────────────────

  private filterRunsForTrend(days: number, filters?: TrendFilters): TestRun[] {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    let runs = [...this.testRuns.values()].filter((r) => new Date(r.startedAt) >= cutoff);

    if (filters?.framework) runs = runs.filter((r) => r.framework === filters.framework);
    if (filters?.branch) runs = runs.filter((r) => r.branch === filters.branch);

    if (filters?.os || filters?.compiler || filters?.architecture) {
      runs = runs.filter((r) => {
        const p = this.platforms.get(r.platformId);
        if (!p) return false;
        if (filters.os && p.os !== filters.os) return false;
        if (filters.compiler && p.compiler !== filters.compiler) return false;
        if (filters.architecture && p.architecture !== filters.architecture) return false;
        return true;
      });
    }

    return runs;
  }

  private groupByDate(runs: TestRun[]): Record<string, TestRun[]> {
    const groups: Record<string, TestRun[]> = {};
    for (const run of runs) {
      const date = new Date(run.startedAt).toISOString().split("T")[0];
      if (!groups[date]) groups[date] = [];
      groups[date].push(run);
    }
    return groups;
  }

  // ─── Seed Data ─────────────────────────────────────────────────────

  private seedData() {
    const platformConfigs = [
      { os: "Linux", compiler: "gcc-12", host: "ci-runner-01", architecture: "x86_64" },
      { os: "Linux", compiler: "gcc-12", host: "ci-runner-02", architecture: "aarch64" },
      { os: "Linux", compiler: "clang-15", host: "ci-runner-01", architecture: "x86_64" },
      { os: "Windows", compiler: "msvc-2022", host: "win-runner-01", architecture: "x86_64" },
      { os: "macOS", compiler: "clang-15", host: "mac-runner-01", architecture: "aarch64" },
      { os: "Linux", compiler: "gcc-13", host: "ci-runner-03", architecture: "armv7" },
    ];

    const frameworks = ["gtest", "robot", "pytest", "junit"];
    const branches = ["main", "develop", "feature/auth", "release/v2.1", "hotfix/memory-leak"];
    const suites = [
      "MathOperations", "StringUtils", "NetworkLayer", "FileSystem",
      "AuthService", "DatabaseOps", "CacheManager", "ParserModule",
      "MemoryPool", "ThreadPool", "ConfigReader", "LoggingService",
      "HTTPClient", "Serializer", "Validator", "Scheduler",
    ];

    const testNames: Record<string, string[]> = {
      MathOperations: ["Addition", "Subtraction", "Multiplication", "Division", "ModuloOp", "OverflowCheck", "NegativeNumbers", "FloatingPoint"],
      StringUtils: ["Concatenation", "Substring", "Replace", "Trim", "Split", "ToUpper", "ToLower", "RegexMatch"],
      NetworkLayer: ["TCPConnect", "UDPSend", "DNSResolve", "SSLHandshake", "Timeout", "Retry", "ConnectionPool", "KeepAlive"],
      FileSystem: ["ReadFile", "WriteFile", "DeleteFile", "CreateDir", "ListDir", "FilePermissions", "SymlinkFollow", "LargeFile"],
      AuthService: ["LoginValid", "LoginInvalid", "TokenRefresh", "TokenExpiry", "PasswordHash", "MFAValidate", "SessionTimeout", "RoleCheck"],
      DatabaseOps: ["Insert", "Select", "Update", "Delete", "Transaction", "Deadlock", "IndexPerf", "BulkInsert"],
      CacheManager: ["Set", "Get", "Delete", "Expiry", "Eviction", "Concurrent", "LRUOrder", "MaxSize"],
      ParserModule: ["ParseJSON", "ParseXML", "ParseCSV", "ParseYAML", "InvalidInput", "LargePayload", "NestedStructure", "UnicodeHandling"],
      MemoryPool: ["Allocate", "Deallocate", "FragmentCheck", "PoolExpand", "ThreadSafe", "LeakDetect", "AlignmentCheck", "PoolReset"],
      ThreadPool: ["Submit", "Cancel", "WaitAll", "Resize", "Deadlock", "PriorityQueue", "WorkStealing", "GracefulShutdown"],
      ConfigReader: ["LoadFile", "EnvOverride", "DefaultValues", "TypeValidation", "HotReload", "NestedKeys", "ArrayValues", "SecretMasking"],
      LoggingService: ["LogInfo", "LogError", "LogWarn", "LogDebug", "Rotation", "Formatting", "AsyncWrite", "FilterLevel"],
      HTTPClient: ["GetRequest", "PostRequest", "PutRequest", "DeleteRequest", "Headers", "QueryParams", "Redirect", "Compression"],
      Serializer: ["Serialize", "Deserialize", "SchemaValidation", "VersionCompat", "CircularRef", "NullHandling", "DateFormat", "BinaryData"],
      Validator: ["EmailFormat", "URLFormat", "PhoneNumber", "CreditCard", "CustomRule", "Chaining", "ErrorMessages", "NullSafety"],
      Scheduler: ["ScheduleTask", "CancelTask", "RecurringTask", "CronParse", "Concurrency", "Retry", "Timeout", "DependencyChain"],
    };

    const commitMessages = [
      "fix: resolve memory leak in cache manager",
      "feat: add retry logic for network layer",
      "chore: update dependencies to latest versions",
      "test: add edge cases for parser module",
      "refactor: simplify auth service flow",
      "fix: handle null pointer in config reader",
      "feat: implement connection pooling",
      "perf: optimize database query performance",
      "fix: correct thread safety in memory pool",
      "feat: add SSL certificate validation",
      "chore: upgrade compiler toolchain",
      "fix: resolve race condition in scheduler",
      "test: improve coverage for validator module",
      "feat: implement hot reload for config",
      "fix: handle unicode edge cases in parser",
    ];

    const authors = ["jibin.joseph", "alice.chen", "bob.kumar", "carol.smith", "dave.patel"];

    // Generate 60 days of data
    const now = Date.now();
    let commitCounter = 0;

    for (let day = 59; day >= 0; day--) {
      const runsPerDay = day < 7 ? 4 + Math.floor(Math.random() * 3) : 2 + Math.floor(Math.random() * 3);

      for (let r = 0; r < runsPerDay; r++) {
        const platConfig = platformConfigs[Math.floor(Math.random() * platformConfigs.length)];
        const framework = frameworks[Math.floor(Math.random() * frameworks.length)];
        const branch = branches[Math.floor(Math.random() * branches.length)];

        // Create platform (deduplicated)
        const platformId = this.getOrCreatePlatformSync(platConfig);

        const commitHash = this.generateCommitHash(commitCounter++);
        const startTime = new Date(now - day * 24 * 60 * 60 * 1000 + r * 2 * 60 * 60 * 1000);
        const duration = 30000 + Math.floor(Math.random() * 270000); // 30s to 5m

        const runId = this.nextIds.run++;
        const selectedSuites = this.pickRandom(suites, 4 + Math.floor(Math.random() * 8));

        let totalPassed = 0, totalFailed = 0, totalSkipped = 0, totalErrors = 0;

        for (const suite of selectedSuites) {
          const tests = testNames[suite] || ["Test1", "Test2", "Test3"];
          for (const test of tests) {
            // Introduce realistic failure patterns
            let status: string;
            const rand = Math.random();

            // Some tests are chronically flaky
            const isFlaky = (suite === "NetworkLayer" && test === "Timeout") ||
              (suite === "ThreadPool" && test === "Deadlock") ||
              (suite === "CacheManager" && test === "Concurrent");

            // Some tests fail more on specific platforms
            const isPlatformSensitive = (suite === "MemoryPool" && platConfig.architecture === "armv7") ||
              (suite === "FileSystem" && platConfig.os === "Windows");

            if (isFlaky && rand < 0.3) status = "failed";
            else if (isPlatformSensitive && rand < 0.15) status = "failed";
            else if (rand < 0.02) status = "error";
            else if (rand < 0.05) status = "skipped";
            else if (rand < 0.08) status = "failed";
            else status = "passed";

            const testDuration = 10 + Math.random() * 2000;

            this.testResults.set(this.nextIds.result, {
              id: this.nextIds.result++,
              runId,
              suiteName: suite,
              testName: test,
              className: `${suite}Test`,
              status,
              durationMs: Math.round(testDuration * 100) / 100,
              message: status === "failed" ? `Assertion failed in ${test}: expected true, got false` : null,
              stackTrace: status === "failed" ? `at ${suite}.${test}(${suite}.cpp:${42 + Math.floor(Math.random() * 100)})` : null,
              stdout: null,
              stderr: status === "error" ? `SEGFAULT at 0x${Math.floor(Math.random() * 0xFFFFFF).toString(16)}` : null,
              tags: [framework, platConfig.os.toLowerCase()],
              metadata: null,
            });

            if (status === "passed") totalPassed++;
            else if (status === "failed") totalFailed++;
            else if (status === "skipped") totalSkipped++;
            else totalErrors++;
          }
        }

        const totalTests = totalPassed + totalFailed + totalSkipped + totalErrors;

        this.testRuns.set(runId, {
          id: runId,
          name: `${framework.toUpperCase()} ${platConfig.os} ${platConfig.architecture} ${platConfig.compiler}`,
          framework,
          platformId,
          commitHash,
          branch,
          gitTag: day % 7 === 0 ? `v2.1.${Math.floor((59 - day) / 7)}` : null,
          buildRevision: `build-${1000 + commitCounter}`,
          commitMessage: commitMessages[commitCounter % commitMessages.length],
          commitAuthor: authors[commitCounter % authors.length],
          commitTimestamp: new Date(startTime.getTime() - 300000),
          startedAt: startTime,
          finishedAt: new Date(startTime.getTime() + duration),
          durationMs: duration,
          totalTests,
          passed: totalPassed,
          failed: totalFailed,
          skipped: totalSkipped,
          errors: totalErrors,
          status: totalFailed > 0 || totalErrors > 0 ? "failed" : "passed",
          metadata: null,
        });
      }
    }

    // Compute flaky tests
    this.computeFlakyTests();
  }

  private getOrCreatePlatformSync(config: InsertPlatform): number {
    for (const [id, p] of this.platforms) {
      if (p.os === config.os && p.compiler === config.compiler && p.host === config.host && p.architecture === config.architecture) {
        return id;
      }
    }
    const id = this.nextIds.platform++;
    this.platforms.set(id, { id, ...config });
    return id;
  }

  private generateCommitHash(index: number): string {
    const chars = "0123456789abcdef";
    let hash = "";
    const seed = index * 7 + 42;
    for (let i = 0; i < 40; i++) {
      hash += chars[(seed * (i + 1) + i * 13) % 16];
    }
    return hash;
  }

  private pickRandom<T>(arr: T[], count: number): T[] {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, arr.length));
  }

  private computeFlakyTests() {
    // Group results by test identity
    const testHistory = new Map<string, string[]>();
    
    // Sort results by run startedAt
    const sortedResults = [...this.testResults.values()].sort((a, b) => {
      const runA = this.testRuns.get(a.runId);
      const runB = this.testRuns.get(b.runId);
      if (!runA || !runB) return 0;
      return new Date(runA.startedAt).getTime() - new Date(runB.startedAt).getTime();
    });

    for (const result of sortedResults) {
      const key = `${result.suiteName}::${result.testName}`;
      const history = testHistory.get(key) || [];
      history.push(result.status);
      testHistory.set(key, history);
    }

    // Detect flaky tests (those that flip between pass and fail)
    for (const [key, history] of testHistory) {
      let flips = 0;
      for (let i = 1; i < history.length; i++) {
        const prev = history[i - 1] === "passed" ? "pass" : "fail";
        const curr = history[i] === "passed" ? "pass" : "fail";
        if (prev !== curr && history[i] !== "skipped" && history[i - 1] !== "skipped") flips++;
      }

      if (flips >= 3) {
        const [suiteName, testName] = key.split("::");
        const id = this.nextIds.flaky++;
        this.flakyTestsMap.set(id, {
          id,
          suiteName,
          testName,
          flakinessRate: (flips / (history.length - 1)) * 100,
          lastSeen: new Date(),
          occurrences: flips,
        });
      }
    }
  }
}

export const storage = new MemStorage();
