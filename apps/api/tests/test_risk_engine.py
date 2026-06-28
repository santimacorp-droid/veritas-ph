import json
from unittest.mock import AsyncMock, MagicMock

import pytest
from workers.tasks.risk_engine import (
    check_short_posting_window, 
    parse_date,
    check_budget_splitting,
    check_variation_order_abuse,
    check_unrelated_supplier_win,
    check_late_ntp_issuance
)


def test_parse_date():
    from datetime import date

    assert parse_date("26/06/2026") == date(2026, 6, 26)
    assert parse_date("2026-06-26") == date(2026, 6, 26)
    assert parse_date("02-07-2026") == date(2026, 7, 2)
    assert parse_date("invalid") is None


@pytest.mark.asyncio
async def test_check_short_posting_window_violates():
    # Mock db session
    db = AsyncMock()
    mock_result = MagicMock()
    mock_result.mappings.return_value.first.return_value = {
        "case_id": "test-case-id",
        "title": "Supply of Vaccine",
        "document_id": "doc-id-123",
        "event_date": "2024-06-26",
        "procurement_method": "public_bidding",
        "fields": json.dumps(
            {
                "date_published": "26/06/2024",
                "closing_date": "01/07/2024",  # 5 days difference (< 7)
            }
        ),
        "source_url": "http://example.com/notice.pdf",
        "sha256_hash": "abc123hash",
        "agency_name": "Department of Health",
            "fetch_timestamp": "2024-06-26T10:00:00Z",
            "confidence": 1.0,
            "parser_version": "v1.0.0"
    }
    db.execute.return_value = mock_result

    # Run check
    discrepancy_id = await check_short_posting_window(db, "test-case-id")

    assert discrepancy_id is not None
    # Confirm insert queries were made
    assert db.execute.call_count >= 2  # select + insert discrepancy + insert evidence

    # Verify discrepancy insert parameters
    discrepancy_insert = None
    for call in db.execute.call_args_list:
        stmt = call[0][0]
        params = call[0][1] if len(call[0]) > 1 else call[1].get("params", {})
        if "INSERT INTO discrepancies" in str(stmt):
            discrepancy_insert = params
            break

    assert discrepancy_insert is not None
    assert discrepancy_insert["cid"] == "test-case-id"
    assert discrepancy_insert["exp"] is not None
    assert "SHORT_POSTING_WINDOW" in discrepancy_insert["why"]
    assert "RULE_003" in str(stmt)


@pytest.mark.asyncio
async def test_check_short_posting_window_compliant():
    # Mock db session
    db = AsyncMock()
    mock_result = MagicMock()
    mock_result.mappings.return_value.first.return_value = {
        "case_id": "test-case-id",
        "title": "Supply of Vaccine",
        "document_id": "doc-id-123",
        "event_date": "2026-06-26",
        "fields": json.dumps(
            {
                "date_published": "26/06/2026",
                "closing_date": "08/07/2026",  # 12 days difference (>= 7)
            }
        ),
        "source_url": "http://example.com/notice.pdf",
        "sha256_hash": "abc123hash",
        "agency_name": "Department of Health",
            "fetch_timestamp": "2026-06-26T10:00:00Z",
            "confidence": 1.0,
            "parser_version": "v1.0.0"
    }
    db.execute.return_value = mock_result

    # Run check
    discrepancy_id = await check_short_posting_window(db, "test-case-id")

    assert discrepancy_id is None


