from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock

import pytest
import queries


@pytest.mark.asyncio
async def test_get_public_summary_empty():
    # Mock database session
    db = AsyncMock()
    mock_result = MagicMock()
    mock_result.mappings().first.return_value = None
    db.execute.return_value = mock_result

    summary = await queries.get_public_summary(db)

    assert summary["total_cases"] == 0
    assert summary["total_agencies"] == 0
    assert summary["total_discrepancies"] == 0
    assert summary["total_awarded"] == Decimal("0")


@pytest.mark.asyncio
async def test_get_public_summary_data():
    # Mock database session
    db = AsyncMock()
    mock_result = MagicMock()
    mock_result.mappings().first.return_value = {
        "total_cases": 10,
        "total_agencies": 5,
        "total_discrepancies": 3,
        "total_awarded": Decimal("1000.50"),
    }
    db.execute.return_value = mock_result

    summary = await queries.get_public_summary(db)

    assert summary["total_cases"] == 10
    assert summary["total_agencies"] == 5
    assert summary["total_discrepancies"] == 3
    assert summary["total_awarded"] == Decimal("1000.50")


@pytest.mark.asyncio
async def test_search_cases():
    db = AsyncMock()
    mock_result = MagicMock()
    mock_result.mappings().all.return_value = [
        {
            "case_id": "c1",
            "title": "Emergency PPEs",
            "procurement_method": "negotiated",
            "awarded_amount": 5000,
            "award_date": "2020-01-01",
            "risk_score": 0.8,
            "status": "completed",
            "agency_name": "Department of Health",
            "agency_acronym": "DOH",
            "rank": 1.0,
        }
    ]
    
    # Second query for count
    mock_count = MagicMock()
    mock_count.scalar_one.return_value = 1
    
    db.execute.side_effect = [mock_result, mock_count]
    
    total, results = await queries.search_cases(
        db, q="PHILGEPS-2020-00998", agency_id=None, date_from=None, date_to=None, limit=20, offset=0
    )
    
    assert total == 1
    assert len(results) == 1
    assert results[0]["case_id"] == "c1"
    assert results[0]["agency_acronym"] == "DOH"
