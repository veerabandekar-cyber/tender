import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { discoveryApi } from "@/lib/api";
import { SearchKeyword, SearchLog } from "@/lib/types";
import {
  Settings as SettingsIcon,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Globe,
  Mail,
  Clock,
  Sparkles,
  Zap,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Settings() {
  const { toast } = useToast();
  const [keywords, setKeywords] = useState<SearchKeyword[]>([]);
  const [logs, setLogs] = useState<SearchLog[]>([]);
  const [newKeyword, setNewKeyword] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Email recipient states
  const [recipients, setRecipients] = useState<string[]>([
    "sales.head@analytica.com",
    "instruments.lead@analytica.com",
  ]);
  const [newEmail, setNewEmail] = useState("");

  const fetchData = async () => {
    try {
      const kw = await discoveryApi.getKeywords();
      const lg = await discoveryApi.getLogs();
      setKeywords(kw);
      setLogs(lg);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddKeyword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyword.trim()) return;

    try {
      await discoveryApi.addKeyword(newKeyword.trim());
      toast({
        title: "Keyword Added",
        description: `"${newKeyword}" is now configured for automated tender matching.`,
      });
      setNewKeyword("");
      fetchData();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to add keyword",
        description: "Error occurred while saving keyword.",
      });
    }
  };

  const handleToggleKeyword = async (id: string) => {
    try {
      await discoveryApi.toggleKeyword(id);
      fetchData();
      toast({
        title: "Configuration Changed",
        description: "Keyword state updated.",
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteKeyword = async (id: string) => {
    try {
      await discoveryApi.deleteKeyword(id);
      fetchData();
      toast({
        title: "Keyword Removed",
        description: "Keyword deleted from search pipeline.",
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newEmail.includes("@")) {
      toast({
        variant: "destructive",
        title: "Invalid Email",
        description: "Please enter a valid email address.",
      });
      return;
    }
    if (recipients.includes(newEmail.trim())) {
      toast({
        title: "Recipient Exists",
        description: "Email is already configured in the mailing list.",
      });
      return;
    }
    setRecipients([...recipients, newEmail.trim()]);
    setNewEmail("");
    toast({
      title: "Recipient Added",
      description: "Mailing list updated successfully.",
    });
  };

  const handleDeleteEmail = (email: string) => {
    setRecipients(recipients.filter(r => r !== email));
    toast({
      title: "Recipient Removed",
      description: "Email removed from mailing list.",
    });
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 p-6">
        <PageHeader
          title="Settings"
          subtitle="Configure keywords, search scrapers, and automated delivery parameters"
          breadcrumbs={[
            { label: "Dashboard", path: "/" },
            { label: "Settings" },
          ]}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel: Search Keywords */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <Card className="border-border hover:shadow-sm transition-all duration-300">
              <CardHeader className="p-5 pb-3">
                <CardTitle className="text-base font-bold">Search Keywords</CardTitle>
                <CardDescription className="text-xs">Configure instrument keywords for search and filtering after discovery</CardDescription>
              </CardHeader>
              <CardContent className="p-5 pt-0 space-y-4">
                {/* Form to add */}
                <form onSubmit={handleAddKeyword} className="flex gap-2.5 items-end">
                  <div className="flex-1 space-y-1.5">
                    <Label htmlFor="kw-input" className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                      Add Search Phrase
                    </Label>
                    <Input
                      id="kw-input"
                      value={newKeyword}
                      onChange={(e) => setNewKeyword(e.target.value)}
                      placeholder="e.g. Inductively Coupled Plasma"
                      className="border-border text-xs h-9"
                    />
                  </div>
                  <Button type="submit" className="bg-primary hover:bg-primary/95 text-white h-9 px-3">
                    <Plus className="w-4 h-4" />
                  </Button>
                </form>

                {/* List of keywords */}
                <div className="border border-border/60 rounded-xl overflow-hidden mt-4">
                  {isLoading ? (
                    <p className="text-center py-6 text-xs text-muted-foreground">Loading keywords...</p>
                  ) : keywords.length === 0 ? (
                    <p className="text-center py-6 text-xs text-muted-foreground">No search keywords configured.</p>
                  ) : (
                    <Table>
                      <TableHeader className="bg-muted/30">
                        <TableRow>
                          <TableHead className="text-xs">Keyword</TableHead>
                          <TableHead className="text-xs">Status</TableHead>
                          <TableHead className="text-xs text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {keywords.map((kw) => (
                          <TableRow key={kw.id} className="hover:bg-muted/20">
                            <TableCell className="text-xs font-semibold text-foreground">{kw.keyword}</TableCell>
                            <TableCell>
                              <Badge
                                onClick={() => handleToggleKeyword(kw.id)}
                                variant="outline"
                                className={`text-[9px] font-bold cursor-pointer select-none ${kw.is_active ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-muted text-muted-foreground border-border"}`}
                              >
                                {kw.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteKeyword(kw.id)}
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Scraper search history logs */}
            <Card className="border-border hover:shadow-sm transition-all duration-300">
              <CardHeader className="p-5 pb-3">
                <CardTitle className="text-base font-bold">Automation Discovery Logs</CardTitle>
                <CardDescription className="text-xs">History of tender discovery runs</CardDescription>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {isLoading ? (
                    <p className="text-center py-6 text-xs text-muted-foreground">Loading log entries...</p>
                  ) : logs.length === 0 ? (
                    <p className="text-center py-6 text-xs text-muted-foreground">No search logs found.</p>
                  ) : (
                    logs.map((log) => (
                      <div
                        key={log.id}
                        className="bg-muted/40 rounded-lg p-3 border border-border/60 flex items-center justify-between gap-4"
                      >
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-foreground">
                            Tender discovery run
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(log.started_at).toLocaleString()} • {log.tenders_found ?? 0} new tenders stored
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-[9px] font-bold ${log.status === "Completed" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-rose-500/10 text-rose-600 border-rose-500/20"}`}
                        >
                          {log.status}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel: Delivery & Schedule Settings */}
          <div className="flex flex-col gap-6">
            {/* Mailing List Card */}
            <Card className="border-border hover:shadow-sm transition-all duration-300">
              <CardHeader className="p-5 pb-3">
                <CardTitle className="text-base font-bold">Report Mailing List</CardTitle>
                <CardDescription className="text-xs">Recipients configured for report delivery</CardDescription>
              </CardHeader>
              <CardContent className="p-5 pt-0 space-y-4">
                <form onSubmit={handleAddEmail} className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="sales.rep@analytica.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="border-border text-xs h-9 flex-1"
                  />
                  <Button type="submit" size="sm" className="bg-primary hover:bg-primary/95 text-white h-9">
                    Add
                  </Button>
                </form>

                <div className="space-y-2.5 mt-2">
                  {recipients.map((email) => (
                    <div key={email} className="flex items-center justify-between bg-muted/40 p-2.5 rounded-lg border border-border/60">
                      <span className="text-xs text-foreground font-semibold truncate max-w-[170px]">{email}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteEmail(email)}
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Schedule Configuration Card */}
            <Card className="border-border hover:shadow-sm transition-all duration-300">
              <CardHeader className="p-5 pb-3">
                <CardTitle className="text-base font-bold">Automation Schedule</CardTitle>
                <CardDescription className="text-xs">Local demo runs are manual; scheduled jobs require deployment configuration</CardDescription>
              </CardHeader>
              <CardContent className="p-5 pt-0 space-y-5">
                <div className="space-y-3">
                  <div className="flex items-start gap-2.5">
                    <Clock className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-foreground">Scraper Scans Interval</p>
                      <p className="text-[10px] text-muted-foreground">Run manually from the Dashboard during the demo.</p>
                      <Badge variant="secondary" className="mt-1 text-[9px] font-bold">
                        Manual trigger
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 border-t border-border/40 pt-4">
                    <Mail className="w-5 h-5 text-indigo-600 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-foreground">Report Dispatches Schedule</p>
                      <p className="text-[10px] text-muted-foreground">Report sending is available when SMTP is configured.</p>
                      <Badge variant="secondary" className="mt-1 text-[9px] font-bold">
                        Deployment dependent
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <Button disabled variant="outline" className="w-full text-xs py-2 h-9">
                    Scheduler configuration is deployment-dependent
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
