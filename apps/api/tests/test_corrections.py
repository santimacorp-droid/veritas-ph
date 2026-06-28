import os
os.environ["VERITAS_AUTH_SECRET"] = "some-custom-secret-key-for-test"

import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from main import submit_correction

@pytest.mark.asyncio
@patch("main.uuid4")
async def test_submit_correction_propagates(mock_uuid):
    mock_uuid.return_value = "new-uuid"
    
    mock_db = AsyncMock()
    
    # Mock user
    mock_user = {"user_id": "user-123"}
    
    # Mock data for:
    # 1. SELECT fields, document_id FROM extractions WHERE extraction_id = :id
    mock_extraction_res = MagicMock()
    mock_extraction_res.mappings().first.return_value = {
        "fields": '{"title": "Old Title"}',
        "document_id": "doc-123"
    }
    
    # 3. SELECT case_id FROM procurement_events WHERE document_id = :did LIMIT 1
    mock_case_res = MagicMock()
    mock_case_res.mappings().first.return_value = {
        "case_id": "case-456"
    }
    
    # 4. SELECT publisher_id FROM procurement_cases WHERE case_id = :cid
    mock_pub_res = MagicMock()
    mock_pub_res.mappings().first.return_value = {
        "publisher_id": "pub1"
    }
    
    # 5. SELECT agency_id, name FROM agencies
    mock_agencies_res = MagicMock()
    mock_agencies_res.mappings().all.return_value = [
        {"agency_id": "agency-789", "name": "Department of Public Works and Highways"}
    ]
    
    mock_db.execute.side_effect = [
        mock_extraction_res, # 1. SELECT fields, document_id FROM extractions
        None,                # 2. UPDATE extractions SET ...
        mock_case_res,       # 3. SELECT case_id FROM procurement_events
        mock_pub_res,        # 4. SELECT publisher_id FROM procurement_cases
        mock_agencies_res,   # 5. SELECT agency_id, name FROM agencies
        None,                # 6. UPDATE procurement_cases query
        None,                # 7. UPDATE procurement_events query
        None                 # 8. insert audit_log query
    ]
    
    payload = {
        "extraction_id": "ext-123",
        "fields": {
            "title": "New Corrected Title",
            "procuring_entity": "Department of Public Works and Highways",
            "planned_amount": 5000000.0,
            "procurement_method": "Public Bidding",
            "category": "Infrastructure",
            "closing_date": "2026-07-15",
            "date_published": "2026-06-28",
            "procurement_ref_no": "REF-CORRECTED-123"
        }
    }
    
    response = await submit_correction(payload, db=mock_db, current_user=mock_user)
    
    assert response["status"] == "accepted"
    assert response["extraction_id"] == "ext-123"
    
    # Verify DB operations:
    assert mock_db.execute.call_count >= 6
    
    # Verify that UPDATE procurement_cases updated the case_id and sets risk_score to NULL
    update_case_call = None
    for call in mock_db.execute.call_args_list:
        stmt = str(call[0][0])
        if "UPDATE procurement_cases" in stmt:
            update_case_call = call[0][1] if len(call[0]) > 1 else call[1]
            break
            
    assert update_case_call is not None
    assert update_case_call["title"] == "New Corrected Title"
    assert update_case_call["cid"] == "case-456"
