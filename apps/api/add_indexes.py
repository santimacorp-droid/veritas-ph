import asyncio
from database import engine
from sqlalchemy import text

async def add_indexes():
    print("Adding performance indexes...")
    async with engine.begin() as conn:
        try:
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_cases_award_date ON procurement_cases(award_date DESC);"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_cases_status ON procurement_cases(status);"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_cases_category ON procurement_cases(category);"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_cases_method ON procurement_cases(procurement_method);"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_cases_updated ON procurement_cases(updated_at DESC);"))
            print("Performance indexes added successfully.")
        except Exception as e:
            print(f"Error adding indexes: {e}")

if __name__ == "__main__":
    asyncio.run(add_indexes())
