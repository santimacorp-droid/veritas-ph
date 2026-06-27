from datetime import date, datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class BaseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ─── Agencies ────────────────────────────────────────────────────────────────


class AgencyBase(BaseSchema):
    name: str
    acronym: str | None = None
    agency_type: str


class AgencyProfile(AgencyBase):
    agency_id: UUID
    publisher_name: str | None = None
    total_cases: int = 0
    total_awarded: Decimal = Decimal("0.0")
    avg_risk_score: float | None = None
    high_risk_cases: int = 0
    confirmed_discrepancies: int | None = None


# ─── Suppliers ───────────────────────────────────────────────────────────────


class SupplierBase(BaseSchema):
    canonical_name: str
    supplier_type: str | None = None
    psgc_province: str | None = None
    philgeps_id: str | None = None


class SupplierProfile(SupplierBase):
    supplier_id: UUID
    primary_address: str | None = None
    total_awards: int = 0
    total_awarded: Decimal = Decimal("0.0")
    first_award_date: date | None = None
    last_award_date: date | None = None
    agency_count: int = 0


# ─── Documents ───────────────────────────────────────────────────────────────


class DocumentBase(BaseSchema):
    document_id: UUID
    document_type: str | None = None
    source_url: str
    fetch_timestamp: datetime
    sha256_hash: str


class DocumentDetail(DocumentBase):
    download_url: str | None = None
    storage_path: str | None = None
    content_type: str | None = None
    file_size_bytes: int | None = None


# ─── Discrepancies ───────────────────────────────────────────────────────────


class EvidenceLink(BaseSchema):
    link_id: UUID
    document_id: UUID
    document_type: str | None = None
    source_url: str
    fetch_timestamp: datetime
    sha256_hash: str
    page_number: int | None = None
    char_start: int | None = None
    char_end: int | None = None
    bounding_box: list[float] | None = None  # [x, y, w, h]
    extraction_confidence: float | None = None


class ExtractionSpan(BaseSchema):
    field: str
    page: int
    text: str
    char_start: int | None = None
    char_end: int | None = None
    bounding_box: list[float] | None = None


class ExtractionBase(BaseSchema):
    extraction_id: UUID
    document_id: UUID
    extractor: str
    parser_version: str | None = None
    extracted_at: datetime
    fields: dict[str, Any]
    confidence: float | None = None
    raw_spans: list[ExtractionSpan] = Field(default_factory=list)
    review_status: str


class ExtractionDetail(ExtractionBase):
    document_url: str | None = None


class DiscrepancyBase(BaseSchema):
    discrepancy_id: UUID
    case_id: UUID
    discrepancy_type: str
    severity: str
    explanation: str
    rule_id: str
    rule_version: str
    why_fired: dict[str, Any] = Field(default_factory=dict)
    thresholds_applied: dict[str, Any] | None = None
    generated_at: datetime
    review_status: str


class DiscrepancyDetail(DiscrepancyBase):
    case_title: str | None = None
    agency_name: str | None = None
    agency_acronym: str | None = None
    evidence: list[EvidenceLink] = Field(default_factory=list)


# ─── Procurement Cases ───────────────────────────────────────────────────────


class CaseBase(BaseSchema):
    case_id: UUID
    title: str
    procurement_ref_no: str | None = None
    procurement_method: str | None = None
    category: str | None = None
    awarded_amount: Decimal | None = None
    award_date: date | None = None
    status: str
    risk_score: float | None = None


class CaseList(CaseBase):
    agency_id: UUID | None = None
    agency_name: str | None = None
    agency_acronym: str | None = None
    planned_amount: Decimal | None = None
    final_contract_amount: Decimal | None = None
    updated_at: datetime | None = None
    created_at: datetime
    discrepancy_count: int = 0


class CaseSearchResult(CaseBase):
    agency_name: str | None = None
    agency_acronym: str | None = None
    rank: float


class SupplierSearchResult(SupplierBase):
    supplier_id: UUID
    score: float


