"""
apps/api/database.py
Async SQLAlchemy setup.
"""

import os
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://veritas:veritas_dev@localhost:5433/veritas"
)

# Replace 'postgres' hostname from internal docker network to localhost for dev
if "postgres:5432" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("postgres:5432", "localhost:5433")

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    future=True,
    pool_size=20,
    max_overflow=10
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
