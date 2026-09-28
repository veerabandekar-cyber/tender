import { useNavigate, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuth } from "@/context/AuthContext";
import { useDashboardStats, useDashboardCharts } from "@/hooks/useDashboard";
import { useTenders } from "@/hooks/useTenders";
import {
  FileText,
  Building2,
  Calendar,
  IndianRupee,
  ShieldAlert,
  Zap,
  TrendingUp,
  ArrowRight,
  Clock,
  ExternalLink,
  ChevronRight,
  Plus,
  Play,
  CheckCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { discoveryApi } from "@/lib/api";

const STATUS_COLORS: Record<string, string> = {
  New: "#3b82f6", // Blue
  "Under Review": "#eab308", // Yellow
  Interested: "#10b981", // Emerald
  "Bid Submitted": "#a855f7", // Purple
  Won: "#22c55e", // Green
  Lost: "#ef4444", // Red
  Closed: "#6b7280", // Gray
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isScraping, setIsScraping] = useState(false);

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useDashboardStats();
  const { data: charts, isLoading: chartsLoading, refetch: refetchCharts } = useDashboardCharts();
  const { data: tendersData, isLoading: tendersLoading, refetch: refetchTenders } = useTenders();

  const handleRunScraper = async () => {
    setIsScraping(true);
    toast({
      title: "Scraper Running",
      description: "Collecting publicly accessible tenders from configured government and research portals...",
    });

    try {
      const startedLog = await discoveryApi.run();

      // The backend runs discovery in the background. Wait for that specific run
      // to finish before refreshing the dashboard, otherwise the UI can show 0
      // tenders while the scraper is still working.
      let completedLog = startedLog;
      for (let attempt = 0; attempt < 300 && completedLog.status === "Running"; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const logs = await discoveryApi.getLogs();
        const latest = logs.find((log) => log.id === startedLog.id);
        if (latest) completedLog = latest;
      }

      if (completedLog.status === "Running") {
        throw new Error("The discovery run is still processing. Open Settings → scraper logs for its status.");
      }
      if (completedLog.status === "Failed") {
        throw new Error("Tender discovery failed. Open Settings → scraper logs for the portal-specific error.");
      }

      toast({
        title: "Scrape Completed",
        description: `${completedLog.tenders_found ?? 0} new tender(s) stored. Existing records were refreshed without creating duplicates.`,
      });
      // Refetch only after the background discovery run has completed.
      await Promise.all([refetchStats(), refetchCharts(), refetchTenders()]);
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Tender Discovery Failed",
        description: error instanceof Error ? error.message : "The portal could not complete tender discovery.",
      });
    } finally {
      setIsScraping(false);
    }
  };

  const formatCurrency = (val?: number) => {
    if (val == null || val === 0) return "Not published";
    if (val >= 10000000) {
      return `₹${(val / 10000000).toFixed(2)} Cr`;
    }
    if (val >= 100000) {
      return `₹${(val / 100000).toFixed(2)} L`;
    }
    return `₹${val.toLocaleString()}`;
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Good Morning";
    if (hour >= 12 && hour < 17) return "Good Afternoon";
    if (hour >= 17 && hour < 22) return "Good Evening";
    return "Good Evening";
  };

  const activeTendersList = tendersData?.items?.filter(t => t.status !== "Closed").slice(0, 5) || [];

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 p-6">
        {/* Welcome Hero Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-accent/5 to-primary/3 border border-primary/10 p-6 sm:p-8">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary/15 to-transparent rounded-full -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-accent/10 to-transparent rounded-full translate-y-1/3 -translate-x-1/4" />

          <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
            <div className="max-w-2xl">
              <p className="text-sm font-medium text-primary mb-1">
                {greeting()}, {user?.first_name || "User"} 👋
              </p>
              <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">
                Tender Intelligence Portal
              </h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Collects tender metadata from publicly accessible government and research-organisation listings. CAPTCHA-protected pages are never bypassed; when public metadata is unavailable, the official portal remains available for manual access.
              </p>
            </div>

            <div className="flex flex-col gap-2.5 shrink-0 w-full sm:w-auto xl:min-w-[420px]">
              <Button
                onClick={handleRunScraper}
                disabled={isScraping}
                size="lg"
                className="w-full bg-primary hover:bg-primary/95 text-white font-semibold h-11 px-6 text-sm shadow-md transition-all gap-2"
              >
                {isScraping ? (
                  <>
                    <Zap className="h-4.5 w-4.5 animate-spin" />
                    Searching Portals...
                  </>
                ) : (
                  <>
                    <Zap className="h-4.5 w-4.5 fill-white" />
                    Run Tender Discovery
                  </>
                )}
              </Button>

              <div className="grid grid-cols-4 gap-2 w-full">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/tenders")}
                  className="border-primary/20 hover:bg-primary/5 hover:text-primary transition-all text-xs h-9 px-2 justify-center"
                >
                  View Tracker
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open("https://www.eprocure.gov.in/epublish/app", "_blank", "noopener,noreferrer")}
                  className="border-primary/20 hover:bg-primary/5 hover:text-primary transition-all text-xs h-9 px-2 justify-center"
                >
                  CPPP
                  <ExternalLink className="ml-1 h-3 w-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open("https://bidplus.gem.gov.in/", "_blank", "noopener,noreferrer")}
                  className="border-primary/20 hover:bg-primary/5 hover:text-primary transition-all text-xs h-9 px-2 justify-center"
                >
                  GeM
                  <ExternalLink className="ml-1 h-3 w-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open("https://dae.gov.in/", "_blank", "noopener,noreferrer")}
                  className="border-primary/20 hover:bg-primary/5 hover:text-primary transition-all text-xs h-9 px-2 justify-center"
                >
                  DAE
                  <ExternalLink className="ml-1 h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* 6 Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {[
            {
              title: "Active Tenders",
              value: stats?.totalActiveTenders,
              description: "Currently open bids",
              icon: FileText,
              color: "text-blue-500 bg-blue-500/10",
            },
            {
              title: "New Today",
              value: stats?.newToday,
              description: "Discovered today",
              icon: CheckCircle,
              color: "text-emerald-500 bg-emerald-500/10",
            },
            {
              title: "Closing This Week",
              value: stats?.closingThisWeek,
              description: "Urgent action required",
              icon: Clock,
              color: "text-amber-500 bg-amber-500/10",
            },
            {
              title: "Known Tender Value",
              value: formatCurrency(stats?.totalTenderValue),
              description: "Only values published in source documents",
              icon: IndianRupee,
              color: "text-indigo-500 bg-indigo-500/10",
            },
            {
              title: "DAE Opportunities",
              value: stats?.daeOpportunities,
              description: "High-probability leads",
              icon: Building2,
              color: "text-purple-500 bg-purple-500/10",
            },
            {
              title: "ICP-MS Focus",
              value: stats?.icpMsOpportunities,
              description: "Target instrument bids",
              icon: ShieldAlert,
              color: "text-rose-500 bg-rose-500/10",
            },
          ].map((card, idx) => {
            const Icon = card.icon;
            return (
              <Card key={idx} className="border-border hover:border-primary/20 hover:shadow-md transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {card.title}
                  </span>
                  <div className={`p-1.5 rounded-lg ${card.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="text-xl font-bold tracking-tight mb-0.5">
                    {statsLoading ? "..." : card.value}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {card.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Status Distribution */}
          <Card className="border-border hover:shadow-sm transition-all duration-300">
            <CardHeader className="p-5 pb-2">
              <CardTitle className="text-base font-bold">Status Distribution</CardTitle>
              <CardDescription className="text-xs">Tenders categorized by sales pipeline status</CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="h-64">
                {chartsLoading ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading chart...</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={charts?.statusData?.filter(d => d.value > 0) || []}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {charts?.statusData?.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || "#ccc"} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} Tenders`, "Volume"]} />
                      <Legend verticalAlign="bottom" height={36} iconSize={10} iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Closing Timeline */}
          <Card className="border-border hover:shadow-sm transition-all duration-300">
            <CardHeader className="p-5 pb-2">
              <CardTitle className="text-base font-bold">Closing Timeline</CardTitle>
              <CardDescription className="text-xs">Upcoming active tenders by closing week</CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="h-64">
                {chartsLoading ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading chart...</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={charts?.weekData || []}>
                      <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip cursor={{ fill: "rgba(0,0,0,0.02)" }} formatter={(value) => [`${value} Tenders`, "Volume"]} />
                      <Bar dataKey="count" fill="hsl(199, 89%, 32%)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Top Organizations */}
          <Card className="border-border hover:shadow-sm transition-all duration-300">
            <CardHeader className="p-5 pb-2">
              <CardTitle className="text-base font-bold">Top Organizations</CardTitle>
              <CardDescription className="text-xs">Organizations with the highest tender volume</CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="h-64">
                {chartsLoading ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading chart...</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={charts?.orgData || []} layout="vertical">
                      <XAxis type="number" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                      <YAxis dataKey="name" type="category" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} width={95} />
                      <Tooltip cursor={{ fill: "rgba(0,0,0,0.02)" }} formatter={(value, _name, item: any) => [`${value} Tenders`, item?.payload?.fullName || "Volume"]} />
                      <Bar dataKey="count" fill="hsl(175, 65%, 40%)" radius={[0, 4, 4, 0]} maxBarSize={25} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Tenders & Quick Links */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Recent Tenders Table */}
          <Card className="xl:col-span-3 border-border hover:shadow-sm transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between p-5 pb-3">
              <div>
                <CardTitle className="text-base font-bold">Recent Active Opportunities</CardTitle>
                <CardDescription className="text-xs">Latest discovered tenders matching keyword configurations</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/tenders")}
                className="text-primary hover:text-primary/95 text-xs font-semibold p-0 flex items-center gap-1"
              >
                See All Tenders
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              {tendersLoading ? (
                <div className="flex py-12 justify-center text-sm text-muted-foreground">Loading tenders...</div>
              ) : activeTendersList.length === 0 ? (
                <div className="flex py-12 justify-center text-sm text-muted-foreground">No active tenders found. Run a portal search.</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Tender ID</TableHead>
                        <TableHead className="text-xs">Organization</TableHead>
                        <TableHead className="text-xs">Instrument Category</TableHead>
                        <TableHead className="text-xs">Value</TableHead>
                        <TableHead className="text-xs">Closing Date</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeTendersList.map((tender) => (
                        <TableRow
                          key={tender.id}
                          className="hover:bg-muted/40 cursor-pointer transition-colors"
                          onClick={() => navigate(`/tenders/${tender.id}`)}
                        >
                          <TableCell className="font-medium text-xs truncate max-w-[120px] text-primary">
                            {tender.tender_number}
                          </TableCell>
                          <TableCell className="text-xs font-medium max-w-[200px] truncate">
                            {tender.organization?.name || "Unknown"}
                          </TableCell>
                          <TableCell className="text-xs">
                            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[11px] font-medium whitespace-nowrap">
                              {tender.instrument_category || "Analytical Instruments"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs font-semibold text-foreground">
                            {formatCurrency(tender.tender_value)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {tender.bid_closing_date ? new Date(tender.bid_closing_date).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric"
                            }) : "-"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              style={{
                                backgroundColor: `${STATUS_COLORS[tender.status]}15`,
                                color: STATUS_COLORS[tender.status],
                                border: `1px solid ${STATUS_COLORS[tender.status]}30`,
                              }}
                              className="text-[10px] px-2.5 py-0.5 rounded-full font-semibold"
                            >
                              {tender.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Info & Stats */}
          <div className="flex flex-col gap-6">
            {/* Quick Actions Card */}
            <Card className="border-border hover:shadow-sm transition-all duration-300">
              <CardHeader className="p-5 pb-3">
                <CardTitle className="text-base font-bold">Portal Connections</CardTitle>
                <CardDescription className="text-xs">Sources configured for automation</CardDescription>
              </CardHeader>
              <CardContent className="p-5 pt-0 space-y-4">
                {[
                  { name: "Government e-Marketplace (GeM)", status: "Configured", details: "Public listing checked when discovery runs" },
                  { name: "Central Public Procurement Portal", status: "Configured", details: "Public listing checked when discovery runs" },
                  { name: "IIT / IISc / Research Portals", status: "Configured", details: "Public listing adapters checked when discovery runs" },
                ].map((portal, i) => (
                  <div key={i} className="flex items-start justify-between border-b border-border/40 pb-3 last:border-0 last:pb-0">
                    <div>
                      <p className="text-xs font-semibold text-foreground">{portal.name}</p>
                      <p className="text-[10px] text-muted-foreground">{portal.details}</p>
                    </div>
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[9px] font-bold">
                      {portal.status}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Keyword Alert Card */}
            <Card className="border-border bg-gradient-to-br from-primary/5 to-transparent hover:shadow-sm transition-all duration-300">
              <CardHeader className="p-5 pb-2">
                <CardTitle className="text-xs font-bold text-primary uppercase tracking-wider">Search Keywords Active</CardTitle>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <div className="flex flex-wrap gap-1.5">
                  {["ICP-MS", "LC-MS", "Mass Spectrometer", "HPLC", "GC-MS", "ICP-OES"].map((kw, i) => (
                    <span
                      key={i}
                      className="text-[10px] font-semibold bg-background border border-border text-muted-foreground px-2 py-0.5 rounded"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
                <div className="mt-4 pt-3 border-t border-border/40 flex justify-end">
                  <Link to="/settings" className="text-[10px] font-bold text-primary hover:underline flex items-center gap-0.5">
                    Configure Keywords
                    <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
