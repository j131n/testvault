import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Server,
  BarChart3,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts";

interface DashboardStats {
  totalRuns: number;
  totalTests: number;
  overallPassRate: number;
  avgDuration: number;
  recentFailures: number;
  runsToday: number;
  uniquePlatforms: number;
  frameworks: string[];
}

interface TrendPoint {
  date: string;
  value: number;
  count?: number;
}

interface FailureHotspot {
  suiteName: string;
  testName: string;
  failCount: number;
  totalRuns: number;
  failRate: number;
}

interface PlatformComparison {
  os: string;
  compiler: string;
  architecture: string;
  runCount: number;
  passRate: number;
  avgDuration: number;
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/analytics/dashboard"],
  });

  const { data: passRateTrend } = useQuery<TrendPoint[]>({
    queryKey: ["pass-rate-trend-30"],
    queryFn: async () => {
      const res = await fetch("/api/analytics/pass-rate-trend?days=30");
      return res.json();
    },
  });

  const { data: hotspots } = useQuery<FailureHotspot[]>({
    queryKey: ["failure-hotspots"],
    queryFn: async () => {
      const res = await fetch("/api/analytics/failure-hotspots?limit=8");
      return res.json();
    },
  });

  const { data: platformComp } = useQuery<PlatformComparison[]>({
    queryKey: ["/api/analytics/platform-comparison"],
  });

  const { data: flakyTests } = useQuery<any[]>({
    queryKey: ["flaky-tests"],
    queryFn: async () => {
      const res = await fetch("/api/analytics/flaky-tests?limit=5");
      return res.json();
    },
  });

  if (statsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  const kpis = [
    { label: "Total Runs", value: stats?.totalRuns ?? 0, icon: Activity, color: "text-primary" },
    { label: "Total Tests", value: (stats?.totalTests ?? 0).toLocaleString(), icon: BarChart3, color: "text-blue-500" },
    { label: "Pass Rate", value: `${(stats?.overallPassRate ?? 0).toFixed(1)}%`, icon: CheckCircle2, color: stats && stats.overallPassRate > 90 ? "text-emerald-500" : "text-amber-500" },
    { label: "Avg Duration", value: `${((stats?.avgDuration ?? 0) / 1000).toFixed(0)}s`, icon: Clock, color: "text-violet-500" },
    { label: "Recent Failures", value: stats?.recentFailures ?? 0, icon: XCircle, color: "text-red-500" },
    { label: "Runs Today", value: stats?.runsToday ?? 0, icon: TrendingUp, color: "text-cyan-500" },
    { label: "Platforms", value: stats?.uniquePlatforms ?? 0, icon: Server, color: "text-orange-500" },
    { label: "Flaky Tests", value: flakyTests?.length ?? 0, icon: AlertTriangle, color: "text-amber-500" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight" data-testid="text-page-title">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Cross-platform test results overview</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="border-card-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground font-medium">{kpi.label}</p>
                <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
              </div>
              <p className="text-2xl font-bold tabular-nums mt-1" data-testid={`kpi-${kpi.label.toLowerCase().replace(/\s+/g, "-")}`}>
                {kpi.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pass Rate Trend */}
        <Card className="border-card-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pass Rate Trend (30d)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={passRateTrend || []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v) => new Date(v).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  />
                  <YAxis
                    domain={[80, 100]}
                    tickFormatter={(v) => `${v}%`}
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    width={45}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: 12,
                      color: "hsl(var(--foreground))",
                    }}
                    formatter={(value: number) => [`${value.toFixed(1)}%`, "Pass Rate"]}
                    labelFormatter={(v) => new Date(v).toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" })}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: "hsl(var(--primary))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Platform Comparison */}
        <Card className="border-card-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Platform Pass Rates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={(platformComp || []).map((p) => ({
                    name: `${p.os}/${p.architecture}`,
                    passRate: Math.round(p.passRate * 10) / 10,
                    runs: p.runCount,
                  }))}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    type="number"
                    domain={[80, 100]}
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={120}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: 12,
                      color: "hsl(var(--foreground))",
                    }}
                    formatter={(value: number) => [`${value.toFixed(1)}%`, "Pass Rate"]}
                  />
                  <Bar dataKey="passRate" radius={[0, 4, 4, 0]}>
                    {(platformComp || []).map((_, i) => (
                      <Cell key={i} fill={`hsl(var(--chart-${(i % 5) + 1}))`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Failure Hotspots */}
        <Card className="border-card-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Failure Hotspots</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(hotspots || []).slice(0, 6).map((h, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{h.suiteName}::{h.testName}</p>
                    <p className="text-xs text-muted-foreground">
                      {h.failCount} failures / {h.totalRuns} runs
                    </p>
                  </div>
                  <Badge
                    variant={h.failRate > 30 ? "destructive" : "secondary"}
                    className="ml-2 tabular-nums text-xs"
                  >
                    {h.failRate.toFixed(0)}%
                  </Badge>
                </div>
              ))}
              {(!hotspots || hotspots.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">No failures detected</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Flaky Tests */}
        <Card className="border-card-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Flaky Tests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(flakyTests || []).map((f, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{f.suiteName}::{f.testName}</p>
                    <p className="text-xs text-muted-foreground">
                      {f.occurrences} flips detected
                    </p>
                  </div>
                  <Badge variant="outline" className="ml-2 tabular-nums text-xs border-amber-500/50 text-amber-600 dark:text-amber-400">
                    {(f.flakinessRate ?? 0).toFixed(0)}% flaky
                  </Badge>
                </div>
              ))}
              {(!flakyTests || flakyTests.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">No flaky tests detected</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Framework breakdown */}
      {stats?.frameworks && stats.frameworks.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Frameworks:</span>
          {stats.frameworks.map((f) => (
            <Badge key={f} variant="secondary" className="text-xs">{f}</Badge>
          ))}
        </div>
      )}
    </div>
  );
}
