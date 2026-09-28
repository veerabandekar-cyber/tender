import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  useTenders,
  useUpdateTenderStatus,
  useCreateTender,
} from "@/hooks/useTenders";
import { discoveryApi } from "@/lib/api";
import { getStoredUser } from "@/lib/auth";
import { useOrganizations } from "@/hooks/useOrganizations";
import { Tender, TenderStatus } from "@/lib/types";
import {
  Search,
  Download,
  Plus,
  FileSpreadsheet,
  AlertTriangle,
  Loader2,
  Star,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
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

const PAGE_SIZE = 50;

const EMPTY_TENDER = {
  tender_number: "",
  title: "",
  organization_id: "",
  department: "",
  instrument_category: "Mass Spectrometry",
  portal: "GeM",
  tender_value: 0,
  bid_start_date: new Date().toISOString().split("T")[0],
  bid_closing_date: "",
  contact_person: "",
  contact_email: "",
  contact_phone: "",
  eligible_oems: [] as string[],
  existing_oem: "",
  likely_competitors: [] as string[],
  status: "New" as TenderStatus,
  action_required: "",
  source_url: "",
};

export default function TenderTracker() {
  const navigate = useNavigate();
  const { toast } = useToast();

  /* ---------------------------------------------------------
   * FILTERS / SEARCH
   * --------------------------------------------------------- */

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [orgFilter, setOrgFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<string>("relevance");
  const [sortOrder, setSortOrder] =
    useState<"asc" | "desc">("desc");
  const [keywordFilter, setKeywordFilter] =
    useState<string>("all");
  const [viewFilter, setViewFilter] =
    useState<"all" | "shortlisted">("all");

  const [keywords, setKeywords] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);

  const storageKey = `asttc-shortlisted-tenders:${
    getStoredUser()?.email || "demo"
  }`;

  /* ---------------------------------------------------------
   * NEW TENDER FORM
   * --------------------------------------------------------- */

  const [newTender, setNewTender] = useState({
    ...EMPTY_TENDER,
  });

  /* ---------------------------------------------------------
   * LOAD SHORTLIST + KEYWORDS
   * --------------------------------------------------------- */

  useEffect(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem(storageKey) || "[]"
      );

      if (Array.isArray(saved)) {
        setFavorites(saved);
      } else {
        setFavorites([]);
      }
    } catch {
      setFavorites([]);
    }

    discoveryApi
      .getKeywords()
      .then((items) => {
        setKeywords(
          items
            .filter((k) => k.is_active)
            .map((k) => k.keyword)
        );
      })
      .catch(() => {
        setKeywords([]);
      });
  }, [storageKey]);

  /* ---------------------------------------------------------
   * RESET PAGINATION WHEN FILTERS CHANGE
   * --------------------------------------------------------- */

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    statusFilter,
    orgFilter,
    keywordFilter,
    viewFilter,
  ]);

  /* ---------------------------------------------------------
   * SHORTLIST
   * --------------------------------------------------------- */

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id];

      try {
        localStorage.setItem(
          storageKey,
          JSON.stringify(next)
        );
      } catch {
        // Ignore localStorage failures.
      }

      return next;
    });
  };

  /* ---------------------------------------------------------
   * FETCH TENDERS
   *
   * IMPORTANT:
   * There should only be ONE useTenders call here.
   * --------------------------------------------------------- */

  const effectiveSearch = useMemo(() => {
    const parts: string[] = [];
    const term = searchTerm.trim();
    if (term) {
      parts.push(term);
    }
    if (keywordFilter && keywordFilter !== "all") {
      if (!term.toLowerCase().includes(keywordFilter.toLowerCase())) {
        parts.push(keywordFilter);
      }
    }
    return parts.length > 0 ? parts.join(" ") : undefined;
  }, [searchTerm, keywordFilter]);

  const {
    data: tendersData,
    isLoading: tendersLoading,
    isFetching: tendersFetching,
    refetch,
  } = useTenders(
    {
      search: effectiveSearch,
      status:
        statusFilter !== "all"
          ? (statusFilter as TenderStatus)
          : undefined,

      organization_id:
        orgFilter !== "all"
          ? orgFilter
          : undefined,

      sort_by:
        sortField === "relevance"
          ? "created_at"
          : sortField,
      sort_order: sortOrder,
    },
    currentPage,
    PAGE_SIZE
  );

  const { data: orgs } = useOrganizations();

  const updateStatusMutation =
    useUpdateTenderStatus();

  const createTenderMutation =
    useCreateTender();

  /* ---------------------------------------------------------
   * PAGINATION
   * --------------------------------------------------------- */

  const totalTenders = tendersData?.total || 0;

  const totalPages = Math.max(
    1,
    Math.ceil(totalTenders / PAGE_SIZE)
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  /* ---------------------------------------------------------
   * STATUS UPDATE
   * --------------------------------------------------------- */

  const handleStatusChange = async (
    id: string,
    newStatus: TenderStatus
  ) => {
    try {
      await updateStatusMutation.mutateAsync({
        id,
        status: newStatus,
      });

      toast({
        title: "Status Updated",
        description: `Tender status changed to ${newStatus}`,
      });

      refetch();
    } catch {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description:
          "Failed to update tender status.",
      });
    }
  };

  /* ---------------------------------------------------------
   * CREATE MANUAL TENDER
   * --------------------------------------------------------- */

  const handleCreateTender = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (
      !newTender.tender_number.trim() ||
      !newTender.title.trim() ||
      !newTender.organization_id
    ) {
      toast({
        variant: "destructive",
        title: "Required Fields Missing",
        description:
          "Please fill in Tender Number, Title, and Organization.",
      });

      return;
    }

    if (!newTender.bid_closing_date) {
      toast({
        variant: "destructive",
        title: "Closing Date Required",
        description:
          "Please provide the tender closing date.",
      });

      return;
    }

    try {
      await createTenderMutation.mutateAsync(
        newTender
      );

      toast({
        title: "Tender Discovered",
        description:
          "Manual tender successfully logged into the database.",
      });

      setIsAddOpen(false);

      setCurrentPage(1);

      await refetch();

      setNewTender({
        ...EMPTY_TENDER,
        bid_start_date: new Date()
          .toISOString()
          .split("T")[0],
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Submission Error",
        description:
          error?.message ||
          "Failed to create tender.",
      });
    }
  };

  /* ---------------------------------------------------------
   * CLIENT-SIDE FILTERING (Shortlist View)
   *
   * Server handles:
   * - text search
   * - keyword filter
   * - status
   * - organization
   * - sorting & pagination
   *
   * Browser handles:
   * - shortlist/favorites filter
   * --------------------------------------------------------- */

  const filteredTenders = useMemo(() => {
    return (tendersData?.items || []).filter((tender) => {
      const matchesView =
        viewFilter === "all" || favorites.includes(tender.id);
      return matchesView;
    });
  }, [tendersData?.items, viewFilter, favorites]);

  /* ---------------------------------------------------------
   * KEYWORD RELEVANCE
   * --------------------------------------------------------- */

  const keywordScore = (tender: Tender) => {
    const haystack = [
      tender.title,
      tender.department,
      tender.instrument_category,
      tender.organization?.name,
      tender.raw_extracted_data
        ? JSON.stringify(
            tender.raw_extracted_data
          )
        : "",
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return keywords.reduce(
      (score, kw) =>
        score +
        (haystack.includes(
          kw.toLowerCase()
        )
          ? 1
          : 0),
      0
    );
  };

  /* ---------------------------------------------------------
   * SORTING
   * --------------------------------------------------------- */

  const sortedTenders = useMemo(() => {
    const result = [...filteredTenders];

    result.sort((a, b) => {
      if (sortField === "relevance") {
        const diff =
          keywordScore(b) -
          keywordScore(a);

        if (diff !== 0) {
          return diff;
        }

        return (
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
        );
      }

      let aVal: any =
        a[sortField as keyof Tender] ?? "";

      let bVal: any =
        b[sortField as keyof Tender] ?? "";

      if (
        sortField === "bid_closing_date"
      ) {
        aVal = a.bid_closing_date
          ? new Date(
              a.bid_closing_date
            ).getTime()
          : Number.MAX_SAFE_INTEGER;

        bVal = b.bid_closing_date
          ? new Date(
              b.bid_closing_date
            ).getTime()
          : Number.MAX_SAFE_INTEGER;
      }

      if (sortField === "tender_value") {
        aVal = a.tender_value || 0;
        bVal = b.tender_value || 0;
      }

      if (sortField === "organization") {
        aVal =
          a.organization?.name || "";
        bVal =
          b.organization?.name || "";
      }

      if (sortField === "created_at") {
        aVal = a.created_at
          ? new Date(
              a.created_at
            ).getTime()
          : 0;

        bVal = b.created_at
          ? new Date(
              b.created_at
            ).getTime()
          : 0;
      }

      if (
        typeof aVal === "string" &&
        typeof bVal === "string"
      ) {
        const comparison =
          aVal.localeCompare(
            bVal,
            undefined,
            {
              sensitivity: "base",
            }
          );

        return sortOrder === "asc"
          ? comparison
          : -comparison;
      }

      if (sortOrder === "asc") {
        return aVal > bVal
          ? 1
          : aVal < bVal
          ? -1
          : 0;
      }

      return aVal < bVal
        ? 1
        : aVal > bVal
        ? -1
        : 0;
    });

    return result;
  }, [
    filteredTenders,
    sortField,
    sortOrder,
    keywords,
  ]);

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder((prev) =>
        prev === "asc" ? "desc" : "asc"
      );
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  /* ---------------------------------------------------------
   * PAGINATION NAVIGATION
   * --------------------------------------------------------- */

  const goToPage = (page: number) => {
    const safePage = Math.min(
      Math.max(page, 1),
      totalPages
    );

    setCurrentPage(safePage);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  /* ---------------------------------------------------------
   * URGENCY
   * --------------------------------------------------------- */

  const getUrgencyClass = (
    closingDate?: string
  ) => {
    if (!closingDate) return "";

    const diffDays = Math.ceil(
      (new Date(closingDate).getTime() -
        Date.now()) /
        (1000 * 60 * 60 * 24)
    );

    if (diffDays < 0) {
      return "text-muted-foreground line-through";
    }

    if (diffDays <= 3) {
      return "text-red-600 font-bold bg-red-50 dark:bg-red-950/20 px-2 py-1 rounded";
    }

    if (diffDays <= 7) {
      return "text-amber-600 font-semibold bg-amber-50 dark:bg-amber-950/20 px-2 py-1 rounded";
    }

    return "";
  };

  const getUrgencyIcon = (
    closingDate?: string
  ) => {
    if (!closingDate) return null;

    const diffDays = Math.ceil(
      (new Date(closingDate).getTime() -
        Date.now()) /
        (1000 * 60 * 60 * 24)
    );

    if (
      diffDays >= 0 &&
      diffDays <= 3
    ) {
      return (
        <AlertTriangle className="w-3.5 h-3.5 inline mr-1 text-red-500 animate-pulse" />
      );
    }

    return null;
  };

  /* ---------------------------------------------------------
   * CSV EXPORT
   * --------------------------------------------------------- */

  const exportToExcel = () => {
    if (
      !sortedTenders ||
      sortedTenders.length === 0
    ) {
      toast({
        variant: "destructive",
        title: "Nothing to export",
        description:
          "There are no tenders on the current page.",
      });

      return;
    }

    const headers = [
      "Tender Number",
      "Title",
      "Organization",
      "Department",
      "Instrument Category",
      "Portal",
      "Value (INR)",
      "Bid Closing Date",
      "Status",
      "Action Required",
      "Source URL",
    ];

    const rows = sortedTenders.map(
      (tender) => [
        tender.tender_number,
        tender.title,
        tender.organization?.name || "",
        tender.department || "",
        tender.instrument_category || "",
        tender.portal || "",
        tender.tender_value || 0,
        tender.bid_closing_date || "",
        tender.status,
        tender.action_required || "",
        tender.source_url || "",
      ]
    );

    const csvContent =
      "\uFEFF" +
      [
        headers,
        ...rows,
      ]
        .map((row) =>
          row
            .map(
              (value) =>
                `"${String(
                  value ?? ""
                ).replace(
                  /"/g,
                  '""'
                )}"`
            )
            .join(",")
        )
        .join("\n");

    const blob = new Blob(
      [csvContent],
      {
        type: "text/csv;charset=utf-8;",
      }
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;

    link.download = `asttc_tenders_tracker_${
      new Date()
        .toISOString()
        .split("T")[0]
    }.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    toast({
      title: "Export Successful",
      description:
        "Current tender page exported as CSV.",
    });
  };

  /* ---------------------------------------------------------
   * FORMATTING
   * --------------------------------------------------------- */

  const formatCurrency = (
    val?: number
  ) => {
    if (val == null || val === 0) {
      return "Not published";
    }

    if (val >= 10000000) {
      return `₹${(
        val / 10000000
      ).toFixed(2)} Cr`;
    }

    if (val >= 100000) {
      return `₹${(
        val / 100000
      ).toFixed(2)} L`;
    }

    return `₹${val.toLocaleString(
      "en-IN"
    )}`;
  };

  /* ---------------------------------------------------------
   * DISPLAY COUNTS
   * --------------------------------------------------------- */

  const firstTenderNumber =
    totalTenders === 0
      ? 0
      : (currentPage - 1) *
          PAGE_SIZE +
        1;

  const lastTenderNumber = Math.min(
    currentPage * PAGE_SIZE,
    totalTenders
  );

  /* ---------------------------------------------------------
   * RENDER
   * --------------------------------------------------------- */

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 p-6">
        <PageHeader
          title="Tender Tracker"
          subtitle="Track, filter, and manage all active analytical instrument procurement tenders"
          breadcrumbs={[
            {
              label: "Dashboard",
              path: "/",
            },
            {
              label: "Tender Tracker",
            },
          ]}
          actions={
            <div className="flex gap-2">
              <Button
                onClick={exportToExcel}
                variant="outline"
                size="sm"
                className="border-primary/20 hover:bg-primary/5 text-xs text-foreground flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </Button>

              <Dialog
                open={isAddOpen}
                onOpenChange={setIsAddOpen}
              >
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    className="bg-primary hover:bg-primary/95 text-white text-xs flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add Manual Tender
                  </Button>
                </DialogTrigger>

                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <form
                    onSubmit={
                      handleCreateTender
                    }
                  >
                    <DialogHeader>
                      <DialogTitle>
                        Add Manual Tender
                      </DialogTitle>

                      <DialogDescription>
                        Manually log an instrument
                        procurement opportunity
                        into the database.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label
                            htmlFor="tender_number"
                            className="text-xs font-semibold"
                          >
                            Tender Number *
                          </Label>

                          <Input
                            id="tender_number"
                            placeholder="e.g. GEM/2026/B/12345"
                            value={
                              newTender.tender_number
                            }
                            onChange={(e) =>
                              setNewTender(
                                {
                                  ...newTender,
                                  tender_number:
                                    e.target.value,
                                }
                              )
                            }
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label
                            htmlFor="instrument_category"
                            className="text-xs font-semibold"
                          >
                            Instrument Category
                          </Label>

                          <Select
                            value={
                              newTender.instrument_category
                            }
                            onValueChange={(
                              value
                            ) =>
                              setNewTender(
                                {
                                  ...newTender,
                                  instrument_category:
                                    value,
                                }
                              )
                            }
                          >
                            <SelectTrigger id="instrument_category">
                              <SelectValue placeholder="Select Category" />
                            </SelectTrigger>

                            <SelectContent>
                              <SelectItem value="Mass Spectrometry">
                                Mass Spectrometry
                              </SelectItem>

                              <SelectItem value="Chromatography">
                                Chromatography
                              </SelectItem>

                              <SelectItem value="Spectroscopy">
                                Spectroscopy
                              </SelectItem>

                              <SelectItem value="General">
                                General / Analytical
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="title"
                          className="text-xs font-semibold"
                        >
                          Tender Title *
                        </Label>

                        <Input
                          id="title"
                          placeholder="e.g. Supply and Commissioning of ICP-MS System"
                          value={
                            newTender.title
                          }
                          onChange={(e) =>
                            setNewTender(
                              {
                                ...newTender,
                                title:
                                  e.target.value,
                              }
                            )
                          }
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label
                            htmlFor="organization"
                            className="text-xs font-semibold"
                          >
                            Organization / Institution *
                          </Label>

                          <Select
                            value={
                              newTender.organization_id
                            }
                            onValueChange={(
                              value
                            ) =>
                              setNewTender(
                                {
                                  ...newTender,
                                  organization_id:
                                    value,
                                }
                              )
                            }
                          >
                            <SelectTrigger id="organization">
                              <SelectValue placeholder="Select Organization" />
                            </SelectTrigger>

                            <SelectContent>
                              {orgs?.map(
                                (org) => (
                                  <SelectItem
                                    key={org.id}
                                    value={
                                      org.id
                                    }
                                  >
                                    {org.name}
                                  </SelectItem>
                                )
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label
                            htmlFor="department"
                            className="text-xs font-semibold"
                          >
                            Department / Lab
                          </Label>

                          <Input
                            id="department"
                            placeholder="e.g. Chemistry Division"
                            value={
                              newTender.department
                            }
                            onChange={(e) =>
                              setNewTender(
                                {
                                  ...newTender,
                                  department:
                                    e.target.value,
                                }
                              )
                            }
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label
                            htmlFor="tender_value"
                            className="text-xs font-semibold"
                          >
                            Tender Value (INR)
                          </Label>

                          <Input
                            id="tender_value"
                            type="number"
                            min="0"
                            placeholder="e.g. 15000000"
                            value={
                              newTender.tender_value ||
                              ""
                            }
                            onChange={(e) =>
                              setNewTender(
                                {
                                  ...newTender,
                                  tender_value:
                                    Number(
                                      e.target
                                        .value
                                    ) || 0,
                                }
                              )
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <Label
                            htmlFor="portal"
                            className="text-xs font-semibold"
                          >
                            Portal Source
                          </Label>

                          <Select
                            value={
                              newTender.portal
                            }
                            onValueChange={(
                              value
                            ) =>
                              setNewTender(
                                {
                                  ...newTender,
                                  portal:
                                    value,
                                }
                              )
                            }
                          >
                            <SelectTrigger id="portal">
                              <SelectValue placeholder="Select Portal" />
                            </SelectTrigger>

                            <SelectContent>
                              <SelectItem value="GeM">
                                GeM
                              </SelectItem>

                              <SelectItem value="CPPP">
                                CPPP
                              </SelectItem>

                              <SelectItem value="DAE Portal">
                                DAE Portal
                              </SelectItem>

                              <SelectItem value="IIT Portal">
                                IIT Portal
                              </SelectItem>

                              <SelectItem value="IISc Portal">
                                IISc Portal
                              </SelectItem>

                              <SelectItem value="Manual">
                                Manual Entry
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label
                            htmlFor="bid_closing_date"
                            className="text-xs font-semibold"
                          >
                            Closing Date *
                          </Label>

                          <Input
                            id="bid_closing_date"
                            type="date"
                            value={
                              newTender.bid_closing_date
                            }
                            onChange={(e) =>
                              setNewTender(
                                {
                                  ...newTender,
                                  bid_closing_date:
                                    e.target
                                      .value,
                                }
                              )
                            }
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label
                            htmlFor="contact_person"
                            className="text-xs font-semibold"
                          >
                            Contact Person
                          </Label>

                          <Input
                            id="contact_person"
                            placeholder="Dr. John Doe"
                            value={
                              newTender.contact_person
                            }
                            onChange={(e) =>
                              setNewTender(
                                {
                                  ...newTender,
                                  contact_person:
                                    e.target
                                      .value,
                                }
                              )
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <Label
                            htmlFor="contact_email"
                            className="text-xs font-semibold"
                          >
                            Contact Email
                          </Label>

                          <Input
                            id="contact_email"
                            type="email"
                            placeholder="john@barc.gov.in"
                            value={
                              newTender.contact_email
                            }
                            onChange={(e) =>
                              setNewTender(
                                {
                                  ...newTender,
                                  contact_email:
                                    e.target
                                      .value,
                                }
                              )
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <Label
                            htmlFor="contact_phone"
                            className="text-xs font-semibold"
                          >
                            Contact Phone
                          </Label>

                          <Input
                            id="contact_phone"
                            placeholder="+91-22-2559xxxx"
                            value={
                              newTender.contact_phone
                            }
                            onChange={(e) =>
                              setNewTender(
                                {
                                  ...newTender,
                                  contact_phone:
                                    e.target
                                      .value,
                                }
                              )
                            }
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="action_required"
                          className="text-xs font-semibold"
                        >
                          Action Required
                        </Label>

                        <Input
                          id="action_required"
                          placeholder="e.g. Download documents, submit EMD..."
                          value={
                            newTender.action_required
                          }
                          onChange={(e) =>
                            setNewTender(
                              {
                                ...newTender,
                                action_required:
                                  e.target
                                    .value,
                              }
                            )
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="source_url"
                          className="text-xs font-semibold"
                        >
                          Official Source URL
                        </Label>

                        <Input
                          id="source_url"
                          type="url"
                          placeholder="https://..."
                          value={
                            newTender.source_url
                          }
                          onChange={(e) =>
                            setNewTender(
                              {
                                ...newTender,
                                source_url:
                                  e.target
                                    .value,
                              }
                            )
                          }
                        />
                      </div>
                    </div>

                    <DialogFooter>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() =>
                          setIsAddOpen(false)
                        }
                      >
                        Cancel
                      </Button>

                      <Button
                        type="submit"
                        disabled={
                          createTenderMutation.isPending
                        }
                        className="bg-primary hover:bg-primary/95 text-white"
                      >
                        {createTenderMutation.isPending && (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        )}
                        Create Tender
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          }
        />

        {/* ---------------------------------------------------
            FILTERS
        --------------------------------------------------- */}

        <div className="flex flex-col gap-3 bg-card border border-border/80 rounded-xl p-4 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-3 items-center">
            <div className="relative w-full lg:flex-1">
              <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />

              <Input
                placeholder="Search tender title, reference, organization, instrument or keyword..."
                className="pl-10 border-border/60"
                value={searchTerm}
                onChange={(e) =>
                  setSearchTerm(e.target.value)
                }
              />
            </div>

            <Button
              variant={
                viewFilter === "shortlisted"
                  ? "default"
                  : "outline"
              }
              size="sm"
              onClick={() =>
                setViewFilter(
                  viewFilter === "all"
                    ? "shortlisted"
                    : "all"
                )
              }
              className="w-full lg:w-auto gap-1.5"
            >
              <Star
                className={`w-4 h-4 ${
                  viewFilter ===
                  "shortlisted"
                    ? "fill-current"
                    : ""
                }`}
              />

              Shortlist ({favorites.length})
            </Button>
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <Select
              value={keywordFilter}
              onValueChange={
                setKeywordFilter
              }
            >
              <SelectTrigger className="w-[210px] border-border/60">
                <SelectValue placeholder="Keyword relevance" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="all">
                  All keywords
                </SelectItem>

                {keywords.map(
                  (keyword) => (
                    <SelectItem
                      key={keyword}
                      value={keyword}
                    >
                      {keyword}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>

            <Select
              value={sortField}
              onValueChange={(value) => {
                setSortField(value);

                if (
                  value === "relevance"
                ) {
                  setSortOrder("desc");
                }
              }}
            >
              <SelectTrigger className="w-[190px] border-border/60">
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="relevance">
                  Most relevant
                </SelectItem>

                <SelectItem value="bid_closing_date">
                  Closing soon
                </SelectItem>

                <SelectItem value="created_at">
                  Newest discovered
                </SelectItem>

                <SelectItem value="organization">
                  Organization
                </SelectItem>

                <SelectItem value="tender_value">
                  Published value
                </SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={statusFilter}
              onValueChange={
                setStatusFilter
              }
            >
              <SelectTrigger className="w-[150px] border-border/60">
                <SelectValue placeholder="All status" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="all">
                  All Status
                </SelectItem>

                <SelectItem value="New">
                  New
                </SelectItem>

                <SelectItem value="Under Review">
                  Under Review
                </SelectItem>

                <SelectItem value="Interested">
                  Interested
                </SelectItem>

                <SelectItem value="Bid Submitted">
                  Bid Submitted
                </SelectItem>

                <SelectItem value="Won">
                  Won
                </SelectItem>

                <SelectItem value="Lost">
                  Lost
                </SelectItem>

                <SelectItem value="Closed">
                  Closed
                </SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={orgFilter}
              onValueChange={setOrgFilter}
            >
              <SelectTrigger className="w-[190px] border-border/60">
                <SelectValue placeholder="All organizations" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="all">
                  All Organizations
                </SelectItem>

                {orgs?.map(
                  (org) => (
                    <SelectItem
                      key={org.id}
                      value={org.id}
                    >
                      {org.name}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>

            <div className="ml-auto text-xs text-muted-foreground">
              Showing{" "}
              <span className="font-semibold text-foreground">
                {firstTenderNumber}-
                {lastTenderNumber}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-foreground">
                {totalTenders.toLocaleString()}
              </span>{" "}
              discovered tenders

              {tendersFetching &&
                !tendersLoading && (
                  <Loader2 className="inline ml-2 w-3 h-3 animate-spin" />
                )}
            </div>
          </div>

          {keywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {keywords
                .slice(0, 10)
                .map((keyword) => (
                  <button
                    type="button"
                    key={keyword}
                    onClick={() =>
                      setKeywordFilter((prev) =>
                        prev === keyword ? "all" : keyword
                      )
                    }
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                      keywordFilter ===
                      keyword
                        ? "bg-primary text-white border-primary"
                        : "bg-muted/30 hover:bg-muted"
                    }`}
                  >
                    {keyword}
                  </button>
                ))}
            </div>
          )}
        </div>

        {/* ---------------------------------------------------
            TABLE
        --------------------------------------------------- */}

        <Card className="border-border hover:shadow-sm transition-all duration-300">
          <CardContent className="p-0">
            {tendersLoading ? (
              <div className="flex flex-col py-24 items-center gap-3 justify-center text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />

                <span className="text-sm">
                  Fetching tenders data...
                </span>
              </div>
            ) : sortedTenders.length ===
              0 ? (
              <div className="flex flex-col py-24 items-center justify-center text-center p-6 gap-2">
                <FileSpreadsheet className="w-12 h-12 text-muted-foreground/60 animate-bounce" />

                <h3 className="text-base font-bold text-foreground">
                  No Tenders Found
                </h3>

                <p className="text-xs text-muted-foreground max-w-sm">
                  Adjust your search keyword
                  configuration, clear filters,
                  or trigger a manual discovery
                  search.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[42px] text-xs font-semibold">
                        Shortlist
                      </TableHead>

                      <TableHead className="text-xs font-semibold">
                        Tender Title
                      </TableHead>

                      <TableHead
                        onClick={() =>
                          toggleSort(
                            "tender_number"
                          )
                        }
                        className="cursor-pointer select-none text-xs font-semibold"
                      >
                        Reference{" "}
                        {sortField ===
                        "tender_number"
                          ? sortOrder ===
                            "asc"
                            ? "▲"
                            : "▼"
                          : ""}
                      </TableHead>

                      <TableHead
                        onClick={() =>
                          toggleSort(
                            "organization"
                          )
                        }
                        className="cursor-pointer select-none text-xs font-semibold"
                      >
                        Organization{" "}
                        {sortField ===
                        "organization"
                          ? sortOrder ===
                            "asc"
                            ? "▲"
                            : "▼"
                          : ""}
                      </TableHead>

                      <TableHead className="text-xs font-semibold">
                        Instrument Category
                      </TableHead>

                      <TableHead
                        onClick={() =>
                          toggleSort(
                            "tender_value"
                          )
                        }
                        className="cursor-pointer select-none text-xs font-semibold"
                      >
                        Value (INR){" "}
                        {sortField ===
                        "tender_value"
                          ? sortOrder ===
                            "asc"
                            ? "▲"
                            : "▼"
                          : ""}
                      </TableHead>

                      <TableHead
                        onClick={() =>
                          toggleSort(
                            "bid_closing_date"
                          )
                        }
                        className="cursor-pointer select-none text-xs font-semibold"
                      >
                        Closing Date{" "}
                        {sortField ===
                        "bid_closing_date"
                          ? sortOrder ===
                            "asc"
                            ? "▲"
                            : "▼"
                          : ""}
                      </TableHead>

                      <TableHead className="text-xs font-semibold">
                        Existing OEM
                      </TableHead>

                      <TableHead className="text-xs font-semibold">
                        Likely Competitors
                      </TableHead>

                      <TableHead className="text-xs font-semibold">
                        Tender Status
                      </TableHead>

                      <TableHead className="text-xs font-semibold">
                        Action Required
                      </TableHead>

                      <TableHead className="text-xs font-semibold">
                        Official Source
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {sortedTenders.map(
                      (tender) => {
                        const score =
                          keywordScore(
                            tender
                          );

                        const statusColor =
                          STATUS_COLORS[
                            tender.status
                          ] ||
                          "#6b7280";

                        return (
                          <TableRow
                            key={
                              tender.id
                            }
                            className="hover:bg-muted/30 align-top"
                          >
                            {/* SHORTLIST */}
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                title={
                                  favorites.includes(
                                    tender.id
                                  )
                                    ? "Remove from shortlist"
                                    : "Add to shortlist"
                                }
                                onClick={() =>
                                  toggleFavorite(
                                    tender.id
                                  )
                                }
                              >
                                <Star
                                  className={`w-4 h-4 ${
                                    favorites.includes(
                                      tender.id
                                    )
                                      ? "fill-amber-400 text-amber-500"
                                      : "text-muted-foreground"
                                  }`}
                                />
                              </Button>
                            </TableCell>

                            {/* TITLE */}
                            <TableCell className="min-w-[280px] max-w-[430px]">
                              <button
                                type="button"
                                onClick={() =>
                                  navigate(
                                    `/tenders/${tender.id}`
                                  )
                                }
                                className="text-left group"
                              >
                                <div className="font-semibold text-sm leading-snug text-foreground group-hover:text-primary">
                                  {tender.title ||
                                    "Tender title not published"}
                                </div>

                                <div className="mt-1 flex flex-wrap gap-1.5 items-center">
                                  <Badge
                                    variant="outline"
                                    className="text-[9px] px-1.5 py-0"
                                  >
                                    {tender.portal ||
                                      "Official portal"}
                                  </Badge>

                                  {score >
                                    0 && (
                                    <Badge className="text-[9px] px-1.5 py-0 bg-primary/10 text-primary hover:bg-primary/10">
                                      {
                                        score
                                      }{" "}
                                      keyword match
                                      {score >
                                      1
                                        ? "es"
                                        : ""}
                                    </Badge>
                                  )}
                                </div>
                              </button>
                            </TableCell>

                            {/* REFERENCE */}
                            <TableCell
                              onClick={() =>
                                navigate(
                                  `/tenders/${tender.id}`
                                )
                              }
                              className="font-medium text-xs text-primary hover:underline cursor-pointer"
                            >
                              {tender.tender_number ||
                                "—"}
                            </TableCell>

                            {/* ORGANIZATION */}
                            <TableCell className="text-xs max-w-[200px] truncate">
                              {tender.organization_id ? (
                                <Link
                                  to="/organizations"
                                  className="hover:underline font-medium text-foreground"
                                >
                                  {tender.organization
                                    ?.name ||
                                    "Unknown Org"}
                                </Link>
                              ) : (
                                <span className="text-muted-foreground">
                                  Not Linked
                                </span>
                              )}

                              {tender.department && (
                                <p className="text-[10px] text-muted-foreground">
                                  {
                                    tender.department
                                  }
                                </p>
                              )}
                            </TableCell>

                            {/* CATEGORY */}
                            <TableCell className="text-xs">
                              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[11px] font-medium whitespace-nowrap">
                                {tender.instrument_category || "Analytical Instruments"}
                              </Badge>
                            </TableCell>

                            {/* VALUE */}
                            <TableCell className="text-xs font-semibold text-foreground">
                              {formatCurrency(
                                tender.tender_value
                              )}
                            </TableCell>

                            {/* CLOSING DATE */}
                            <TableCell
                              className={`text-xs ${getUrgencyClass(
                                tender.bid_closing_date
                              )}`}
                            >
                              {getUrgencyIcon(
                                tender.bid_closing_date
                              )}

                              {tender.bid_closing_date
                                ? new Date(
                                    tender.bid_closing_date
                                  ).toLocaleDateString(
                                    "en-IN",
                                    {
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric",
                                    }
                                  )
                                : "-"}
                            </TableCell>

                            {/* EXISTING OEM */}
                            <TableCell className="text-xs">
                              {tender.existing_oem ? (
                                <Badge
                                  variant="outline"
                                  className="border-primary/20 bg-primary/5 text-primary text-[10px] px-2 py-0.5"
                                >
                                  {
                                    tender.existing_oem
                                  }
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-[10px]">
                                  None
                                </span>
                              )}
                            </TableCell>

                            {/* COMPETITORS */}
                            <TableCell className="text-xs max-w-[140px] truncate">
                              <div className="flex flex-wrap gap-1">
                                {tender.likely_competitors?.map(
                                  (
                                    competitor,
                                    index
                                  ) => (
                                    <Badge
                                      key={`${tender.id}-competitor-${index}`}
                                      variant="secondary"
                                      className="text-[9px] px-1.5 py-0"
                                    >
                                      {
                                        competitor
                                      }
                                    </Badge>
                                  )
                                )}

                                {(!tender.likely_competitors ||
                                  tender
                                    .likely_competitors
                                    .length ===
                                    0) && (
                                  <span className="text-muted-foreground text-[10px]">
                                    -
                                  </span>
                                )}
                              </div>
                            </TableCell>

                            {/* STATUS */}
                            <TableCell>
                              <Select
                                value={
                                  tender.status
                                }
                                onValueChange={(
                                  value
                                ) =>
                                  handleStatusChange(
                                    tender.id,
                                    value as TenderStatus
                                  )
                                }
                              >
                                <SelectTrigger
                                  style={{
                                    color:
                                      statusColor,
                                    borderColor: `${statusColor}30`,
                                    backgroundColor: `${statusColor}08`,
                                  }}
                                  className="w-[125px] h-8 text-[11px] font-bold rounded-lg"
                                >
                                  <SelectValue />
                                </SelectTrigger>

                                <SelectContent>
                                  <SelectItem value="New">
                                    New
                                  </SelectItem>

                                  <SelectItem value="Under Review">
                                    Under Review
                                  </SelectItem>

                                  <SelectItem value="Interested">
                                    Interested
                                  </SelectItem>

                                  <SelectItem value="Bid Submitted">
                                    Bid Submitted
                                  </SelectItem>

                                  <SelectItem value="Won">
                                    Won
                                  </SelectItem>

                                  <SelectItem value="Lost">
                                    Lost
                                  </SelectItem>

                                  <SelectItem value="Closed">
                                    Closed
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>

                            {/* ACTION */}
                            <TableCell className="text-xs max-w-[200px] truncate text-muted-foreground">
                              {tender.action_required ||
                                "No action recorded."}
                            </TableCell>

                            {/* SOURCE */}
                            <TableCell>
                              {tender.source_url ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 text-[11px] gap-1"
                                  onClick={() => {
                                    try {
                                      const url =
                                        new URL(
                                          tender.source_url
                                        );

                                      if (
                                        url.protocol ===
                                          "http:" ||
                                        url.protocol ===
                                          "https:"
                                      ) {
                                        window.open(
                                          url.href,
                                          "_blank",
                                          "noopener,noreferrer"
                                        );
                                      }
                                    } catch {
                                      toast(
                                        {
                                          variant:
                                            "destructive",
                                          title:
                                            "Invalid Source URL",
                                          description:
                                            "The tender source URL is not valid.",
                                        }
                                      );
                                    }
                                  }}
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  Source
                                </Button>
                              ) : (
                                <span className="text-[10px] text-muted-foreground">
                                  Unavailable
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      }
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ---------------------------------------------------
            PAGINATION
        --------------------------------------------------- */}

        {!tendersLoading &&
          totalTenders > PAGE_SIZE && (
            <div className="flex items-center justify-between border border-border rounded-xl bg-card px-4 py-3">
              <div className="text-xs text-muted-foreground">
                Page{" "}
                <span className="font-semibold text-foreground">
                  {currentPage}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-foreground">
                  {totalPages.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={
                    currentPage <= 1 ||
                    tendersFetching
                  }
                  onClick={() =>
                    goToPage(
                      currentPage - 1
                    )
                  }
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>

                <div className="hidden sm:flex items-center gap-1">
                  {Array.from(
                    {
                      length: Math.min(
                        5,
                        totalPages
                      ),
                    },
                    (_, index) => {
                      let pageNumber: number;

                      if (
                        totalPages <= 5
                      ) {
                        pageNumber =
                          index + 1;
                      } else if (
                        currentPage <= 3
                      ) {
                        pageNumber =
                          index + 1;
                      } else if (
                        currentPage >=
                        totalPages - 2
                      ) {
                        pageNumber =
                          totalPages -
                          4 +
                          index;
                      } else {
                        pageNumber =
                          currentPage -
                          2 +
                          index;
                      }

                      return (
                        <Button
                          key={
                            pageNumber
                          }
                          variant={
                            currentPage ===
                            pageNumber
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          className="w-9"
                          disabled={
                            tendersFetching
                          }
                          onClick={() =>
                            goToPage(
                              pageNumber
                            )
                          }
                        >
                          {
                            pageNumber
                          }
                        </Button>
                      );
                    }
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={
                    currentPage >=
                      totalPages ||
                    tendersFetching
                  }
                  onClick={() =>
                    goToPage(
                      currentPage + 1
                    )
                  }
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
      </div>
    </DashboardLayout>
  );
}