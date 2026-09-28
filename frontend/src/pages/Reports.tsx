import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { reportsApi, tenderApi } from "@/lib/api";
import { Tender } from "@/lib/types";
import {
  FileText,
  FileSpreadsheet,
  Mail,
  Download,
  Send,
  Calendar,
  AlertCircle,
  CheckCircle,
  Settings,
  DollarSign,
  TrendingUp,
  Clock,
  User,
  ListTodo,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export default function Reports() {
  const { toast } = useToast();
  const [reportType, setReportType] = useState<string>("new_tenders");
  const [thresholdValue, setThresholdValue] = useState<number>(10000000); // 1 Cr
  const [targetOem, setTargetOem] = useState<string>("Agilent");
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const handleExportExcel = async () => {
    setIsExportingExcel(true);
    try {
      await reportsApi.exportExcel(reportType);

      toast({
        title: "Excel Export Complete",
        description: "Downloaded active tenders spreadsheet successfully.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: error?.message || "Failed to compile tenders spreadsheet.",
      });
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleSendEmail = async () => {
    setIsSendingEmail(true);
    try {
      const formattedType = reportType.replace("_", " ").toUpperCase();
      const res = await reportsApi.sendEmail(formattedType);
      toast({
        title: "Email Report Sent",
        description: res.message,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Dispatch Failed",
        description: error?.message || "Could not send report email.",
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const getReportName = () => {
    switch (reportType) {
      case "new_tenders":
        return "Daily Discovery Summary (New Tenders)";
      case "high_value":
        return "Strategic High Value Opportunities Report";
      case "closing_soon":
        return "Urgent Timelines Report (Closing Soon)";
      case "oem_opportunities":
        return "OEM Opportunities & Target Account Report";
      default:
        return "Custom Intelligence Report";
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 p-6">
        <PageHeader
          title="Reports"
          subtitle="Compile, export, and dispatch daily analytical instrument tender intelligence reports"
          breadcrumbs={[
            { label: "Dashboard", path: "/" },
            { label: "Reports" },
          ]}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Report Configuration Panel */}
          <Card className="border-border hover:shadow-sm transition-all duration-300">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-base font-bold">Report Parameters</CardTitle>
              <CardDescription className="text-xs">Configure filters, values, and target OEMs</CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0 space-y-5">
              {/* Report Type */}
              <div className="space-y-2">
                <Label htmlFor="report-type" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  Report Category
                </Label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger id="report-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new_tenders" className="text-xs font-medium">New Tenders (Discovered Today)</SelectItem>
                    <SelectItem value="high_value" className="text-xs font-medium">High Value (Above Threshold)</SelectItem>
                    <SelectItem value="closing_soon" className="text-xs font-medium">Closing Soon (Within 7 Days)</SelectItem>
                    <SelectItem value="oem_opportunities" className="text-xs font-medium">OEM Opportunities (Match Vendor)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* High Value threshold (Conditional) */}
              {reportType === "high_value" && (
                <div className="space-y-2 animate-fade-in">
                  <Label htmlFor="value-threshold" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                    Value Threshold (INR)
                  </Label>
                  <Input
                    id="value-threshold"
                    type="number"
                    value={thresholdValue}
                    onChange={(e) => setThresholdValue(Number(e.target.value))}
                    placeholder="e.g. 10000000"
                    className="border-border text-xs hover:border-primary/25"
                  />
                  <p className="text-[10px] text-muted-foreground">Currently: ₹{(thresholdValue / 10000000).toFixed(2)} Cr</p>
                </div>
              )}

              {/* Target OEM (Conditional) */}
              {reportType === "oem_opportunities" && (
                <div className="space-y-2 animate-fade-in">
                  <Label htmlFor="oem-target" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                    Target Vendor / OEM
                  </Label>
                  <Select value={targetOem} onValueChange={setTargetOem}>
                    <SelectTrigger id="oem-target">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Agilent" className="text-xs font-medium">Agilent</SelectItem>
                      <SelectItem value="Thermo Fisher" className="text-xs font-medium">Thermo Fisher</SelectItem>
                      <SelectItem value="PerkinElmer" className="text-xs font-medium">PerkinElmer</SelectItem>
                      <SelectItem value="Waters" className="text-xs font-medium">Waters</SelectItem>
                      <SelectItem value="Shimadzu" className="text-xs font-medium">Shimadzu</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex flex-col gap-2 pt-2">
                <Button
                  onClick={handleExportExcel}
                  disabled={isExportingExcel}
                  className="w-full bg-primary hover:bg-primary/95 text-white flex items-center justify-center gap-1.5 shadow-sm text-xs py-2 h-9"
                >
                  {isExportingExcel ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Compiling Excel Spreadsheet...
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="w-4 h-4" />
                      Download Excel (.xlsx)
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleSendEmail}
                  disabled={isSendingEmail}
                  variant="outline"
                  className="w-full border-primary/20 hover:bg-primary/5 hover:text-primary flex items-center justify-center gap-1.5 text-xs py-2 h-9 transition-all"
                >
                  {isSendingEmail ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Dispatching email report...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      Send Report via Email
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Pre-formatted Report Preview */}
          <Card className="lg:col-span-2 border-border hover:shadow-sm transition-all duration-300">
            <CardHeader className="p-5 pb-3 border-b border-border/40">
              <div className="flex justify-between items-center">
                <CardTitle className="text-base font-bold">Report Preview</CardTitle>
                <Badge variant="outline" className="bg-primary/5 text-primary text-[10px] font-bold border-primary/10">
                  Ready to Dispatch
                </Badge>
              </div>
              <CardDescription className="text-xs">HTML email template rendering parameters</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="bg-muted/30 border border-border/80 rounded-xl p-5 font-sans space-y-4 text-xs leading-relaxed max-h-[400px] overflow-y-auto">
                <div className="border-b border-border/40 pb-4">
                  <h1 className="text-sm font-bold text-primary">{getReportName()}</h1>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Analytica Soft-Tech Tender Intelligence Center</p>
                  <p className="text-[10px] text-muted-foreground">Generated at: {new Date().toLocaleString()}</p>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-foreground">Dear Sales Team,</p>
                  <p className="text-[11px] text-muted-foreground">
                    Please find below the list of analytical instrument tenders matching the configured parameters.
                  </p>
                </div>

                {/* Simulated Table */}
                <div className="border border-border/60 rounded bg-card p-3 space-y-3">
                  <div className="flex justify-between text-[10px] font-bold text-muted-foreground border-b border-border/40 pb-1.5">
                    <span>Tender ID / Org</span>
                    <span>Value / Closing</span>
                  </div>

                  {reportType === "new_tenders" ? (
                    <div className="text-center py-6 text-muted-foreground text-[10px]">
                      No new tenders discovered in the last 12 hours. Run daily search to sync.
                    </div>
                  ) : reportType === "high_value" ? (
                    <div className="space-y-2">
                      <div className="flex justify-between border-b border-border/20 pb-2 last:border-0 last:pb-0">
                        <div>
                          <p className="font-bold text-primary">GEM/2026/B/7264819</p>
                          <p className="text-[10px] text-muted-foreground">Bhabha Atomic Research Centre (BARC)</p>
                          <p className="text-[9px] text-muted-foreground">High-Resolution ICP-MS System</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-foreground">₹2.20 Crore</p>
                          <p className="text-[9px] text-muted-foreground">Closes: 15-Jul-2026</p>
                        </div>
                      </div>
                      <div className="flex justify-between border-b border-border/20 pb-2 last:border-0 last:pb-0">
                        <div>
                          <p className="font-bold text-primary">IGC/CHEM/2026/1849</p>
                          <p className="text-[10px] text-muted-foreground">Indira Gandhi Centre for Atomic Research (IGCAR)</p>
                          <p className="text-[9px] text-muted-foreground">Triple Quadrupole LC-MS/MS</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-foreground">₹1.85 Crore</p>
                          <p className="text-[9px] text-muted-foreground">Closes: 30-Jun-2026</p>
                        </div>
                      </div>
                    </div>
                  ) : reportType === "closing_soon" ? (
                    <div className="space-y-2">
                      <div className="flex justify-between border-b border-border/20 pb-2 last:border-0 last:pb-0">
                        <div>
                          <p className="font-bold text-primary">IGC/CHEM/2026/1849</p>
                          <p className="text-[10px] text-muted-foreground">Indira Gandhi Centre for Atomic Research (IGCAR)</p>
                          <p className="text-[9px] text-muted-foreground">Triple Quadrupole LC-MS/MS</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-red-600 font-semibold bg-red-500/5 px-2 py-0.5 rounded border border-red-500/10">Closes in 4 days</p>
                          <p className="text-[9px] text-muted-foreground">Closes: 30-Jun-2026</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex justify-between border-b border-border/20 pb-2 last:border-0 last:pb-0">
                        <div>
                          <p className="font-bold text-primary">GEM/2026/B/7264819</p>
                          <p className="text-[10px] text-muted-foreground">Bhabha Atomic Research Centre (BARC)</p>
                          <p className="text-[9px] text-muted-foreground">Matches: {targetOem}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-foreground">₹2.20 Crore</p>
                          <p className="text-[9px] text-muted-foreground">Closes: 15-Jul-2026</p>
                        </div>
                      </div>
                      <div className="flex justify-between border-b border-border/20 pb-2 last:border-0 last:pb-0">
                        <div>
                          <p className="font-bold text-primary">RRCAT/MRSD/2026/04</p>
                          <p className="text-[10px] text-muted-foreground">Raja Ramanna Centre for Advanced Technology (RRCAT)</p>
                          <p className="text-[9px] text-muted-foreground">Matches: {targetOem}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-foreground">₹42.00 Lakh</p>
                          <p className="text-[9px] text-muted-foreground">Closes: 10-Jul-2026</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-border/40 pt-4 flex justify-between items-center text-[9px] text-muted-foreground">
                  <span>To change email recipients, go to Settings.</span>
                  <a href="#settings" className="text-primary hover:underline font-semibold flex items-center gap-0.5">
                    Settings Link
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