@pytest.mark.asyncio
async def test_check_budget_splitting_fires():
    db = AsyncMock()
    # Mock exists check
    mock_exists = MagicMock()
    mock_exists.scalar.return_value = False
    
    # Mock case query
    mock_case = MagicMock()
    mock_case.mappings.return_value.first.return_value = {
        "title": "Supply of Laptops Q1",
        "category": "goods",
        "procurement_method": "shopping",
        "agency_id": "agency1",
        "agency_name": "Test Agency",
        "awarded_amount": 600000.0,
        "award_date": "2026-06-01"
    }
    
    # Mock cluster query
    mock_cluster = MagicMock()
    mock_cluster.mappings.return_value.all.return_value = [
        {"case_id": "c2", "title": "Supply of Laptops Q2", "awarded_amount": 500000.0}
    ]
    
    mock_evidence = MagicMock()
    mock_evidence.mappings.return_value.first.return_value = {
        "document_id": "doc1", "source_url": "url", "sha256_hash": "hash", 
        "fetch_timestamp": "2026-01-01", "confidence": 0.9, "parser_version": "v1.0.0"
    }
    db.execute.side_effect = [mock_case, mock_cluster, MagicMock(), mock_evidence]
    
    discrepancy_id = await check_budget_splitting(db, "case1")
    print(f"DEBUG case title: {mock_case.mappings.return_value.first.return_value.get('title')}")
    print(f"DEBUG discrepancy_id: {discrepancy_id}")
    assert discrepancy_id is not None
    
@pytest.mark.asyncio
async def test_check_budget_splitting_compliant():
    db = AsyncMock()
    mock_exists = MagicMock()
    mock_exists.scalar.return_value = False
    
    mock_case = MagicMock()
    mock_case.mappings.return_value.first.return_value = {
        "title": "Supply of Laptops",
        "category": "goods",
        "procurement_method": "shopping",
        "agency_id": "agency1",
        "agency_name": "Test Agency",
        "awarded_amount": 600000.0,
        "award_date": "2026-06-01"
    }
    
    mock_cluster = MagicMock()
    mock_cluster.mappings.return_value.all.return_value = [
        {"case_id": "c2", "title": "Totally Unrelated", "awarded_amount": 500000.0} # Low fuzzy score
    ]
    
    db.execute.side_effect = [mock_exists, mock_case, mock_cluster]
    
    discrepancy_id = await check_budget_splitting(db, "case1")
    assert discrepancy_id is None


@pytest.mark.asyncio
async def test_check_variation_order_abuse_fires():
    db = AsyncMock()
    mock_exists = MagicMock()
    mock_exists.scalar.return_value = False
    
    mock_query = MagicMock()
    mock_query.mappings.return_value.first.return_value = {
        "contract_id": "c1",
        "contract_amount": 1000000.0,
        "total_change": 150000.0, # 15% > 10%
        "title": "Test Title",
        "agency_name": "Test Agency",
        "awarded_amount": 1000000.0
    }
    
    mock_evidence = MagicMock()
    mock_evidence.mappings.return_value.first.return_value = {
        "document_id": "doc1", "source_url": "url", "sha256_hash": "hash", 
        "fetch_timestamp": "2026-01-01", "confidence": 0.9, "parser_version": "v1.0.0"
    }
    db.execute.side_effect = [mock_exists, mock_query, MagicMock(), mock_evidence, MagicMock()]
    
    discrepancy_id = await check_variation_order_abuse(db, "case1")
    assert discrepancy_id is not None
    

@pytest.mark.asyncio
async def test_check_variation_order_abuse_compliant():
    db = AsyncMock()
    mock_exists = MagicMock()
    mock_exists.scalar.return_value = False
    
    mock_query = MagicMock()
    mock_query.mappings.return_value.first.return_value = {
        "contract_id": "c1",
        "contract_amount": 1000000.0,
        "total_change": 50000.0, # 5% < 10%
        "title": "Test Title",
        "agency_name": "Test Agency",
        "awarded_amount": 1000000.0
    }
    
    db.execute.side_effect = [mock_exists, mock_query]
    
    discrepancy_id = await check_variation_order_abuse(db, "case1")
    assert discrepancy_id is None


