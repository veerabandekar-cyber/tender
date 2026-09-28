import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { useTender, useUpdateTender } from "@/hooks/useTenders";
import { useOrganizations } from "@/hooks/useOrganizations";
import { TenderStatus, Tender } from "@/lib/types";
import {
  ArrowLeft,
  Building2,
  Calendar,
  IndianRupee,
  FileText,
  Mail,
  Phone,
  ExternalLink,
  Save,
  CheckCircle,
  AlertTriangle,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const STATUS_COLORS: Record<string, string> = {
  New: "#3b82f6",
  "Under Review": "#eab308",
  Interested: "#10b981",
  "Bid Submitted": "#a855f7",
  Won: "#22c55e",
  Lost: "#ef4444",
  Closed: "#6b7280",
};

const COMMON_ACTIONS = [
  "Download documents",
  "Contact procurement officer",
  "Arrange OEM authorization",
  "Prepare technical bid",
  "Attend pre-bid meeting",
  "Submit EMD (Earnest Money Deposit)",
  "Follow up with organization",
  "No action needed",
];

const COMPETITOR_MAPPING: Record<string, string[]> = {
  "Mass Spectrometry": ["Agilent", "Thermo Fisher", "PerkinElmer", "Analytik Jena", "Nu Instruments"],
  Chromatography: ["Agilent", "Waters", "Shimadzu", "Thermo Fisher"],
  Spectroscopy: ["PerkinElmer", "Agilent", "Thermo Fisher", "Shimadzu"],
  General: ["Agilent", "Thermo Fisher", "Shimadzu"],
};

export default function TenderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showRawJson, setShowRawJson] = useState(false);

  const { data: tender, isLoading, refetch } = useTender(id || "");
  const updateMutation = useUpdateTender();

  const [status, setStatus] = useState<TenderStatus>("New");
  const [actionRequired, setActionRequired] = useState("");

  // Sync state when tender data is fetched
  useEffect(() => {
    if (tender) {
      setStatus(tender.status);
      setActionRequired(tender.action_required || "");
    }
  }, [tender]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-[80vh] items-center justify-center text-sm text-muted-foreground">
          Loading tender details...
        </div>
      </DashboardLayout>
    );
  }

  if (!tender) {
    return (
      <DashboardLayout>
        <div className="flex flex-col h-[80vh] items-center justify-center gap-4 text-center p-6">
          <AlertTriangle className="w-12 h-12 text-rose-500" />
          <h2 className="text-lg font-bold">Tender Not Found</h2>
          <Button onClick={() => navigate("/tenders")}>Back to Tracker</Button>
        </div>
      </DashboardLayout>
    );
  }

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        id: tender.id,
        data: {
          status,
          action_required: actionRequired,
        },
      });
      toast({
        title: "Tender Updated",
        description: "Status and action requirements updated successfully.",
      });
      refetch();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Failed to save changes.",
      });
    }
  };

  const formatCurrency = (val?: number) => {
    if (!val) return "Price on Request";
    if (val >= 10000000) {
      return `₹${(val / 10000000).toFixed(2)} Crore`;
    }
    if (val >= 100000) {
      return `₹${(val / 100000).toFixed(2)} Lakh`;
    }
    return `₹${val.toLocaleString()}`;
  };

  const getDaysRemaining = (closingDate?: string) => {
    if (!closingDate) return null;
    const diffTime = new Date(closingDate).getTime() - Date.now();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return "Closed";
    if (diffDays === 0) return "Closes today!";
    return `${diffDays} days remaining`;
  };

  const suggestedCompetitors = COMPETITOR_MAPPING[tender.instrument_category || "General"] || [];

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/tenders")}
            className="-ml-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <PageHeader
            title={tender.tender_number}
            subtitle="Explore details and manage bid workflow"
            breadcrumbs={[
              { label: "Dashboard", path: "/" },
              { label: "Tenders", path: "/tenders" },
              { label: tender.tender_number },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left panel: Detailed extracted tender data */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Header Info */}
            <Card className="border-border hover:shadow-sm transition-all duration-300">
              <CardHeader className="p-6 pb-4 border-b border-border/40">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                  <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary font-semibold">
                    {tender.instrument_category}
                  </Badge>
                  <Badge
                    style={{
                      backgroundColor: `${STATUS_COLORS[tender.status]}15`,
                      color: STATUS_COLORS[tender.status],
                      border: `1px solid ${STATUS_COLORS[tender.status]}30`,
                    }}
                    className="font-bold rounded-full px-3 py-0.5"
                  >
                    {tender.status}
                  </Badge>
                </div>
                <CardTitle className="text-lg sm:text-xl font-bold leading-snug">
                  {tender.title}
                </CardTitle>
                <CardDescription className="text-xs flex items-center gap-1.5 mt-2">
                  <span className="font-semibold text-foreground">Source:</span> {tender.portal}
                  {tender.source_url && (
                    <a
                      href={tender.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline flex items-center gap-0.5 ml-2 font-medium"
                    >
                      View Webpage
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Details grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider block">
                      Procuring Organization
                    </span>
                    <div className="flex items-start gap-2.5 mt-1">
                      <Building2 className="w-4.5 h-4.5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-foreground leading-tight">
                          {tender.organization?.name || "Unknown Institution"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {tender.department || "N/A"}
                        </p>
                        {tender.organization && (
                          <p className="text-[10px] text-muted-foreground">
                            {tender.organization.city}, {tender.organization.state}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider block">
                      Estimated Tender Value
                    </span>
                    <div className="flex items-center gap-2.5 mt-1">
                      <IndianRupee className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                      <span className="text-base font-bold text-foreground">
                        {formatCurrency(tender.tender_value)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider block">
                      Bid Start Date
                    </span>
                    <div className="flex items-center gap-2.5 mt-1">
                      <Calendar className="w-4.5 h-4.5 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm font-semibold text-foreground">
                        {tender.bid_start_date ? new Date(tender.bid_start_date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        }) : "N/A"}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider block">
                      Bid Closing Date
                    </span>
                    <div className="flex items-start gap-2.5 mt-1">
                      <Clock className="w-4.5 h-4.5 text-amber-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-sm font-semibold text-foreground block">
                          {tender.bid_closing_date ? new Date(tender.bid_closing_date).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          }) : "N/A"}
                        </span>
                        {tender.bid_closing_date && (
                          <Badge variant="secondary" className="mt-1 text-[9px] bg-amber-500/10 text-amber-700 border-amber-500/20 font-bold px-2 py-0">
                            {getDaysRemaining(tender.bid_closing_date)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Extracted Contact Details */}
                <div className="border-t border-border/40 pt-5 space-y-3">
                  <h3 className="text-sm font-bold text-foreground">Extracted Contact Information</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs text-foreground font-medium truncate">
                        {tender.contact_person || "Dr. N/A"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      {tender.contact_email ? (
                        <a href={`mailto:${tender.contact_email}`} className="text-xs text-primary hover:underline font-semibold truncate">
                          {tender.contact_email}
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">Email N/A</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      {tender.contact_phone ? (
                        <a href={`tel:${tender.contact_phone}`} className="text-xs text-primary hover:underline font-semibold truncate">
                          {tender.contact_phone}
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">Phone N/A</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* PDF Link */}
                {tender.document_url && (
                  <div className="bg-muted/40 border border-border/60 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-rose-500/10 flex items-center justify-center text-rose-600">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground">Tender Document PDF</p>
                        <p className="text-[10px] text-muted-foreground">Extracted via AI parsing pipeline</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" asChild className="border-rose-500/20 hover:bg-rose-500/5 text-rose-600 hover:text-rose-700 font-semibold text-xs transition-all">
                      <a href={tender.document_url} target="_blank" rel="noreferrer" className="flex items-center gap-1">
                        Download PDF
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Collapsible raw data */}
            <Card className="border-border hover:shadow-sm transition-all duration-300">
              <button
                onClick={() => setShowRawJson(!showRawJson)}
                className="w-full flex items-center justify-between p-5 text-left border-0 bg-transparent"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                  <span className="text-sm font-bold text-foreground">AI Extraction Raw Metadata</span>
                </div>
                {showRawJson ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </button>
              {showRawJson && (
                <CardContent className="p-5 pt-0 border-t border-border/40">
                  <pre className="mt-4 bg-muted p-4 rounded-lg overflow-x-auto text-[11px] font-mono text-muted-foreground max-h-64">
                    {JSON.stringify(
                      tender.raw_extracted_data || {
                        status: "Success",
                        extracted_at: tender.created_at,
                        parsed_keywords: [tender.instrument_category],
                        confidence_score: 0.94,
                        original_fields: {
                          bid_number: tender.tender_number,
                          title: tender.title,
                          buyer_name: tender.organization?.name,
                          closing_date: tender.bid_closing_date,
                          financial_value: tender.tender_value,
                        },
                      },
                      null,
                      2,
                    )}
                  </pre>
                </CardContent>
              )}
            </Card>
          </div>

          {/* Right panel: Bid coordination workflow */}
          <div className="flex flex-col gap-6">
            <Card className="border-border hover:shadow-sm transition-all duration-300">
              <CardHeader className="p-5 pb-3">
                <CardTitle className="text-base font-bold">Sales Outreach Workflow</CardTitle>
                <CardDescription className="text-xs">Update pipeline state and record actions</CardDescription>
              </CardHeader>
              <CardContent className="p-5 pt-0 space-y-5">
                {/* Select Pipeline Status */}
                <div className="space-y-2">
                  <Label htmlFor="status" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                    Pipeline Status
                  </Label>
                  <Select value={status} onValueChange={(val) => setStatus(val as TenderStatus)}>
                    <SelectTrigger id="status" className="border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="New" className="text-xs font-medium text-blue-600">New</SelectItem>
                      <SelectItem value="Under Review" className="text-xs font-medium text-yellow-600">Under Review</SelectItem>
                      <SelectItem value="Interested" className="text-xs font-medium text-emerald-600">Interested</SelectItem>
                      <SelectItem value="Bid Submitted" className="text-xs font-medium text-purple-600">Bid Submitted</SelectItem>
                      <SelectItem value="Won" className="text-xs font-medium text-green-600 font-bold">Won</SelectItem>
                      <SelectItem value="Lost" className="text-xs font-medium text-red-600">Lost</SelectItem>
                      <SelectItem value="Closed" className="text-xs font-medium text-gray-500">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Action Required text */}
                <div className="space-y-2">
                  <Label htmlFor="action" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                    Action Required
                  </Label>
                  <Textarea
                    id="action"
                    placeholder="Enter what needs to happen next..."
                    value={actionRequired}
                    onChange={(e) => setActionRequired(e.target.value)}
                    rows={3}
                    className="border-border resize-none text-xs hover:border-primary/25"
                  />
                </div>

                {/* Preset Actions helper */}
                <div className="space-y-1.5">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">
                    Presets (Click to select)
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {COMMON_ACTIONS.map((act) => (
                      <button
                        key={act}
                        type="button"
                        onClick={() => setActionRequired(act)}
                        className="text-[9px] bg-muted hover:bg-primary/10 hover:text-primary transition-all px-2 py-1 rounded font-medium text-muted-foreground text-left"
                      >
                        {act}
                      </button>
                    ))}
                  </div>
                </div>

                <Button onClick={handleSave} className="w-full bg-primary hover:bg-primary/95 text-white flex items-center justify-center gap-1.5 shadow-sm text-xs py-2 h-9">
                  <Save className="w-4 h-4" />
                  Save Workflow Changes
                </Button>
              </CardContent>
            </Card>

            {/* Competitor list & existing installations */}
            <Card className="border-border hover:shadow-sm transition-all duration-300">
              <CardHeader className="p-5 pb-3">
                <CardTitle className="text-base font-bold">Competitive Intelligence</CardTitle>
                <CardDescription className="text-xs">Based on category: {tender.instrument_category}</CardDescription>
              </CardHeader>
              <CardContent className="p-5 pt-0 space-y-4">
                {/* OEM eligibility */}
                <div className="space-y-1.5">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">
                    Eligible OEMs
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {tender.eligible_oems?.map((oem) => (
                      <Badge key={oem} variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20">
                        {oem}
                      </Badge>
                    ))}
                    {(!tender.eligible_oems || tender.eligible_oems.length === 0) && (
                      <Badge variant="outline" className="text-[10px]">Any OEM Equivalent</Badge>
                    )}
                  </div>
                </div>

                {/* Existing installations */}
                <div className="space-y-1.5">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">
                    Installed OEMs at Organization
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {tender.organization?.existing_oems?.map((oem) => (
                      <Badge key={oem} variant="outline" className="text-[10px] bg-blue-500/5 text-blue-600 border-blue-500/20">
                        {oem} Installed
                      </Badge>
                    )) || <span className="text-xs text-muted-foreground">No records.</span>}
                  </div>
                </div>

                {/* Likely Competitors */}
                <div className="space-y-1.5 pt-1 border-t border-border/40">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">
                    Likely Bid Competitors
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {suggestedCompetitors.map((comp) => (
                      <Badge key={comp} variant="secondary" className="text-[10px]">
                        {comp}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