class TimelineEvent(BaseSchema):
    event_id: UUID
    stage: str
    event_type: str
    event_date: date | None = None
    amount: Decimal | None = None
    notes: str | None = None
    document_id: UUID | None = None
    source_url: str | None = None
    document_type: str | None = None
    sha256_hash: str | None = None
    fetch_timestamp: datetime | None = None


class CaseDetail(CaseBase):
    planned_amount: Decimal | None = None
    final_contract_amount: Decimal | None = None
    ntp_date: date | None = None
    contract_start_date: date | None = None
    contract_end_date: date | None = None
    completeness_score: float | None = None
    confidence_score: float | None = None
    risk_components: dict[str, Any] | None = None
    created_at: datetime
    updated_at: datetime | None = None
    agency_name: str | None = None
    agency_acronym: str | None = None
    agency_type: str | None = None
    publisher_name: str | None = None


# ─── Summaries ───────────────────────────────────────────────────────────────


class PublicSummary(BaseSchema):
    total_cases: int
    total_agencies: int
    total_discrepancies: int
    total_awarded: Decimal


# ─── Paginated Wrappers ──────────────────────────────────────────────────────


class CaseListResponse(BaseSchema):
    total: int
    cases: list[CaseList]


class SearchResponse(BaseSchema):
    query: str
    type: str
    total: int
    results: list[Any]
    meta: dict[str, Any] | None = None


class AgencyListResponse(BaseSchema):
    total: int
    agencies: list[AgencyProfile]


class SupplierListResponse(BaseSchema):
    total: int
    suppliers: list[SupplierProfile]


class SupplierAward(BaseSchema):
    award_id: UUID
    award_date: date | None = None
    amount: Decimal
    bidders_count: int | None = None
    single_bidder: bool | None = None
    case_id: UUID
    title: str
    procurement_ref_no: str | None = None
    risk_score: float | None = None
    agency_id: UUID | None = None
    agency_name: str | None = None
    agency_acronym: str | None = None


class SupplierAwardsResponse(BaseSchema):
    supplier_id: UUID
    total: int
    awards: list[SupplierAward]


class DiscrepancyListResponse(BaseSchema):
    total: int
    discrepancies: list[DiscrepancyDetail]


class TimelineResponse(BaseSchema):
    case_id: UUID
    timeline: list[TimelineEvent]


class AnalystCaseListResponse(BaseSchema):
    status: str
    total: int
    cases: list[dict[str, Any]]  # Grouped cases have a complex structure


class DiscrepancyCaseResponse(BaseSchema):
    case_id: UUID
    discrepancies: list[DiscrepancyDetail]


# ─── Legislation ─────────────────────────────────────────────────────────────


class RevisionBase(BaseSchema):
    proposed_bill: str
    proposed_changes: str
    sponsor: str | None = None
    status: str


class RevisionDetail(RevisionBase):
    revision_id: UUID
    law_id: UUID
    created_at: datetime


class ControversyBase(BaseSchema):
    issue_description: str
    impact: str | None = None
    severity: str


class ControversyDetail(ControversyBase):
    controversy_id: UUID
    provision_id: UUID
    created_at: datetime


class ProvisionBase(BaseSchema):
    section_number: str
    title: str | None = None
    content: str


class ProvisionDetail(ProvisionBase):
    provision_id: UUID
    law_id: UUID
    controversies: list[ControversyDetail] = Field(default_factory=list)
    created_at: datetime


class LawBase(BaseSchema):
    title: str
    short_title: str | None = None
    description: str | None = None
    date_passed: date | None = None
    status: str
    category: str | None = None


class LawList(LawBase):
    law_id: UUID
    updated_at: datetime
    created_at: datetime
    integrity_score: float | None = None
    governance_score: float | None = None
    analysis_status: str | None = None
    loophole_count: int | None = 0


class LawDetail(LawList):
    provisions: list[ProvisionDetail] = Field(default_factory=list)
    revisions: list[RevisionDetail] = Field(default_factory=list)


class LawListResponse(BaseSchema):
    total: int
    laws: list[LawList]
