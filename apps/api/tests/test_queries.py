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
