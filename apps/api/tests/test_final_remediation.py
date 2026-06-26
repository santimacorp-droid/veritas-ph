import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from workers.tasks.linker import detect_duplicate_documents, link_contracts_to_cases, track_linker_metrics
from workers.tasks.risk_engine import insert_baseline_evidence


@pytest.mark.asyncio
@patch("workers.tasks.linker.async_session_maker")
async def test_detect_duplicate_documents(mock_session_maker):
    mock_db = AsyncMock()
    mock_session_maker.return_value.__aenter__.return_value = mock_db

    # Two duplicate cases (same ref number)
    mock_res = MagicMock()
    mock_res.mappings.return_value.all.return_value = [
        {"case_id": "c1", "title": "Construction of Hall", "agency_id": "a1", "planned_amount": 1000.0, "procurement_ref_no": "REF-123"},
        {"case_id": "c2", "title": "Construction of Hall Duplicate", "agency_id": "a1", "planned_amount": 1000.0, "procurement_ref_no": "REF-123"},
    ]
    mock_db.execute.return_value = mock_res

    res = await detect_duplicate_documents()
    assert res["status"] == "success"
    assert res["merged_cases"] == 1
    # Check that DELETE and UPDATE queries were executed
    assert mock_db.execute.call_count >= 2


@pytest.mark.asyncio
@patch("workers.tasks.linker.async_session_maker")
async def test_link_contracts_to_cases(mock_session_maker):
    mock_db = AsyncMock()
    mock_session_maker.return_value.__aenter__.return_value = mock_db

    # Unlinked contract
    mock_contract_res = MagicMock()
    mock_contract_res.mappings.return_value.all.return_value = [
        {"contract_id": "con1", "document_id": "doc1", "contract_no": "REF-123", "source_url": "http://test"}
    ]
    
    # Matching case
    mock_case_res = MagicMock()
    mock_case_res.mappings.return_value.first.return_value = {"case_id": "c1"}

    mock_db.execute.side_effect = [mock_contract_res, mock_case_res, MagicMock()]

    res = await link_contracts_to_cases()
    assert res["status"] == "success"
    assert res["linked_contracts"] == 1


@pytest.mark.asyncio
@patch("workers.tasks.linker.async_session_maker")
async def test_track_linker_metrics(mock_session_maker):
    mock_db = AsyncMock()
    mock_session_maker.return_value.__aenter__.return_value = mock_db

    # Mock analyst reviews summary
    mock_summary = MagicMock()
    mock_summary.mappings.return_value.first.return_value = {
        "total": 10,
        "fp": 2,
        "tp": 8
    }
    
    # Mock corrected review count
    mock_corrected = MagicMock()
    mock_corrected.scalar.return_value = 1

    mock_db.execute.side_effect = [mock_summary, mock_corrected, MagicMock()]

    res = await track_linker_metrics()
    assert res["status"] == "success"
    assert res["precision"] == 0.8
    assert res["recall"] == 8.0 / 9.0


@pytest.mark.asyncio
@patch("workers.tasks.risk_engine.async_session_maker")
async def test_insert_baseline_evidence_spans(mock_session_maker):
    mock_db = AsyncMock()
    mock_session_maker.return_value.__aenter__.return_value = mock_db

    # Mock source document with raw spans
    mock_doc = MagicMock()
    spans = [
        {"field": "planned_amount", "page": 2, "char_start": 45, "char_end": 60}
    ]
    mock_doc.mappings.return_value.first.return_value = {
        "document_id": "doc123",
        "source_url": "http://test",
        "sha256_hash": "hash123",
        "fetch_timestamp": "2026-06-26 12:00:00",
        "confidence": 0.95,
        "parser_version": "v1",
        "raw_spans": json.dumps(spans)
    }

    mock_db.execute.side_effect = [mock_doc, MagicMock()]

    await insert_baseline_evidence(mock_db, "case1", "disc1")
    
    # Ensure insert into evidence_links was called (first to get doc, second to insert)
    assert mock_db.execute.call_count == 2
    insert_call_args = mock_db.execute.call_args_list[1][0][1]
    assert insert_call_args["page"] == 2
    assert insert_call_args["start"] == 45
    assert insert_call_args["end"] == 60
