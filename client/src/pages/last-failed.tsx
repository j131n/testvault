import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  GitCommit,
  GitBranch,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Flame,
} from "lucide-react";

interface LastFailedEntry {
  testName: string;
  suiteName: string;
  lastFailedCommit: string;
  lastFailedBranch: string | null;
  lastFailedAt: string;
  lastPassedCommit: string | null;
  lastPassedAt: string | null;
  failStreak: number;
  platformOs?: string;
  platformCompiler?: string;
  platformArch?: string;
}

export default function LastFailed() {
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const { data, isLoading } = useQuery<{ tests: LastFailedEntry[]; total: number }>({
    queryKey: ["/api/analytics/last-failed", { limit: pageSize, offset: page * pageSize }],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/last-failed?limit=${pageSize}&offset=${page * pageSize}`);
      return res.json();
    },
  });

  const totalPages = Math.ceil((data?.total ?? 0) / pageSize);

  const streakBadge = (streak: number) => {
    if (streak >= 10) return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
    if (streak >= 5) return "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20";
    if (streak >= 3) return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
    return "bg-muted text-muted-foreground";
  };

  const timeSince = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return "< 1h ago";
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "1 day ago";
    return `${days} days ago`;
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight" data-testid="text-page-title">Last Failed</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tests ordered by most recent failure in git history. {data?.total ?? 0} tests with failures.
        </p>
      </div>

      {/* Summary Cards */}
      {data && data.tests.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card className="border-card-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground font-medium">Active Failures</p>
                <AlertTriangle className="w-4 h-4 text-red-500" />
              </div>
              <p className="text-2xl font-bold tabular-nums mt-1">
                {data.tests.filter((t) => t.failStreak > 0 && !t.lastPassedAt).length || data.total}
              </p>
            </CardContent>
          </Card>
          <Card className="border-card-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground font-medium">Longest Streak</p>
                <Flame className="w-4 h-4 text-orange-500" />
              </div>
              <p className="text-2xl font-bold tabular-nums mt-1">
                {Math.max(...data.tests.map((t) => t.failStreak), 0)} runs
              </p>
            </CardContent>
          </Card>
          <Card className="border-card-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground font-medium">Recently Recovered</p>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-bold tabular-nums mt-1">
                {data.tests.filter((t) => t.lastPassedAt && new Date(t.lastPassedAt) > new Date(t.lastFailedAt)).length}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Failures Table */}
      <Card className="border-card-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left font-medium text-muted-foreground px-4 py-2.5 text-xs">Test</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-2.5 text-xs">Last Failed</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-2.5 text-xs">Last Passed</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-2.5 text-xs">Platform</th>
                <th className="text-center font-medium text-muted-foreground px-4 py-2.5 text-xs">Streak</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-border">
                  <td colSpan={5} className="px-4 py-3"><Skeleton className="h-10 w-full" /></td>
                </tr>
              ))}
              {data?.tests.map((test, i) => (
                <tr
                  key={`${test.suiteName}-${test.testName}`}
                  className="border-b border-border hover:bg-muted/20 transition-colors"
                  data-testid={`row-last-failed-${i}`}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-xs">{test.testName}</div>
                    <div className="text-[11px] text-muted-foreground">{test.suiteName}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-xs">
                      <GitCommit className="w-3 h-3 text-red-500" />
                      <code className="font-mono text-[11px] bg-red-500/5 px-1.5 py-0.5 rounded border border-red-500/10">
                        {test.lastFailedCommit.slice(0, 8)}
                      </code>
                    </div>
                    {test.lastFailedBranch && (
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                        <GitBranch className="w-3 h-3" />
                        {test.lastFailedBranch}
                      </div>
                    )}
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {timeSince(test.lastFailedAt)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {test.lastPassedCommit ? (
                      <>
                        <div className="flex items-center gap-1.5 text-xs">
                          <GitCommit className="w-3 h-3 text-emerald-500" />
                          <code className="font-mono text-[11px] bg-emerald-500/5 px-1.5 py-0.5 rounded border border-emerald-500/10">
                            {test.lastPassedCommit.slice(0, 8)}
                          </code>
                        </div>
                        {test.lastPassedAt && (
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            {timeSince(test.lastPassedAt)}
                          </div>
                        )}
                      </>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">Never passed</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {test.platformOs && (
                      <div className="text-xs">
                        {test.platformOs} / {test.platformArch}
                      </div>
                    )}
                    {test.platformCompiler && (
                      <div className="text-[11px] text-muted-foreground">{test.platformCompiler}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge
                      variant="outline"
                      className={`text-xs tabular-nums border ${streakBadge(test.failStreak)}`}
                    >
                      {test.failStreak > 0 && <Flame className="w-3 h-3 mr-1" />}
                      {test.failStreak}
                    </Badge>
                  </td>
                </tr>
              ))}
              {data && data.tests.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-sm text-muted-foreground">
                    No test failures found. All tests are passing.
                  </td>
                </tr>
              )}
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
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
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
