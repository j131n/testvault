import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sparkles,
  Send,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Server,
  Clock,
  MessageSquare,
  RotateCcw,
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
} from "recharts";
import { apiRequest } from "@/lib/queryClient";

interface AIResponse {
  type: string;
  title: string;
  description: string;
  chartData?: any;
  chartType?: string;
  tableData?: any[];
  columns?: string[];
  stats?: Record<string, any>;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  response?: AIResponse;
  timestamp: Date;
}

const SUGGESTED_PROMPTS = [
  { icon: TrendingUp, label: "Show pass rate trend over time", prompt: "Show me the pass rate trend over the last 30 days" },
  { icon: AlertTriangle, label: "Analyze failure hotspots", prompt: "What are the top failure hotspots and which tests fail most often?" },
  { icon: Server, label: "Compare platform performance", prompt: "Compare test pass rates across different OS, compiler, and architecture combinations" },
  { icon: Clock, label: "Duration analysis", prompt: "Analyze test duration trends - are tests getting slower?" },
  { icon: BarChart3, label: "Find flaky tests", prompt: "Which tests are flaky and unstable? Show their flakiness rates" },
  { icon: MessageSquare, label: "Cluster error patterns", prompt: "Cluster the error log messages and find common failure patterns" },
];

export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (prompt: string) => {
    if (!prompt.trim() || loading) return;

    const userMessage: Message = { role: "user", content: prompt, timestamp: new Date() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await apiRequest("POST", "/api/ai/query", { prompt });
      const data: AIResponse = await response.json();

      const assistantMessage: Message = {
        role: "assistant",
        content: data.description,
        response: data,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        role: "assistant",
        content: "Sorry, I encountered an error analyzing the data. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const tooltipStyle = {
    backgroundColor: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "8px",
    fontSize: 12,
    color: "hsl(var(--foreground))",
  };

  const renderChart = (response: AIResponse) => {
    if (!response.chartData) return null;

    if (response.chartType === "line" || response.type === "trend") {
      const dataKey = response.chartData.passRate ? "passRate" : "duration";
      const data = response.chartData[dataKey] || response.chartData;

      return (
        <div className="h-[280px] mt-3">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={Array.isArray(data) ? data : []}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="date"
                tickFormatter={(v) => {
                  try { return new Date(v).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }); }
                  catch { return v; }
                }}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              />
              <YAxis
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                width={45}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Line
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      );
    }

    if (response.chartType === "bar") {
      return (
        <div className="h-[280px] mt-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={response.chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="name"
                width={160}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="passRate" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    }

    return null;
  };

  const renderTable = (response: AIResponse) => {
    if (!response.tableData || !response.columns) return null;

    return (
      <div className="overflow-x-auto mt-3 rounded-md border border-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/30 border-b border-border">
              {response.columns.map((col) => (
                <th key={col} className="text-left font-medium text-muted-foreground px-3 py-2 capitalize">
                  {col.replace(/([A-Z])/g, " $1").trim()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {response.tableData.map((row, i) => (
              <tr key={i} className="border-b border-border last:border-0">
                {response.columns!.map((col) => (
                  <td key={col} className="px-3 py-2 tabular-nums">
                    {String(row[col] ?? "—")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderStats = (response: AIResponse) => {
    if (!response.stats) return null;

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3">
        {Object.entries(response.stats).map(([key, value]) => (
          <div key={key} className="bg-muted/30 rounded-md p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {key.replace(/([A-Z])/g, " $1").trim()}
            </p>
            <p className="text-lg font-bold tabular-nums mt-0.5">{String(value)}</p>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight" data-testid="text-page-title">
          AI Assistant
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ask questions about your test results in natural language
        </p>
      </div>

      {/* Chat Area */}
      <Card className="border-card-border">
        <CardContent className="p-4">
          <div className="min-h-[400px] max-h-[600px] overflow-y-auto space-y-4 mb-4">
            {/* Welcome state */}
            {messages.length === 0 && (
              <div className="text-center py-12 space-y-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Generative Dashboarding</h2>
                  <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                    Ask questions about trends, failures, platform performance, timing analysis, or log clustering. 
                    Results are generated as interactive charts and tables.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-w-2xl mx-auto">
                  {SUGGESTED_PROMPTS.map((sp, i) => (
                    <button
                      key={i}
                      data-testid={`button-suggested-${i}`}
                      onClick={() => sendMessage(sp.prompt)}
                      className="flex items-center gap-2 text-left text-xs p-3 rounded-lg border border-border hover:bg-muted/50 hover:border-primary/30 transition-colors"
                    >
                      <sp.icon className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-muted-foreground">{sp.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-lg ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground px-4 py-2.5"
                      : "bg-muted/30 px-4 py-3 border border-border"
                  }`}
                >
                  {msg.role === "assistant" && msg.response?.title && (
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                      <span className="font-medium text-sm">{msg.response.title}</span>
                    </div>
                  )}
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                  {msg.response && renderStats(msg.response)}
                  {msg.response && renderChart(msg.response)}
                  {msg.response && renderTable(msg.response)}
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted/30 rounded-lg px-4 py-3 border border-border">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
                    <span className="text-sm text-muted-foreground">Analyzing test data...</span>
                  </div>
                  <div className="mt-2 space-y-2">
                    <Skeleton className="h-4 w-64" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="flex items-end gap-2 border-t border-border pt-4">
            <Textarea
              data-testid="input-ai-prompt"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about trends, failures, platform comparisons, timing, log patterns..."
              className="resize-none min-h-[40px] max-h-[120px] text-sm"
              rows={1}
            />
            <div className="flex flex-col gap-1">
              <Button
                data-testid="button-send"
                size="sm"
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading}
              >
                <Send className="w-4 h-4" />
              </Button>
              {messages.length > 0 && (
                <Button
                  data-testid="button-reset"
                  size="sm"
                  variant="ghost"
                  onClick={() => setMessages([])}
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
