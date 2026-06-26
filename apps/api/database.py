"""
apps/api/database.py
Async SQLAlchemy setup.
"""

import os

from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import declarative_base

# Load environment variables
load_dotenv()

db_file = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../pb_data/data.db"))
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite+aiosqlite:///{db_file}")

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    future=True,
    pool_size=20,
    max_overflow=10,
    connect_args={"prepared_statement_cache_size": 0}
)

async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)

Base = declarative_base()


async def get_db():
    """Dependency to yield database sessions."""
    async with async_session_maker() as session:
        yield session