@pytest.mark.asyncio
async def test_check_unrelated_supplier_win_fires():
    db = AsyncMock()
    mock_exists = MagicMock()
    mock_exists.scalar.return_value = False
    
    mock_query = MagicMock()
    mock_query.mappings.return_value.first.return_value = {
        "case_id": "c1",
        "title": "Road Construction",
        "category": "infrastructure",
        "supplier_name": "Pharma Inc",
        "supplier_id": "sup_1_health", # the mock in engine checks for '1'
        "business_classification": "health",
        "agency_name": "Test Agency",
        "fetch_timestamp": "2026-06-26T10:00:00Z",
        "confidence": 1.0,
        "parser_version": "v1.0.0",
        "awarded_amount": 1000000.0
    }
    
    mock_evidence = MagicMock()
    mock_evidence.mappings.return_value.first.return_value = {
        "document_id": "doc1", "source_url": "url", "sha256_hash": "hash", 
        "fetch_timestamp": "2026-01-01", "confidence": 0.9, "parser_version": "v1.0.0"
    }
    db.execute.side_effect = [mock_exists, mock_query, MagicMock(), mock_evidence, MagicMock()]
    
    discrepancy_id = await check_unrelated_supplier_win(db, "case1")
    assert discrepancy_id is not None
    
@pytest.mark.asyncio
async def test_check_late_ntp_issuance_fires():
    db = AsyncMock()
    mock_exists = MagicMock()
    mock_exists.scalar.return_value = False
    
    mock_query = MagicMock()
    mock_query.mappings.return_value.first.return_value = {
        "case_id": "c1",
        "title": "Test Case",
        "award_date": "2024-06-01",
        "ntp_date": "2024-06-25", # 24 days > 15
        "contract_start_date": None,
        "agency_name": "Test Agency",
        "awarded_amount": 1000000.0
    }
    
    mock_evidence = MagicMock()
    mock_evidence.mappings.return_value.first.return_value = {
        "document_id": "doc1", "source_url": "url", "sha256_hash": "hash", 
        "fetch_timestamp": "2026-01-01", "confidence": 0.9, "parser_version": "v1.0.0"
    }
    db.execute.side_effect = [mock_exists, mock_query, MagicMock(), mock_evidence, MagicMock()]
    
    discrepancy_id = await check_late_ntp_issuance(db, "case1")
    assert discrepancy_id is not None

@pytest.mark.asyncio
async def test_check_late_ntp_issuance_before_noa():
    db = AsyncMock()
    mock_exists = MagicMock()
    mock_exists.scalar.return_value = False
    
    mock_query = MagicMock()
    mock_query.mappings.return_value.first.return_value = {
        "case_id": "c1",
        "title": "Test Case",
        "award_date": "2024-06-20",
        "ntp_date": "2024-06-01", # -19 days < 0
        "contract_start_date": None,
        "agency_name": "Test Agency",
        "awarded_amount": 1000000.0
    }
    
    mock_evidence = MagicMock()
    mock_evidence.mappings.return_value.first.return_value = {
        "document_id": "doc1", "source_url": "url", "sha256_hash": "hash", 
        "fetch_timestamp": "2026-01-01", "confidence": 0.9, "parser_version": "v1.0.0"
    }
    db.execute.side_effect = [mock_exists, mock_query, MagicMock(), mock_evidence, MagicMock()]
    
    discrepancy_id = await check_late_ntp_issuance(db, "case1")
    assert discrepancy_id is not None

from workers.tasks.risk_engine import (
    check_award_before_bid_deadline,
    check_hhi_concentration,
    check_price_benchmark,
    check_geographic_mismatch
)

@pytest.mark.asyncio
async def test_check_award_before_bid_deadline_fires():
    db = AsyncMock()
    mock_exists = MagicMock()
    mock_exists.scalar.return_value = False
    
    mock_case = MagicMock()
    mock_case.mappings.return_value.first.return_value = {
        "title": "Supply of Meds",
        "award_date": "2026-06-01",
        "bid_deadline": "2026-06-15"
    }

    mock_evidence = MagicMock()
    mock_evidence.mappings.return_value.first.return_value = {
        "document_id": "doc1", "source_url": "url", "sha256_hash": "hash", 
        "fetch_timestamp": "2026-01-01", "confidence": 0.9, "parser_version": "v1.0.0"
    }
    
    db.execute.side_effect = [mock_exists, mock_case, MagicMock(), mock_evidence, MagicMock()]

    discrepancy_id = await check_award_before_bid_deadline(db, "case1")
    assert discrepancy_id is not None

