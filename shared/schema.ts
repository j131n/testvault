import { pgTable, text, serial, integer, boolean, timestamp, real, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─── Platform Dimensions ───────────────────────────────────────────────
// Each unique combination of OS, compiler, host, architecture is a "platform"

export const platforms = pgTable("platforms", {
  id: serial("id").primaryKey(),
  os: text("os").notNull(),           // e.g. "Linux", "Windows", "macOS"
  compiler: text("compiler").notNull(), // e.g. "gcc-12", "clang-15", "msvc-2022"
  host: text("host").notNull(),         // e.g. "ci-runner-01", "local-dev"
  architecture: text("architecture").notNull(), // e.g. "x86_64", "aarch64", "armv7"
}, (table) => [
  uniqueIndex("platform_unique_idx").on(table.os, table.compiler, table.host, table.architecture),
]);

export const insertPlatformSchema = createInsertSchema(platforms).omit({ id: true });
export type InsertPlatform = z.infer<typeof insertPlatformSchema>;
export type Platform = typeof platforms.$inferSelect;

// ─── Test Runs ─────────────────────────────────────────────────────────
// A "run" is a single execution of a test suite on a specific platform

export const testRuns = pgTable("test_runs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),                   // descriptive name e.g. "Nightly ARM64 GCC-12"
  framework: text("framework").notNull(),          // "gtest", "robot", "pytest", "junit", "custom"
  platformId: integer("platform_id").notNull(),
  
  // Git identification
  commitHash: text("commit_hash").notNull(),
  branch: text("branch"),
  gitTag: text("git_tag"),
  buildRevision: text("build_revision"),
  commitMessage: text("commit_message"),
  commitAuthor: text("commit_author"),
  commitTimestamp: timestamp("commit_timestamp"),
  
  // Run metadata
  startedAt: timestamp("started_at").notNull().defaultNow(),
  finishedAt: timestamp("finished_at"),
  durationMs: integer("duration_ms"),
  
  // Aggregated counts (denormalized for fast queries)
  totalTests: integer("total_tests").default(0),
  passed: integer("passed").default(0),
  failed: integer("failed").default(0),
  skipped: integer("skipped").default(0),
  errors: integer("errors").default(0),
  
  status: text("status").notNull().default("running"), // "running", "passed", "failed", "error"
  metadata: jsonb("metadata"),                          // arbitrary JSON for framework-specific data
}, (table) => [
  index("run_commit_idx").on(table.commitHash),
  index("run_platform_idx").on(table.platformId),
  index("run_started_idx").on(table.startedAt),
  index("run_status_idx").on(table.status),
  index("run_framework_idx").on(table.framework),
  index("run_branch_idx").on(table.branch),
]);

export const insertTestRunSchema = createInsertSchema(testRuns).omit({ id: true });
export type InsertTestRun = z.infer<typeof insertTestRunSchema>;
export type TestRun = typeof testRuns.$inferSelect;

// ─── Test Results ──────────────────────────────────────────────────────
// Individual test case results within a run

export const testResults = pgTable("test_results", {
  id: serial("id").primaryKey(),
  runId: integer("run_id").notNull(),
  
  // Test identity
  suiteName: text("suite_name").notNull(),        // e.g. "MathTest", "LoginSuite"
  testName: text("test_name").notNull(),           // e.g. "AdditionTest", "ValidCredentials"
  className: text("class_name"),                    // optional: class/module grouping
  
  // Result
  status: text("status").notNull(),                // "passed", "failed", "skipped", "error"
  durationMs: real("duration_ms"),                  // execution time in milliseconds
  message: text("message"),                         // failure/error message
  stackTrace: text("stack_trace"),                  // full stack trace
  stdout: text("stdout"),                           // captured stdout
  stderr: text("stderr"),                           // captured stderr
  
  // Tags for flexible grouping
  tags: text("tags").array(),
  
  metadata: jsonb("metadata"),                      // arbitrary JSON
}, (table) => [
  index("result_run_idx").on(table.runId),
  index("result_suite_idx").on(table.suiteName),
  index("result_status_idx").on(table.status),
  index("result_test_name_idx").on(table.testName),
]);

export const insertTestResultSchema = createInsertSchema(testResults).omit({ id: true });
export type InsertTestResult = z.infer<typeof insertTestResultSchema>;
export type TestResult = typeof testResults.$inferSelect;

// ─── Flaky Test Tracking ───────────────────────────────────────────────
// Track tests that alternate between pass and fail

export const flakyTests = pgTable("flaky_tests", {
  id: serial("id").primaryKey(),
  suiteName: text("suite_name").notNull(),
  testName: text("test_name").notNull(),
  flakinessRate: real("flakiness_rate").default(0),  // percentage of runs that flip
  lastSeen: timestamp("last_seen").defaultNow(),
  occurrences: integer("occurrences").default(1),
}, (table) => [
  uniqueIndex("flaky_test_unique_idx").on(table.suiteName, table.testName),
]);

export const insertFlakyTestSchema = createInsertSchema(flakyTests).omit({ id: true });
export type InsertFlakyTest = z.infer<typeof insertFlakyTestSchema>;
export type FlakyTest = typeof flakyTests.$inferSelect;
