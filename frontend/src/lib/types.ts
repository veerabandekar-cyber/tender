export type TenderStatus =
  | "New"
  | "Under Review"
  | "Interested"
  | "Bid Submitted"
  | "Won"
  | "Lost"
  | "Closed";

export interface Organization {
  id: string;
  name: string;
  type: string; // e.g. "Research Lab", "University"
  category: string; // e.g. "DAE", "IIT"
  website?: string;
  city?: string;
  state?: string;
  contact_person?: string;
  contact_email?: string;
  contact_phone?: string;
  existing_oems?: string[]; // list of OEMs installed
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Tender {
  id: string;
  tender_number: string;
  title: string;
  organization_id?: string;
  organization?: Organization;
  department?: string;
  instrument_category?: string;
  portal?: string;
  tender_value?: number;
  bid_start_date?: string;
  bid_closing_date?: string;
  contact_person?: string;
  contact_email?: string;
  contact_phone?: string;
  eligible_oems: string[];
  existing_oem?: string;
  likely_competitors: string[];
  status: TenderStatus;
  action_required?: string;
  source_url?: string;
  document_url?: string;
  raw_extracted_data?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface SearchKeyword {
  id: string;
  keyword: string;
  is_active: boolean;
  created_at: string;
}

export interface SearchLog {
  id: string;
  started_at: string;
  completed_at?: string;
  status: "Completed" | "Failed" | "Running" | "Success";
  tenders_found: number;
  logs?: string;
}

export interface DashboardStats {
  totalActiveTenders: number;
  newToday: number;
  closingThisWeek: number;
  totalTenderValue: number;
  daeOpportunities: number;
  icpMsOpportunities: number;
}

export interface TenderFilters {
  status?: TenderStatus;
  organization_id?: string;
  instrument_category?: string;
  portal?: string;
  search?: string;
  sort_by?: string;
  sort_order?: string;
}
