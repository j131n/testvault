import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  GitCommit,
  GitBranch,
  Clock,
  Filter,
  X,
  ExternalLink,
} from "lucide-react";

interface TestRunWithPlatform {
  id: number;
  name: string;
  framework: string;
  platformId: number;
  commitHash: string;
  branch: string | null;
  gitTag: string | null;
  buildRevision: string | null;
  commitMessage: string | null;
  commitAuthor: string | null;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  errors: number;
  status: string;
  platform?: {
    os: string;
    compiler: string;
    host: string;
    architecture: string;
  };
}

const ALL_VALUE = "__all__";

export default function TestRuns() {
  const [search, setSearch] = useState("");
  const [framework, setFramework] = useState(ALL_VALUE);
  const [status, setStatus] = useState(ALL_VALUE);
  const [os, setOs] = useState(ALL_VALUE);
  const [compiler, setCompiler] = useState(ALL_VALUE);
  const [architecture, setArchitecture] = useState(ALL_VALUE);
  const [branch, setBranch] = useState(ALL_VALUE);
  const [page, setPage] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const pageSize = 15;

  const buildQueryString = () => {
    const params = new URLSearchParams();
    params.set("limit", String(pageSize));
    params.set("offset", String(page * pageSize));
    if (search) params.set("search", search);
    if (framework !== ALL_VALUE) params.set("framework", framework);
    if (status !== ALL_VALUE) params.set("status", status);
    if (os !== ALL_VALUE) params.set("os", os);
    if (compiler !== ALL_VALUE) params.set("compiler", compiler);
    if (architecture !== ALL_VALUE) params.set("architecture", architecture);
    if (branch !== ALL_VALUE) params.set("branch", branch);
    return params.toString();
  };

  const { data, isLoading } = useQuery<{ runs: TestRunWithPlatform[]; total: number }>({
    queryKey: ["/api/runs", { search, framework, status, os, compiler, architecture, branch, page }],
    queryFn: async () => {
      const res = await fetch(`/api/runs?${buildQueryString()}`);
      if (!res.ok) throw new Error("Failed to fetch runs");
      return res.json();
    },
  });

  // Fetch distinct values for filters
  const { data: osValues } = useQuery<string[]>({ queryKey: ["/api/platforms/distinct/os"] });
  const { data: compilerValues } = useQuery<string[]>({ queryKey: ["/api/platforms/distinct/compiler"] });
  const { data: archValues } = useQuery<string[]>({ queryKey: ["/api/platforms/distinct/architecture"] });

  const totalPages = Math.ceil((data?.total ?? 0) / pageSize);
  const activeFilterCount = [framework, status, os, compiler, architecture, branch].filter(v => v !== ALL_VALUE).length;

  const clearFilters = () => {
    setFramework(ALL_VALUE);
    setStatus(ALL_VALUE);
    setOs(ALL_VALUE);
    setCompiler(ALL_VALUE);
    setArchitecture(ALL_VALUE);
    setBranch(ALL_VALUE);
    setSearch("");
    setPage(0);
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "passed": return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "failed": return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
      case "running": return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
      case "error": return "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20";
      default: return "";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight" data-testid="text-page-title">Test Runs</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {data?.total ?? 0} runs across all platforms
          </p>
        </div>
      </div>

      {/* Search + Filter Toggle */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            data-testid="input-search"
            type="search"
            placeholder="Search by name, commit, branch..."
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          />
        </div>
        <Button
          data-testid="button-toggle-filters"
          variant={showFilters ? "default" : "outline"}
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="w-4 h-4 mr-1" />
          Filters
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-1 text-xs px-1.5">{activeFilterCount}</Badge>
          )}
        </Button>
        {activeFilterCount > 0 && (
          <Button data-testid="button-clear-filters" variant="ghost" size="sm" onClick={clearFilters}>
            <X className="w-4 h-4 mr-1" /> Clear
          </Button>
        )}
      </div>

      {/* Filter Bar */}
      {showFilters && (
        <Card className="border-card-border">
          <CardContent className="p-3">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Framework</label>
                <Select value={framework} onValueChange={(v) => { setFramework(v); setPage(0); }}>
                  <SelectTrigger className="h-8 text-xs" data-testid="select-framework">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_VALUE}>All</SelectItem>
                    <SelectItem value="gtest">GTest</SelectItem>
                    <SelectItem value="robot">Robot</SelectItem>
                    <SelectItem value="pytest">Pytest</SelectItem>
                    <SelectItem value="junit">JUnit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Status</label>
                <Select value={status} onValueChange={(v) => { setStatus(v); setPage(0); }}>
                  <SelectTrigger className="h-8 text-xs" data-testid="select-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_VALUE}>All</SelectItem>
                    <SelectItem value="passed">Passed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="running">Running</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">OS</label>
                <Select value={os} onValueChange={(v) => { setOs(v); setPage(0); }}>
                  <SelectTrigger className="h-8 text-xs" data-testid="select-os">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_VALUE}>All</SelectItem>
                    {(osValues || []).map((v) => (
                      <SelectItem key={v} value={v}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Compiler</label>
                <Select value={compiler} onValueChange={(v) => { setCompiler(v); setPage(0); }}>
                  <SelectTrigger className="h-8 text-xs" data-testid="select-compiler">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_VALUE}>All</SelectItem>
                    {(compilerValues || []).map((v) => (
                      <SelectItem key={v} value={v}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Architecture</label>
                <Select value={architecture} onValueChange={(v) => { setArchitecture(v); setPage(0); }}>
                  <SelectTrigger className="h-8 text-xs" data-testid="select-architecture">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_VALUE}>All</SelectItem>
                    {(archValues || []).map((v) => (
                      <SelectItem key={v} value={v}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Branch</label>
                <Select value={branch} onValueChange={(v) => { setBranch(v); setPage(0); }}>
                  <SelectTrigger className="h-8 text-xs" data-testid="select-branch">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_VALUE}>All</SelectItem>
                    <SelectItem value="main">main</SelectItem>
                    <SelectItem value="develop">develop</SelectItem>
                    <SelectItem value="feature/auth">feature/auth</SelectItem>
                    <SelectItem value="release/v2.1">release/v2.1</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Table */}
      <Card className="border-card-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left font-medium text-muted-foreground px-4 py-2.5 text-xs">Run</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-2.5 text-xs">Platform</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-2.5 text-xs">Git</th>
                <th className="text-center font-medium text-muted-foreground px-4 py-2.5 text-xs">Results</th>
                <th className="text-right font-medium text-muted-foreground px-4 py-2.5 text-xs">Duration</th>
                <th className="text-right font-medium text-muted-foreground px-4 py-2.5 text-xs">Time</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border">
                  <td colSpan={6} className="px-4 py-3"><Skeleton className="h-8 w-full" /></td>
                </tr>
              ))}
              {data?.runs.map((run) => {
                const passRate = run.totalTests > 0 ? (run.passed / run.totalTests) * 100 : 0;
                return (
                  <tr key={run.id} className="border-b border-border hover:bg-muted/20 transition-colors" data-testid={`row-run-${run.id}`}>
                    <td className="px-4 py-2.5">
                      <Link href={`/runs/${run.id}`}>
                        <span className="font-medium text-primary hover:underline cursor-pointer text-xs">
                          {run.name}
                        </span>
                      </Link>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">{run.framework}</Badge>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border ${statusColor(run.status)}`}>
                          {run.status}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="text-xs">{run.platform?.os} / {run.platform?.architecture}</div>
                      <div className="text-[11px] text-muted-foreground">{run.platform?.compiler}</div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1 text-xs font-mono">
                        <GitCommit className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[11px]">{run.commitHash.slice(0, 8)}</span>
                      </div>
                      {run.branch && (
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                          <GitBranch className="w-3 h-3" />
                          {run.branch}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-2 text-xs tabular-nums">
                        <span className="text-emerald-600 dark:text-emerald-400">{run.passed}</span>
                        <span className="text-muted-foreground">/</span>
                        <span className="text-red-600 dark:text-red-400">{run.failed}</span>
                        <span className="text-muted-foreground">/</span>
                        <span className="text-muted-foreground">{run.skipped}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1 mt-1">
                        <div
                          className="bg-emerald-500 h-1 rounded-full transition-all"
                          style={{ width: `${passRate}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="text-xs tabular-nums">
                        {run.durationMs ? `${(run.durationMs / 1000).toFixed(0)}s` : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="text-xs text-muted-foreground">
                        {new Date(run.startedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                      </span>
                      <br />
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(run.startedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-xs text-muted-foreground">
              Page {page + 1} of {totalPages} ({data?.total} total)
            </span>
            <div className="flex items-center gap-1">
              <Button
                data-testid="button-prev-page"
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                data-testid="button-next-page"
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
