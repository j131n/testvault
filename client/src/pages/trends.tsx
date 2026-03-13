import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface TrendPoint {
  date: string;
  value: number;
  count?: number;
}

const ALL_VALUE = "__all__";

export default function Trends() {
  const [days, setDays] = useState("30");
  const [framework, setFramework] = useState(ALL_VALUE);
  const [os, setOs] = useState(ALL_VALUE);
  const [compiler, setCompiler] = useState(ALL_VALUE);
  const [architecture, setArchitecture] = useState(ALL_VALUE);
  const [branch, setBranch] = useState(ALL_VALUE);

  const buildQuery = (endpoint: string) => {
    const params = new URLSearchParams();
    params.set("days", days);
    if (framework !== ALL_VALUE) params.set("framework", framework);
    if (os !== ALL_VALUE) params.set("os", os);
    if (compiler !== ALL_VALUE) params.set("compiler", compiler);
    if (architecture !== ALL_VALUE) params.set("architecture", architecture);
    if (branch !== ALL_VALUE) params.set("branch", branch);
    return `/api/analytics/${endpoint}?${params.toString()}`;
  };

  const { data: passRateTrend } = useQuery<TrendPoint[]>({
    queryKey: ["pass-rate-trend", days, framework, os, compiler, architecture, branch],
    queryFn: async () => {
      const res = await fetch(buildQuery("pass-rate-trend"));
      return res.json();
    },
  });

  const { data: durationTrend } = useQuery<TrendPoint[]>({
    queryKey: ["duration-trend", days, framework, os, compiler, architecture, branch],
    queryFn: async () => {
      const res = await fetch(buildQuery("duration-trend"));
      return res.json();
    },
  });

  const { data: osValues } = useQuery<string[]>({ queryKey: ["/api/platforms/distinct/os"] });
  const { data: compilerValues } = useQuery<string[]>({ queryKey: ["/api/platforms/distinct/compiler"] });
  const { data: archValues } = useQuery<string[]>({ queryKey: ["/api/platforms/distinct/architecture"] });

  const tooltipStyle = {
    backgroundColor: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "8px",
    fontSize: 12,
    color: "hsl(var(--foreground))",
  };

  // Compute combined data for the overview chart
  const combinedData = (passRateTrend || []).map((pr) => {
    const dur = (durationTrend || []).find((d) => d.date === pr.date);
    return {
      date: pr.date,
      passRate: Math.round(pr.value * 10) / 10,
      duration: dur ? Math.round(dur.value / 1000) : 0,
      runCount: pr.count || 0,
    };
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight" data-testid="text-page-title">Time Trends</h1>
        <p className="text-sm text-muted-foreground mt-1">Analyze test performance over time</p>
      </div>

      {/* Filter Bar */}
      <Card className="border-card-border">
        <CardContent className="p-3">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Time Range</label>
              <Select value={days} onValueChange={setDays}>
                <SelectTrigger className="h-8 text-xs" data-testid="select-days">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="14">Last 14 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="60">Last 60 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Framework</label>
              <Select value={framework} onValueChange={setFramework}>
                <SelectTrigger className="h-8 text-xs">
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
              <label className="text-xs text-muted-foreground mb-1 block">OS</label>
              <Select value={os} onValueChange={setOs}>
                <SelectTrigger className="h-8 text-xs">
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
              <Select value={compiler} onValueChange={setCompiler}>
                <SelectTrigger className="h-8 text-xs">
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
              <Select value={architecture} onValueChange={setArchitecture}>
                <SelectTrigger className="h-8 text-xs">
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
              <Select value={branch} onValueChange={setBranch}>
                <SelectTrigger className="h-8 text-xs">
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

      <Tabs defaultValue="passrate" className="space-y-4">
        <TabsList>
          <TabsTrigger value="passrate" data-testid="tab-passrate">Pass Rate</TabsTrigger>
          <TabsTrigger value="duration" data-testid="tab-duration">Duration</TabsTrigger>
          <TabsTrigger value="volume" data-testid="tab-volume">Run Volume</TabsTrigger>
          <TabsTrigger value="combined" data-testid="tab-combined">Combined</TabsTrigger>
        </TabsList>

        {/* Pass Rate Tab */}
        <TabsContent value="passrate">
          <Card className="border-card-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pass Rate Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={passRateTrend || []}>
                    <defs>
                      <linearGradient id="passRateGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(v) => new Date(v).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    />
                    <YAxis
                      domain={[75, 100]}
                      tickFormatter={(v) => `${v}%`}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                      width={45}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value: number) => [`${value.toFixed(1)}%`, "Pass Rate"]}
                      labelFormatter={(v) => new Date(v).toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" })}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill="url(#passRateGradient)"
                      dot={false}
                      activeDot={{ r: 4, fill: "hsl(var(--primary))" }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Duration Tab */}
        <TabsContent value="duration">
          <Card className="border-card-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Average Run Duration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={(durationTrend || []).map((d) => ({ ...d, value: d.value / 1000 }))}>
                    <defs>
                      <linearGradient id="durationGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(v) => new Date(v).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    />
                    <YAxis
                      tickFormatter={(v) => `${v}s`}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                      width={50}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value: number) => [`${value.toFixed(1)}s`, "Avg Duration"]}
                      labelFormatter={(v) => new Date(v).toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" })}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="hsl(var(--chart-2))"
                      strokeWidth={2}
                      fill="url(#durationGradient)"
                      dot={false}
                      activeDot={{ r: 4, fill: "hsl(var(--chart-2))" }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Volume Tab */}
        <TabsContent value="volume">
          <Card className="border-card-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Daily Run Volume</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={passRateTrend || []}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(v) => new Date(v).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    />
                    <YAxis
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                      width={35}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value: number) => [value, "Runs"]}
                      labelFormatter={(v) => new Date(v).toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" })}
                    />
                    <Bar dataKey="count" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Combined Tab */}
        <TabsContent value="combined">
          <Card className="border-card-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Combined View</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={combinedData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(v) => new Date(v).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    />
                    <YAxis
                      yAxisId="left"
                      domain={[75, 100]}
                      tickFormatter={(v) => `${v}%`}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                      width={45}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tickFormatter={(v) => `${v}s`}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                      width={45}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      labelFormatter={(v) => new Date(v).toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" })}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="passRate"
                      name="Pass Rate (%)"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="duration"
                      name="Duration (s)"
                      stroke="hsl(var(--chart-2))"
                      strokeWidth={2}
                      dot={false}
                      strokeDasharray="5 5"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
