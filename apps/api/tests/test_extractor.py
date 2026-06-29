from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from workers.tasks.extractor import process_document


@pytest.mark.asyncio
@patch("workers.tasks.extractor.get_api_store")
@patch("workers.tasks.extractor.async_session_maker")
async def test_process_document_regex(mock_session_maker, mock_get_store):
    # Mock storage client returning document text with matching fields
    mock_store = MagicMock()
    mock_store.get_bytes.return_value = b"Reference Number: 2024-TEST-123\nProject Title: Test Project Title\nApproved Budget for the Contract: 2,500,000.00"
    mock_get_store.return_value = mock_store

    # Mock DB session returning a storage path for the document
    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.mappings().first.return_value = {"storage_path": "test_path.txt"}
    mock_db.execute.return_value = mock_result

    # Mock async context manager for db session
    mock_session = AsyncMock()
    mock_session.execute = mock_db.execute
    mock_session_maker.return_value.__aenter__.return_value = mock_session

    result = await process_document("some-doc-uuid")

    assert result["status"] == "success"
    assert "extraction_id" in result
    # Check that database queries were executed (load doc info + insert extraction + update doc status)
    assert mock_db.execute.call_count >= 3


@pytest.mark.asyncio
@patch("workers.tasks.extractor.get_api_store")
@patch("workers.tasks.extractor.async_session_maker")
async def test_process_document_philgeps_notice(mock_session_maker, mock_get_store):
    # Mock storage client returning real PhilGEPS notice content
    mock_store = MagicMock()
    mock_store.get_bytes.return_value = (
        b"Invitation to Bid (ITB)\n"
        b"  Reference Number      12967682\n"
        b"  Procuring Entity      MUNICIPALITY OF GUIGUINTO, BULACAN\n"
        b"  Title Purchase of anti rabies vaccine (purified chick embryo cell)\n"
        b"  Procurement Mode:       Public Bidding\n"
        b"  Category:       Drugs and Medicines\n"
        b"  Approved Budget for the Contract:       PHP 3,670,800.00\n"
        b"  Date Published  26/06/2026\n"
    )
    mock_get_store.return_value = mock_store

    # Mock DB session returning a storage path for the document
    mock_db = AsyncMock()
    mock_result = MagicMock()

    # We use a list to return different values on successive calls to mappings().first()
    # 1. document lookup: returns storage path
    # 2. agency lookup: returns None (not found, will create)
    # 3. case lookup: returns None (not found, will create)
    # 4. supplier lookup: returns None
    first_mock = MagicMock()
    first_mock.side_effect = [{"storage_path": "test_path.txt"}, None, None, None]
    mock_result.mappings().first = first_mock
    mock_db.execute.return_value = mock_result

    mock_session = AsyncMock()
    mock_session.execute = mock_db.execute
    mock_session_maker.return_value.__aenter__.return_value = mock_session

    result = await process_document("some-doc-uuid")

    assert result["status"] == "success"
    assert "extraction_id" in result
    assert mock_db.execute.call_count >= 5


def test_normalize_date_to_iso():
    from workers.tasks.extractor import normalize_date_to_iso

    assert normalize_date_to_iso("26/06/2026") == "2026-06-26"
    assert normalize_date_to_iso("02-07-2026") == "2026-07-02"
    assert normalize_date_to_iso("2026-06-26") == "2026-06-26"
    assert normalize_date_to_iso("Jan 15, 2024") == "2024-01-15"
    assert normalize_date_to_iso("15-Jan-2024") == "2024-01-15"
    assert normalize_date_to_iso("") is None
    assert normalize_date_to_iso(None) is None
    assert normalize_date_to_iso("invalid date") is None


def test_normalize_amount():
    from workers.tasks.extractor import normalize_amount
    
    assert normalize_amount("P1M") == 1000000.0
    assert normalize_amount("PhP 1.5M") == 1500000.0
    assert normalize_amount("₱ 1,000,000.50") == 1000000.50
    assert normalize_amount("1M") == 1000000.0
    assert normalize_amount("1.2 B") == 1200000000.0
    assert normalize_amount("10,000") == 10000.0
    assert normalize_amount("") is None
    assert normalize_amount(None) is None


