import json
import pytest
from unittest.mock import AsyncMock, MagicMock
from schemas import VALID_ANALYSIS_STATUSES
from workers.tasks.law_analyzer import call_llm_json, analyze_law


def test_analysis_statuses():
    # Assert valid statuses match CHECK constraint
    assert "pending" in VALID_ANALYSIS_STATUSES
    assert "running" in VALID_ANALYSIS_STATUSES
    assert "completed" in VALID_ANALYSIS_STATUSES
    assert "failed" in VALID_ANALYSIS_STATUSES
    assert len(VALID_ANALYSIS_STATUSES) == 4


@pytest.mark.asyncio
async def test_citation_validation_logic():
    # Setup mock DB session and return mock provisions
    mock_session = AsyncMock()
    
    mock_law = MagicMock()
    mock_law.mappings.return_value.first.return_value = {
        "title": "New Government Procurement Act",
        "short_title": "Republic Act No. 12009",
        "description": "GPRA Overhaul",
        "author": "Sen. Angara",
        "sponsor": "Rep. Aquino",
        "approved_by": "Ferdinand Marcos Jr.",
        "submitted_by": "Senate Bill No. 2593",
        "voting_record": "Senate: 21-0",
        "date_passed": "2024-07-20"
    }

    mock_provisions = MagicMock()
    mock_provisions.mappings.return_value.all.return_value = [
        {"provision_id": "p12", "section_number": "Section 12", "title": "Early Procurement", "content": "provisions... " * 10},
        {"provision_id": "p26", "section_number": "Section 26", "title": "Procurement Methods", "content": "provisions... " * 10},
        {"provision_id": "p28", "section_number": "Section 28", "title": "Limited Source Bidding", "content": "provisions... " * 10},
        {"provision_id": "p82", "section_number": "Section 82", "title": "Beneficial Ownership", "content": "provisions... " * 10}
    ]

    mock_controversies = MagicMock()
    mock_controversies.mappings.return_value.all.return_value = []

    # Mock the LLM JSON response
    mock_llm_response = json.dumps({
        "integrity_score": 85,
        "governance_score": 80,
        "pros": ["Sustainability features"],
        "cons": ["Some cons"],
        "loopholes": [
            {
                "section": "Section 26",
                "description": "Vague rules regarding LGUs",
                "risk_level": "medium"
            },
            {
                "section": "Section 15",  # Invalid citation, should be flagged
                "description": "Drafting loophole",
                "risk_level": "high"
            }
        ],
        "suggested_revisions": [
            {
                "section": "Section 82",
                "current_text": "All bidders",
                "suggested_text": "All bidders including shell directors",
                "rationale": "Closes loopholes"
            },
            {
                "section": "Section 999",  # Invalid citation, should be flagged
                "current_text": "problematic",
                "suggested_text": "solution",
                "rationale": "Closes loop"
            }
        ],
        "violation_patterns": [],
        "cross_law_conflicts": [],
        "citizen_summary": "Summary text here"
    })

    # SQL-aware mock execution function
    async def mock_execute(sql, params=None):
        sql_str = str(sql).strip()
        if "UPDATE law_analyses" in sql_str:
            return MagicMock()
        elif "FROM laws" in sql_str:
            return mock_law
        elif "FROM law_provisions" in sql_str:
            return mock_provisions
        elif "FROM law_controversies" in sql_str:
            return mock_controversies
        else:
            return MagicMock()

    mock_session.execute.side_effect = mock_execute

    # Mock LLM API call
    import workers.tasks.law_analyzer
    original_call = workers.tasks.law_analyzer.call_llm_json
    workers.tasks.law_analyzer.call_llm_json = AsyncMock(return_value=mock_llm_response)

    # Mock async_session_maker
    mock_session_maker = MagicMock()
    mock_session_maker.return_value.__aenter__.return_value = mock_session
    original_session_maker = workers.tasks.law_analyzer.async_session_maker
    workers.tasks.law_analyzer.async_session_maker = mock_session_maker

    try:
        # Run analyze_law
        await analyze_law("law-uuid", analysis_id="analysis-uuid")

        # Verify update database call was made with corrected/flagged JSON
        assert mock_session.execute.call_count >= 4
        
        # Check params of the update call
        update_params = None
        for call in mock_session.execute.call_args_list:
            stmt = call[0][0]
            params = call[0][1] if len(call[0]) > 1 else call[1].get("params", {})
            if "UPDATE law_analyses" in str(stmt) and "completed" in str(stmt):
                update_params = params
                break

        assert update_params is not None
        
        # Verify loopholes validation
        loopholes = json.loads(update_params["loopholes"])
        assert len(loopholes) == 2
        # Section 26 is valid -> no unverified flag
        assert loopholes[0]["section"] == "Section 26"
        assert "unverified_citation" not in loopholes[0]
        # Section 15 is invalid -> has unverified flag
        assert loopholes[1]["section"] == "Section 15"
        assert loopholes[1]["unverified_citation"] is True

        # Verify suggested revisions validation
        revisions = json.loads(update_params["revisions"])
        assert len(revisions) == 2
        # Section 82 is valid -> no unverified flag
        assert revisions[0]["section"] == "Section 82"
        assert "unverified_citation" not in revisions[0]
        # Section 999 is invalid -> has unverified flag
        assert revisions[1]["section"] == "Section 999"
        assert revisions[1]["unverified_citation"] is True

    finally:
        # Restore original LLM call and session maker
        workers.tasks.law_analyzer.call_llm_json = original_call
        workers.tasks.law_analyzer.async_session_maker = original_session_maker
