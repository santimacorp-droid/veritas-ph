"""
apps/api/workers/tasks/case_updater.py

Automatically transitions procurement cases through their lifecycle stages
based on date comparisons and available data. Runs as a daily background task.

Lifecycle stages:
  active_bidding   — Accepting bids; deadline has not passed
  under_evaluation — Bid deadline has passed; BAC evaluating
  awarded          — NOA issued / award_date is set
  ongoing          — NTP issued / ntp_date has passed
  completed        — contract_end_date has passed
  cancelled        — Marked cancelled by extractor or manual flag
"""

import structlog
from database import async_session_maker
from sqlalchemy import text

logger = structlog.get_logger()


async def update_case_stages() -> dict:
    """
    Scans all procurement cases and promotes them to the correct stage
    based on bid_deadline, award_date, ntp_date, and contract_end_date.
    """
    logger.info("Case updater: running lifecycle stage promotion...")

    transitions = {
        "to_under_evaluation": 0,
        "to_awarded": 0,
        "to_ongoing": 0,
        "to_completed": 0,
    }

    async with async_session_maker() as db:
        # 1. active_bidding → under_evaluation
        #    When: bid_deadline has passed by more than 1 day and no award yet
        res = await db.execute(text("""
            UPDATE procurement_cases
               SET procurement_stage = 'under_evaluation',
                   updated_at = CURRENT_TIMESTAMP
             WHERE procurement_stage = 'active_bidding'
               AND bid_deadline IS NOT NULL
               AND bid_deadline < CURRENT_DATE - INTERVAL '1 day'
               AND award_date IS NULL
        """))
        transitions["to_under_evaluation"] = res.rowcount

        # 2. active_bidding / under_evaluation → awarded
        #    When: award_date is set
        res = await db.execute(text("""
            UPDATE procurement_cases
               SET procurement_stage = 'awarded',
                   updated_at = CURRENT_TIMESTAMP
             WHERE procurement_stage IN ('active_bidding', 'under_evaluation')
               AND award_date IS NOT NULL
        """))
        transitions["to_awarded"] = res.rowcount

        # 3. awarded → ongoing
        #    When: ntp_date is set and has passed
        res = await db.execute(text("""
            UPDATE procurement_cases
               SET procurement_stage = 'ongoing',
                   updated_at = CURRENT_TIMESTAMP
             WHERE procurement_stage = 'awarded'
               AND ntp_date IS NOT NULL
               AND ntp_date <= CURRENT_DATE
        """))
        transitions["to_ongoing"] = res.rowcount

        # 4. ongoing → completed
        #    When: contract_end_date has passed
        res = await db.execute(text("""
            UPDATE procurement_cases
               SET procurement_stage = 'completed',
                   updated_at = CURRENT_TIMESTAMP
             WHERE procurement_stage = 'ongoing'
               AND contract_end_date IS NOT NULL
               AND contract_end_date < CURRENT_DATE
        """))
        transitions["to_completed"] = res.rowcount

        await db.commit()

    total = sum(transitions.values())
    logger.info(
        "Case updater: stage promotion complete",
        total_transitioned=total,
        **transitions
    )
    return {"status": "success", "transitions": transitions, "total": total}
