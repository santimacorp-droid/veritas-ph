export type Severity = "critical" | "high" | "medium" | "low";
export type ReviewStatus =
  | "pending"
  | "confirmed"
  | "false_positive"
  | "needs_evidence"
  | "publishable_lead"
  | "published";
export type ReviewOutcome = "confirmed" | "false_positive" | "needs_evidence" | "publishable_lead";

export interface EvidenceLink {
  link_id: string;
  document_id: string;
  document_type?: string;
  source_url: string;
  fetch_timestamp: string;
  sha256_hash: string;
  page_number?: number;
  char_start?: number;
  char_end?: number;
  bounding_box?: [number, number, number, number]; // [x, y, w, h]
  extraction_confidence?: number;
}

export interface ExtractionSpan {
  field: string;
  page: number;
  text: string;
  char_start?: number;
  char_end?: number;
  bounding_box?: [number, number, number, number];
}

export interface Extraction {
  extraction_id: string;
  document_id: string;
  extractor: string;
  parser_version?: string;
  extracted_at: string;
  fields: Record<string, any>;
  confidence?: number;
  raw_spans: ExtractionSpan[];
  review_status: "unreviewed" | "verified" | "corrected" | "rejected";
}

export interface Discrepancy {
  discrepancy_id: string;
  case_id: string;
  discrepancy_type: string;
  severity: Severity;
  explanation: string;
  rule_id: string;
  rule_version: string;
  why_fired: Record<string, any>;
  thresholds_applied?: Record<string, any> | null;
  generated_at: string;
  review_status: ReviewStatus;
  evidence?: EvidenceLink[];
  case_title?: string;
  agency_name?: string;
  agency_acronym?: string;
}

export interface ProcurementCase {
  case_id: string;
  title: string;
  procurement_ref_no?: string;
  procurement_method?: string;
  category?: string;
  awarded_amount?: number;
  award_date?: string;
  status: string;
  risk_score?: number;
  agency_id?: string;
  agency_name?: string;
  agency_acronym?: string;
  discrepancy_count?: number;
  updated_at?: string;
  created_at: string;
}

export interface CaseDetail extends ProcurementCase {
  planned_amount?: number;
  final_contract_amount?: number;
  ntp_date?: string;
  contract_start_date?: string;
  contract_end_date?: string;
  completeness_score?: number;
  confidence_score?: number;
  risk_components?: Record<string, any>;
  agency_type?: string;
  publisher_name?: string;
}

export interface TimelineEvent {
  event_id: string;
  stage: string;
  event_type: string;
  event_date?: string;
  amount?: number;
  notes?: string;
  document_id?: string;
  source_url?: string;
  document_type?: string;
  sha256_hash?: string;
  fetch_timestamp?: string;
}

export interface Supplier {
  supplier_id: string;
  canonical_name: string;
  supplier_type?: string;
  psgc_province?: string;
  philgeps_id?: string;
  primary_address?: string;
  total_awards: number;
  total_awarded: number;
  first_award_date?: string;
  last_award_date?: string;
  agency_count: number;
}

export interface User {
  user_id: string;
  email: string;
  full_name: string;
  role: "analyst" | "editor" | "admin";
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export interface PublicSummary {
  total_cases: number;
  total_agencies: number;
  total_discrepancies: number;
  total_awarded: number;
}
