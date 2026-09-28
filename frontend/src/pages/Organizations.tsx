import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { useOrganizations, useCreateOrganization, useUpdateOrganization } from "@/hooks/useOrganizations";
import { Organization, Tender } from "@/lib/types";
import {
  Building2,
  Plus,
  Search,
  Globe,
  Mail,
  Phone,
  History,
  AlertCircle,
  ExternalLink,
  Edit2,
  Check,
  User,
  MapPin,
  Clock,
  Briefcase,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { orgApi } from "@/lib/api";

export default function Organizations() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Form states for Create/Edit
  const [orgForm, setOrgForm] = useState({
    name: "",
    type: "Research Lab",
    category: "DAE",
    website: "",
    city: "",
    state: "",
    contact_person: "",
    contact_email: "",
    contact_phone: "",
    existing_oems: [] as string[],
    notes: "",
  });

  const { data: orgs, isLoading: orgsLoading, refetch } = useOrganizations();
  const createMutation = useCreateOrganization();
  const updateMutation = useUpdateOrganization();

  const [selectedOrgDetails, setSelectedOrgDetails] = useState<(Organization & { tenders: Tender[] }) | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const fetchOrgDetails = async (id: string) => {
    setDetailsLoading(true);
    try {
      const details = await orgApi.get(id);
      setSelectedOrgDetails(details);
      setSelectedOrgId(id);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error fetching details",
        description: "Could not retrieve tender history.",
      });
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgForm.name) {
      toast({
        variant: "destructive",
        title: "Name is required",
        description: "Please enter the organization's name.",
      });
      return;
    }

    try {
      await createMutation.mutateAsync(orgForm);
      toast({
        title: "Organization Created",
        description: `${orgForm.name} successfully added to database.`,
      });
      setIsAddOpen(false);
      refetch();
      resetForm();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Creation Failed",
        description: "Failed to create organization.",
      });
    }
  };

  const handleEditOrgClick = (org: Organization) => {
    setOrgForm({
      name: org.name,
      type: org.type,
      category: org.category,
      website: org.website || "",
      city: org.city || "",
      state: org.state || "",
      contact_person: org.contact_person || "",
      contact_email: org.contact_email || "",
      contact_phone: org.contact_phone || "",
      existing_oems: org.existing_oems || [],
      notes: org.notes || "",
    });
    setIsEditOpen(true);
  };

  const handleUpdateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrgId) return;

    try {
      await updateMutation.mutateAsync({ id: selectedOrgId, data: orgForm });
      toast({
        title: "Organization Updated",
        description: "Details successfully saved.",
      });
      setIsEditOpen(false);
      refetch();
      if (selectedOrgId) {
        fetchOrgDetails(selectedOrgId);
      }
      resetForm();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Failed to update organization details.",
      });
    }
  };

  const resetForm = () => {
    setOrgForm({
      name: "",
      type: "Research Lab",
      category: "DAE",
      website: "",
      city: "",
      state: "",
      contact_person: "",
      contact_email: "",
      contact_phone: "",
      existing_oems: [],
      notes: "",
    });
  };

  const filteredOrgs = orgs?.filter(
    (o) =>
      o.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.category.toLowerCase().includes(searchTerm.toLowerCase()),
  ) || [];

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 p-6">
        <PageHeader
          title="Organizations"
          subtitle="Manage the institutional database of procuring departments and existing instrument setups"
          breadcrumbs={[
            { label: "Dashboard", path: "/" },
            { label: "Organizations" },
          ]}
          actions={
            <Button
              onClick={() => {
                resetForm();
                setIsAddOpen(true);
              }}
              size="sm"
              className="bg-primary hover:bg-primary/95 text-white text-xs flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add Organization
            </Button>
          }
        />

        {/* Search Bar */}
        <div className="relative w-full bg-card border border-border/80 rounded-xl p-4">
          <Search className="absolute left-7 top-6.5 h-4.5 w-4.5 text-muted-foreground" />
          <Input
            placeholder="Search by organization name, category, or city..."
            className="pl-10 border-border/60 hover:border-primary/20 focus-visible:ring-primary/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left Side: Organizations Table */}
          <Card className="xl:col-span-2 border-border hover:shadow-sm transition-all duration-300">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-base font-bold">Registered Organizations</CardTitle>
              <CardDescription className="text-xs">Select an organization to view active tenders and history</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {orgsLoading ? (
                <div className="flex py-24 justify-center text-sm text-muted-foreground">Loading organizations...</div>
              ) : filteredOrgs.length === 0 ? (
                <div className="flex py-24 justify-center text-sm text-muted-foreground">No organizations registered. Add one to start.</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs font-semibold">Name</TableHead>
                        <TableHead className="text-xs font-semibold">Category</TableHead>
                        <TableHead className="text-xs font-semibold">Location</TableHead>
                        <TableHead className="text-xs font-semibold">Primary Contact</TableHead>
                        <TableHead className="text-xs font-semibold">Installed OEMs</TableHead>
                        <TableHead className="text-xs font-semibold text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrgs.map((org) => (
                        <TableRow
                          key={org.id}
                          className={`hover:bg-muted/30 cursor-pointer transition-colors ${selectedOrgId === org.id ? "bg-primary/5 hover:bg-primary/10" : ""}`}
                          onClick={() => fetchOrgDetails(org.id)}
                        >
                          <TableCell className="font-semibold text-xs text-foreground">
                            {org.name}
                            <p className="text-[10px] text-muted-foreground font-normal">{org.type}</p>
                          </TableCell>
                          <TableCell className="text-xs">
                            <Badge variant="outline" className="text-[10px] font-bold border-border">
                              {org.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {org.city ? `${org.city}, ${org.state}` : "-"}
                          </TableCell>
                          <TableCell className="text-xs max-w-[120px] truncate text-muted-foreground">
                            {org.contact_person || "-"}
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="flex flex-wrap gap-1 max-w-[150px]">
                              {org.existing_oems?.map((oem, idx) => (
                                <Badge key={idx} variant="secondary" className="text-[9px] px-1.5 py-0 font-medium">
                                  {oem}
                                </Badge>
                              ))}
                              {(!org.existing_oems || org.existing_oems.length === 0) && (
                                <span className="text-muted-foreground text-[10px]">-</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditOrgClick(org)}
                              className="h-7 w-7 text-muted-foreground hover:text-primary"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right Side: Details View / Drawer */}
          <div className="flex flex-col gap-6">
            {detailsLoading ? (
              <Card className="border-border p-6 text-center text-sm text-muted-foreground">
                Retrieving history and connections...
              </Card>
            ) : selectedOrgDetails ? (
              <div className="flex flex-col gap-6">
                {/* Profile Card */}
                <Card className="border-border hover:shadow-sm transition-all duration-300">
                  <CardHeader className="p-5 pb-3 border-b border-border/40">
                    <CardTitle className="text-base font-bold text-foreground">
                      {selectedOrgDetails.name}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {selectedOrgDetails.type} • {selectedOrgDetails.category}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-5 space-y-4">
                    {/* Website */}
                    {selectedOrgDetails.website && (
                      <a
                        href={selectedOrgDetails.website}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold"
                      >
                        <Globe className="w-4 h-4 text-muted-foreground" />
                        Visit Official Website
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}

                    {/* Location */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      {selectedOrgDetails.city ? `${selectedOrgDetails.city}, ${selectedOrgDetails.state}` : "Location not recorded"}
                    </div>

                    {/* Contact Details */}
                    <div className="border-t border-border/40 pt-4 space-y-2">
                      <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <User className="w-4 h-4 text-muted-foreground" />
                        Primary Contact: {selectedOrgDetails.contact_person || "N/A"}
                      </p>
                      {selectedOrgDetails.contact_email && (
                        <p className="text-xs flex items-center gap-1.5 ml-5 text-muted-foreground">
                          <Mail className="w-3.5 h-3.5" />
                          <a href={`mailto:${selectedOrgDetails.contact_email}`} className="text-primary hover:underline font-semibold">
                            {selectedOrgDetails.contact_email}
                          </a>
                        </p>
                      )}
                      {selectedOrgDetails.contact_phone && (
                        <p className="text-xs flex items-center gap-1.5 ml-5 text-muted-foreground">
                          <Phone className="w-3.5 h-3.5" />
                          <a href={`tel:${selectedOrgDetails.contact_phone}`} className="text-primary hover:underline font-semibold">
                            {selectedOrgDetails.contact_phone}
                          </a>
                        </p>
                      )}
                    </div>

                    {/* Notes */}
                    {selectedOrgDetails.notes && (
                      <div className="border-t border-border/40 pt-4 space-y-1">
                        <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">Notes</span>
                        <p className="text-xs text-muted-foreground leading-relaxed">{selectedOrgDetails.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Tender History Card */}
                <Card className="border-border hover:shadow-sm transition-all duration-300">
                  <CardHeader className="p-5 pb-3">
                    <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                      <History className="w-4.5 h-4.5 text-primary" />
                      Tender Opportunities History ({selectedOrgDetails.tenders.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 pt-0">
                    {selectedOrgDetails.tenders.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-4">No active or historical tenders recorded for this organization.</p>
                    ) : (
                      <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                        {selectedOrgDetails.tenders.map((tender) => (
                          <div
                            key={tender.id}
                            className="bg-muted/40 hover:bg-muted/70 transition-all rounded-lg p-3 border border-border/60 flex flex-col gap-1.5 cursor-pointer"
                            onClick={() => navigate(`/tenders/${tender.id}`)}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-primary hover:underline">
                                {tender.tender_number}
                              </span>
                              <Badge variant="outline" className="text-[9px] px-2 py-0 border-border">
                                {tender.status}
                              </Badge>
                            </div>
                            <p className="text-xs font-semibold text-foreground line-clamp-1">{tender.title}</p>
                            <div className="flex justify-between items-center text-[10px] text-muted-foreground pt-1 border-t border-border/30 mt-1">
                              <span className="font-semibold text-foreground">
                                {tender.tender_value ? `₹${(tender.tender_value / 100000).toFixed(0)} L` : "N/A"}
                              </span>
                              <span>Closing: {tender.bid_closing_date}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card className="border-border p-8 text-center text-xs text-muted-foreground">
                Select an organization to view details, notes, and tender history profiles.
              </Card>
            )}
          </div>
        </div>

        {/* Dialog: Add Organization */}
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogContent className="max-w-xl">
            <form onSubmit={handleCreateOrg}>
              <DialogHeader>
                <DialogTitle>Add Organization</DialogTitle>
                <DialogDescription>Create a master record for a new procurer/institution.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs font-semibold">Organization Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g. Indian Institute of Technology Madras (IITM)"
                    value={orgForm.name}
                    onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type" className="text-xs font-semibold">Type</Label>
                    <Select value={orgForm.type} onValueChange={(val) => setOrgForm({ ...orgForm, type: val })}>
                      <SelectTrigger id="type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Research Lab">Research Lab</SelectItem>
                        <SelectItem value="University">University</SelectItem>
                        <SelectItem value="Government Dept">Government Department</SelectItem>
                        <SelectItem value="Public Sector Unit">Public Sector Unit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category" className="text-xs font-semibold">Category</Label>
                    <Select value={orgForm.category} onValueChange={(val) => setOrgForm({ ...orgForm, category: val })}>
                      <SelectTrigger id="category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DAE">DAE (Atomic Energy)</SelectItem>
                        <SelectItem value="IIT">IIT (Institutes of Tech)</SelectItem>
                        <SelectItem value="NIT">NIT (Institutes of Tech)</SelectItem>
                        <SelectItem value="CSIR">CSIR Labs</SelectItem>
                        <SelectItem value="DRDO">DRDO Labs</SelectItem>
                        <SelectItem value="ISRO">ISRO Labs</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city" className="text-xs font-semibold">City</Label>
                    <Input
                      id="city"
                      placeholder="e.g. Chennai"
                      value={orgForm.city}
                      onChange={(e) => setOrgForm({ ...orgForm, city: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state" className="text-xs font-semibold">State</Label>
                    <Input
                      id="state"
                      placeholder="e.g. Tamil Nadu"
                      value={orgForm.state}
                      onChange={(e) => setOrgForm({ ...orgForm, state: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website" className="text-xs font-semibold">Website</Label>
                  <Input
                    id="website"
                    placeholder="https://www.iitm.ac.in"
                    value={orgForm.website}
                    onChange={(e) => setOrgForm({ ...orgForm, website: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contact_person" className="text-xs font-semibold">Contact Person</Label>
                    <Input
                      id="contact_person"
                      placeholder="Dean R&D"
                      value={orgForm.contact_person}
                      onChange={(e) => setOrgForm({ ...orgForm, contact_person: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact_email" className="text-xs font-semibold">Contact Email</Label>
                    <Input
                      id="contact_email"
                      placeholder="dean.rd@iitm.ac.in"
                      value={orgForm.contact_email}
                      onChange={(e) => setOrgForm({ ...orgForm, contact_email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact_phone" className="text-xs font-semibold">Contact Phone</Label>
                    <Input
                      id="contact_phone"
                      placeholder="+91-44-2257xxxx"
                      value={orgForm.contact_phone}
                      onChange={(e) => setOrgForm({ ...orgForm, contact_phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="existing_oems" className="text-xs font-semibold">Installed OEMs (Comma separated)</Label>
                  <Input
                    id="existing_oems"
                    placeholder="e.g. Agilent, Thermo Fisher, Shimadzu"
                    value={orgForm.existing_oems.join(", ")}
                    onChange={(e) => setOrgForm({ ...orgForm, existing_oems: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-xs font-semibold">Notes</Label>
                  <Input
                    id="notes"
                    placeholder="Additional context about this buyer..."
                    value={orgForm.notes}
                    onChange={(e) => setOrgForm({ ...orgForm, notes: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-primary hover:bg-primary/95 text-white">Create Organization</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog: Edit Organization */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-xl">
            <form onSubmit={handleUpdateOrg}>
              <DialogHeader>
                <DialogTitle>Edit Organization</DialogTitle>
                <DialogDescription>Modify fields in the institutional record.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name" className="text-xs font-semibold">Organization Name *</Label>
                  <Input
                    id="edit-name"
                    value={orgForm.name}
                    onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-type" className="text-xs font-semibold">Type</Label>
                    <Select value={orgForm.type} onValueChange={(val) => setOrgForm({ ...orgForm, type: val })}>
                      <SelectTrigger id="edit-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Research Lab">Research Lab</SelectItem>
                        <SelectItem value="University">University</SelectItem>
                        <SelectItem value="Government Dept">Government Department</SelectItem>
                        <SelectItem value="Public Sector Unit">Public Sector Unit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-category" className="text-xs font-semibold">Category</Label>
                    <Select value={orgForm.category} onValueChange={(val) => setOrgForm({ ...orgForm, category: val })}>
                      <SelectTrigger id="edit-category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DAE">DAE (Atomic Energy)</SelectItem>
                        <SelectItem value="IIT">IIT (Institutes of Tech)</SelectItem>
                        <SelectItem value="NIT">NIT (Institutes of Tech)</SelectItem>
                        <SelectItem value="CSIR">CSIR Labs</SelectItem>
                        <SelectItem value="DRDO">DRDO Labs</SelectItem>
                        <SelectItem value="ISRO">ISRO Labs</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-city" className="text-xs font-semibold">City</Label>
                    <Input
                      id="edit-city"
                      value={orgForm.city}
                      onChange={(e) => setOrgForm({ ...orgForm, city: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-state" className="text-xs font-semibold">State</Label>
                    <Input
                      id="edit-state"
                      value={orgForm.state}
                      onChange={(e) => setOrgForm({ ...orgForm, state: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-website" className="text-xs font-semibold">Website</Label>
                  <Input
                    id="edit-website"
                    value={orgForm.website}
                    onChange={(e) => setOrgForm({ ...orgForm, website: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-contact_person" className="text-xs font-semibold">Contact Person</Label>
                    <Input
                      id="edit-contact_person"
                      value={orgForm.contact_person}
                      onChange={(e) => setOrgForm({ ...orgForm, contact_person: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-contact_email" className="text-xs font-semibold">Contact Email</Label>
                    <Input
                      id="edit-contact_email"
                      value={orgForm.contact_email}
                      onChange={(e) => setOrgForm({ ...orgForm, contact_email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-contact_phone" className="text-xs font-semibold">Contact Phone</Label>
                    <Input
                      id="edit-contact_phone"
                      value={orgForm.contact_phone}
                      onChange={(e) => setOrgForm({ ...orgForm, contact_phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-existing_oems" className="text-xs font-semibold">Installed OEMs (Comma separated)</Label>
                  <Input
                    id="edit-existing_oems"
                    value={orgForm.existing_oems.join(", ")}
                    onChange={(e) => setOrgForm({ ...orgForm, existing_oems: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-notes" className="text-xs font-semibold">Notes</Label>
                  <Input
                    id="edit-notes"
                    value={orgForm.notes}
                    onChange={(e) => setOrgForm({ ...orgForm, notes: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-primary hover:bg-primary/95 text-white">Save Changes</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