@pytest.mark.asyncio
@patch("workers.tasks.extractor.get_api_store")
@patch("workers.tasks.extractor.async_session_maker")
async def test_process_document_extracts_closing_date(mock_session_maker, mock_get_store):
    import json

    # Mock storage client returning real PhilGEPS notice content with a closing date
    mock_store = MagicMock()
    mock_store.get_bytes.return_value = (
        b"Invitation to Bid (ITB)\n"
        b"  Reference Number      12967682\n"
        b"  Procuring Entity      MUNICIPALITY OF GUIGUINTO, BULACAN\n"
        b"  Title Purchase of anti rabies vaccine (purified chick embryo cell)\n"
        b"  Procurement Mode:       Public Bidding\n"
        b"  Category:       Drugs and Medicines\n"
        b"  Approved Budget for the Contract:       PHP 3,670,800.00\n"
        b"  Date Published  26/06/2026\n"
        b"  Closing Date/Time  02/07/2026\n"
    )
    mock_get_store.return_value = mock_store

    mock_db = AsyncMock()
    mock_result = MagicMock()

    first_mock = MagicMock()
    first_mock.side_effect = [{"storage_path": "test_path.txt"}, None, None, None]
    mock_result.mappings().first = first_mock
    mock_db.execute.return_value = mock_result

    mock_session = AsyncMock()
    mock_session.execute = mock_db.execute
    mock_session_maker.return_value.__aenter__.return_value = mock_session

    result = await process_document("some-doc-uuid")
    assert result["status"] == "success"

    # Verify that the INSERT INTO extractions includes both date_published and closing_date
    extractions_call = None
    for call in mock_db.execute.call_args_list:
        stmt = call[0][0]
        params = call[0][1] if len(call[0]) > 1 else call[1].get("params", {})
        if "INSERT INTO extractions" in str(stmt):
            extractions_call = params
            break

    assert extractions_call is not None
    fields = json.loads(extractions_call["fields"])
    assert fields["date_published"] == "26/06/2026"
    assert fields["closing_date"] == "02/07/2026"


@pytest.mark.asyncio
@patch("workers.tasks.extractor.get_api_store")
@patch("workers.tasks.extractor.async_session_maker")
async def test_process_document_existing_case_updates(mock_session_maker, mock_get_store):
    # Mock storage client returning notice content
    mock_store = MagicMock()
    mock_store.get_bytes.return_value = (
        b"Invitation to Bid (ITB)\n"
        b"  Reference Number      12967682\n"
        b"  Procuring Entity      MUNICIPALITY OF GUIGUINTO, BULACAN\n"
        b"  Title Purchase of anti rabies vaccine (purified chick embryo cell)\n"
        b"  Procurement Mode:       Public Bidding\n"
        b"  Category:       Drugs and Medicines\n"
        b"  Approved Budget for the Contract:       PHP 3,670,800.00\n"
        b"  Date Published  26/06/2026\n"
        b"  Closing Date/Time  02/07/2026\n"
    )
    mock_get_store.return_value = mock_store

    mock_db = AsyncMock()
    mock_result = MagicMock()

    # 1. document lookup: returns storage path
    # 2. agency lookup: returns None (will create)
    # 3. case lookup: returns existing case (case_exists = True)
    # 4. current stage lookup: returns active_bidding
    # 5. event lookup: returns None (event_exists = False, will insert event)
    first_mock = MagicMock()
    first_mock.side_effect = [
        {"storage_path": "test_path.txt"},
        {"case_id": "existing-case-uuid"},
        {"procurement_stage": "active_bidding"},
        None
    ]
    mock_result.mappings().first = first_mock
    mock_db.execute.return_value = mock_result

    mock_session = AsyncMock()
    mock_session.execute = mock_db.execute
    mock_session_maker.return_value.__aenter__.return_value = mock_session

    result = await process_document("some-doc-uuid")

    assert result["status"] == "success"

    # Verify that UPDATE procurement_cases and INSERT INTO procurement_events were called
    update_case_called = False
    insert_event_called = False
    for call in mock_db.execute.call_args_list:
        stmt = str(call[0][0])
        if "UPDATE procurement_cases" in stmt:
            update_case_called = True
        if "INSERT INTO procurement_events" in stmt:
            insert_event_called = True

    assert update_case_called
    assert insert_event_called