@pytest.mark.asyncio
async def test_check_hhi_concentration_fires():
    db = AsyncMock()
    mock_exists = MagicMock()
    mock_exists.scalar.return_value = False

    mock_case = MagicMock()
    mock_case.mappings.return_value.first.return_value = {
        "title": "IT Equipment",
        "agency_id": "agency1",
        "category": "goods",
        "award_date": "2026-06-01"
    }

    mock_market = MagicMock()
    mock_market.mappings.return_value.all.return_value = [
        {"supplier_id": "sup1", "total_awarded": 900000.0}, # 90% share
        {"supplier_id": "sup2", "total_awarded": 100000.0}  # 10% share
    ]

    mock_evidence = MagicMock()
    mock_evidence.mappings.return_value.first.return_value = {
        "document_id": "doc1", "source_url": "url", "sha256_hash": "hash", 
        "fetch_timestamp": "2026-01-01", "confidence": 0.9, "parser_version": "v1.0.0"
    }
    
    db.execute.side_effect = [mock_exists, mock_case, mock_market, MagicMock(), mock_evidence, MagicMock()]

    discrepancy_id = await check_hhi_concentration(db, "case1")
    assert discrepancy_id is not None

@pytest.mark.asyncio
async def test_check_price_benchmark_fires():
    db = AsyncMock()
    mock_exists = MagicMock()
    mock_exists.scalar.return_value = False

    mock_case = MagicMock()
    mock_case.mappings.return_value.first.return_value = {
        "title": "Laptops",
        "category": "goods"
    }

    mock_items = MagicMock()
    mock_items.mappings.return_value.all.return_value = [
        {"item_id": "item1", "description": "Laptop", "unit_price": 100000.0}
    ]

    mock_similar = MagicMock()
    mock_similar.mappings.return_value.all.return_value = [
        {"unit_price": 50000.0},
        {"unit_price": 52000.0},
        {"unit_price": 48000.0},
        {"unit_price": 50000.0}
    ]

    mock_evidence = MagicMock()
    mock_evidence.mappings.return_value.first.return_value = {
        "document_id": "doc1", "source_url": "url", "sha256_hash": "hash", 
        "fetch_timestamp": "2026-01-01", "confidence": 0.9, "parser_version": "v1.0.0"
    }
    
    db.execute.side_effect = [mock_exists, mock_case, mock_items, mock_similar, MagicMock(), mock_evidence, MagicMock()]

    discrepancy_id = await check_price_benchmark(db, "case1")
    assert discrepancy_id is not None

@pytest.mark.asyncio
async def test_check_geographic_mismatch_fires():
    db = AsyncMock()
    mock_exists = MagicMock()
    mock_exists.scalar.return_value = False

    mock_awards = MagicMock()
    mock_awards.mappings.return_value.all.return_value = [
        {"title": "Bridge Construction", "geographic_scope": "Cebu", "supplier_id": "sup1"}
    ]

    mock_sup = MagicMock()
    mock_sup.mappings.return_value.first.return_value = {
        "geography_codes": ["Manila", "Quezon City"]
    }

    mock_evidence = MagicMock()
    mock_evidence.mappings.return_value.first.return_value = {
        "document_id": "doc1", "source_url": "url", "sha256_hash": "hash", 
        "fetch_timestamp": "2026-01-01", "confidence": 0.9, "parser_version": "v1.0.0"
    }
    
    db.execute.side_effect = [mock_exists, mock_awards, mock_sup, MagicMock(), mock_evidence, MagicMock()]

    discrepancy_id = await check_geographic_mismatch(db, "case1")
    assert discrepancy_id is not None
