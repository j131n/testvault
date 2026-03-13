import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Search,
  GitCommit,
  GitBranch,
  Tag,
  Clock,
  Server,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  SkipForward,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface TestResult {
  id: number;
  runId: number;
  suiteName: string;
  testName: string;
  className: string | null;
  status: string;
  durationMs: number | null;
  message: string | null;
  stackTrace: string | null;
  stdout: string | null;
  stderr: string | null;
}

const ALL_VALUE = "__all__";

export default function RunDetail() {
  const params = useParams<{ id: string }>();
  const runId = parseInt(params.id || "0");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(ALL_VALUE);
  const [suiteFilter, setSuiteFilter] = useState(ALL_VALUE);
  const [expandedTest, setExpandedTest] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const { data: run, isLoading: runLoading } = useQuery<any>({
    queryKey: ["/api/runs", runId],
  });

  const buildResultsQuery = () => {
    const params = new URLSearchParams();
    params.set("limit", String(pageSize));
    params.set("offset", String(page * pageSize));
    if (search) params.set("search", search);
    if (statusFilter !== ALL_VALUE) params.set("status", statusFilter);
    if (suiteFilter !== ALL_VALUE) params.set("suiteName", suiteFilter);
    return params.toString();
  };

  const { data: resultsData, isLoading: resultsLoading } = useQuery<{ results: TestResult[]; total: number }>({
    queryKey: ["/api/runs", runId, "results", { search, statusFilter, suiteFilter, page }],
    queryFn: async () => {
      const res = await fetch(`/api/runs/${runId}/results?${buildResultsQuery()}`);
      if (!res.ok) throw new Error("Failed to fetch results");
      return res.json();
    },
    enabled: runId > 0,
  });

  if (runLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!run) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Run not found</p>
        <Link href="/runs">
          <Button variant="ghost" className="mt-4">Back to Runs</Button>
        </Link>
      </div>
    );
  }

  const passRate = run.totalTests > 0 ? (run.passed / run.totalTests) * 100 : 0;
  const pieData = [
    { name: "Passed", value: run.passed, color: "#10b981" },
    { name: "Failed", value: run.failed, color: "#ef4444" },
    { name: "Skipped", value: run.skipped, color: "#6b7280" },
    { name: "Errors", value: run.errors, color: "#f59e0b" },
  ].filter((d) => d.value > 0);

  // Get unique suites from results
  const suites = resultsData?.results
    ? [...new Set(resultsData.results.map((r) => r.suiteName))].sort()
    : [];

  const statusColor = (s: string) => {
    switch (s) {
      case "passed": return "text-emerald-600 dark:text-emerald-400";
      case "failed": return "text-red-600 dark:text-red-400";
      case "error": return "text-orange-600 dark:text-orange-400";
      case "skipped": return "text-muted-foreground";
      default: return "";
    }
  };

  const statusIcon = (s: string) => {
    switch (s) {
      case "passed": return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
      case "failed": return <XCircle className="w-3.5 h-3.5 text-red-500" />;
      case "error": return <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />;
      case "skipped": return <SkipForward className="w-3.5 h-3.5 text-muted-foreground" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/runs">
          <Button variant="ghost" size="sm" data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-semibold tracking-tight" data-testid="text-run-name">{run.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-xs">{run.framework}</Badge>
            <Badge
              variant="outline"
              className={`text-xs ${
                run.status === "passed"
                  ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                  : "border-red-500/30 text-red-600 dark:text-red-400"
              }`}
            >
              {run.status}
            </Badge>
          </div>
        </div>
      </div>

      {/* Run Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Git Info */}
        <Card className="border-card-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Git Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <GitCommit className="w-3.5 h-3.5 text-muted-foreground" />
              <code className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded">
                {run.commitHash.slice(0, 12)}
              </code>
            </div>
            {run.branch && (
              <div className="flex items-center gap-2 text-xs">
                <GitBranch className="w-3.5 h-3.5 text-muted-foreground" />
                <span>{run.branch}</span>
              </div>
            )}
            {run.gitTag && (
              <div className="flex items-center gap-2 text-xs">
                <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                <span>{run.gitTag}</span>
              </div>
            )}
            {run.commitMessage && (
              <p className="text-xs text-muted-foreground mt-2 italic">"{run.commitMessage}"</p>
            )}
            {run.commitAuthor && (
              <p className="text-[11px] text-muted-foreground">by {run.commitAuthor}</p>
            )}
          </CardContent>
        </Card>

        {/* Platform Info */}
        <Card className="border-card-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Platform</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <Server className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{run.platform?.os} / {run.platform?.architecture}</span>
            </div>
            <div className="text-xs">
              <span className="text-muted-foreground">Compiler:</span> {run.platform?.compiler}
            </div>
            <div className="text-xs">
              <span className="text-muted-foreground">Host:</span> {run.platform?.host}
            </div>
            <div className="flex items-center gap-2 text-xs mt-2">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{run.durationMs ? `${(run.durationMs / 1000).toFixed(1)}s` : "—"}</span>
            </div>
          </CardContent>
        </Card>

        {/* Results Summary */}
        <Card className="border-card-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={22}
                      outerRadius={36}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: 11,
                        color: "hsl(var(--foreground))",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1 text-xs tabular-nums">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Passed: {run.passed}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <span>Failed: {run.failed}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-gray-500" />
                  <span>Skipped: {run.skipped}</span>
                </div>
                {run.errors > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>Errors: {run.errors}</span>
                  </div>
                )}
                <div className="font-medium mt-1 pt-1 border-t border-border">
                  Pass Rate: {passRate.toFixed(1)}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Test Results Table */}
      <Card className="border-card-border overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">
              Test Results ({resultsData?.total ?? 0})
            </CardTitle>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                data-testid="input-search-results"
                type="search"
                placeholder="Search tests..."
                className="pl-9 h-8 text-xs"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
              <SelectTrigger className="w-28 h-8 text-xs" data-testid="select-result-status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>All</SelectItem>
                <SelectItem value="passed">Passed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="skipped">Skipped</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
            <Select value={suiteFilter} onValueChange={(v) => { setSuiteFilter(v); setPage(0); }}>
              <SelectTrigger className="w-36 h-8 text-xs" data-testid="select-result-suite">
                <SelectValue placeholder="Suite" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>All Suites</SelectItem>
                {suites.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="w-8 px-2" />
                <th className="text-left font-medium text-muted-foreground px-4 py-2 text-xs">Status</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-2 text-xs">Suite</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-2 text-xs">Test</th>
                <th className="text-right font-medium text-muted-foreground px-4 py-2 text-xs">Duration</th>
              </tr>
            </thead>
            <tbody>
              {resultsLoading && Array.from({ length: 10 }).map((_, i) => (
                <tr key={i} className="border-b border-border">
                  <td colSpan={5} className="px-4 py-2"><Skeleton className="h-6 w-full" /></td>
                </tr>
              ))}
              {resultsData?.results.map((result) => (
                <>
                  <tr
                    key={result.id}
                    className="border-b border-border hover:bg-muted/20 transition-colors cursor-pointer"
                    data-testid={`row-result-${result.id}`}
                    onClick={() => setExpandedTest(expandedTest === result.id ? null : result.id)}
                  >
                    <td className="px-2 text-center">
                      {(result.message || result.stackTrace || result.stderr) ? (
                        expandedTest === result.id
                          ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                          : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                      ) : null}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1.5">
                        {statusIcon(result.status)}
                        <span className={`text-xs font-medium ${statusColor(result.status)}`}>
                          {result.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{result.suiteName}</td>
                    <td className="px-4 py-2 text-xs font-medium">{result.testName}</td>
                    <td className="px-4 py-2 text-right text-xs tabular-nums text-muted-foreground">
                      {result.durationMs ? `${result.durationMs.toFixed(1)}ms` : "—"}
                    </td>
                  </tr>
                  {expandedTest === result.id && (result.message || result.stackTrace || result.stderr) && (
                    <tr key={`${result.id}-detail`} className="border-b border-border">
                      <td colSpan={5} className="px-6 py-3 bg-muted/10">
                        {result.message && (
                          <div className="mb-2">
                            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Message</span>
                            <pre className="text-xs font-mono mt-1 p-2 rounded bg-muted/30 overflow-x-auto whitespace-pre-wrap">
                              {result.message}
                            </pre>
                          </div>
                        )}
                        {result.stackTrace && (
                          <div className="mb-2">
                            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Stack Trace</span>
                            <pre className="text-xs font-mono mt-1 p-2 rounded bg-muted/30 overflow-x-auto whitespace-pre-wrap">
                              {result.stackTrace}
                            </pre>
                          </div>
                        )}
                        {result.stderr && (
                          <div>
                            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Stderr</span>
                            <pre className="text-xs font-mono mt-1 p-2 rounded bg-red-500/5 border border-red-500/10 overflow-x-auto whitespace-pre-wrap">
                              {result.stderr}
                            </pre>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {resultsData && resultsData.total > pageSize && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-xs text-muted-foreground">
              Showing {page * pageSize + 1}-{Math.min((page + 1) * pageSize, resultsData.total)} of {resultsData.total}
            </span>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={(page + 1) * pageSize >= resultsData.total}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
