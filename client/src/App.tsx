import { Switch, Route, Router, Link, useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  ListChecks,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  Moon,
  Sun,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import Dashboard from "@/pages/dashboard";
import TestRuns from "@/pages/test-runs";
import RunDetail from "@/pages/run-detail";
import Trends from "@/pages/trends";
import LastFailed from "@/pages/last-failed";
import AIAssistant from "@/pages/ai-assistant";
import NotFound from "@/pages/not-found";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";

function AppLayout() {
  const [location] = useLocation();
  const [dark, setDark] = useState(() => window.matchMedia("(prefers-color-scheme: dark)").matches);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const navItems = [
    { href: "/", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/runs", icon: ListChecks, label: "Test Runs" },
    { href: "/trends", icon: TrendingUp, label: "Trends" },
    { href: "/last-failed", icon: AlertTriangle, label: "Last Failed" },
    { href: "/ai", icon: Sparkles, label: "AI Assistant" },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        className={`flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-200 ${
          collapsed ? "w-16" : "w-56"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 px-3 h-14 border-b border-sidebar-border shrink-0">
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none" className="shrink-0">
            <rect x="2" y="2" width="28" height="28" rx="6" stroke="currentColor" strokeWidth="2" className="text-primary" />
            <path d="M9 16L14 21L23 11" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary" />
          </svg>
          {!collapsed && (
            <span className="font-semibold text-sm tracking-tight text-foreground">
              TestVault
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2 px-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <TooltipProvider key={item.href} delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link href={item.href}>
                      <div
                        data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                        className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground"
                        } ${collapsed ? "justify-center px-2" : ""}`}
                      >
                        <item.icon className="w-4 h-4 shrink-0" />
                        {!collapsed && <span>{item.label}</span>}
                      </div>
                    </Link>
                  </TooltipTrigger>
                  {collapsed && (
                    <TooltipContent side="right">
                      <p>{item.label}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </nav>

        {/* Bottom controls */}
        <div className="border-t border-sidebar-border p-2 space-y-1 shrink-0">
          <Button
            data-testid="toggle-theme"
            variant="ghost"
            size="sm"
            className={`w-full ${collapsed ? "justify-center px-2" : "justify-start"}`}
            onClick={() => setDark(!dark)}
          >
            {dark ? <Sun className="w-4 h-4 shrink-0" /> : <Moon className="w-4 h-4 shrink-0" />}
            {!collapsed && <span className="ml-2 text-xs">{dark ? "Light" : "Dark"}</span>}
          </Button>
          <Button
            data-testid="toggle-sidebar"
            variant="ghost"
            size="sm"
            className={`w-full ${collapsed ? "justify-center px-2" : "justify-start"}`}
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            {!collapsed && <span className="ml-2 text-xs">Collapse</span>}
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-[1440px] mx-auto">
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/runs" component={TestRuns} />
            <Route path="/runs/:id" component={RunDetail} />
            <Route path="/trends" component={Trends} />
            <Route path="/last-failed" component={LastFailed} />
            <Route path="/ai" component={AIAssistant} />
            <Route component={NotFound} />
          </Switch>
        </div>
        <PerplexityAttribution />
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router hook={useHashLocation}>
        <AppLayout />
      </Router>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
