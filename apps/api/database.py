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

from urllib.parse import quote_plus, unquote

def make_robust_db_url(url_str: str) -> str:
    if not url_str or not url_str.startswith("postgresql"):
        return url_str
    
    # Safely extract and encode credentials to handle special characters (e.g. '@' in passwords)
    base_part, _, query = url_str.partition("?")
    scheme, _, rest = base_part.partition("://")
    creds, _, host_db = rest.rpartition("@")
    if not creds:
        return url_str
        
    username, _, password = creds.partition(":")
    decoded_username = unquote(username)
    encoded_username = quote_plus(decoded_username)
    decoded_password = unquote(password)
    # We use quote_plus but we must be careful to not encode '/' if it leaks into password,
    # but quote_plus handles it perfectly.
    encoded_password = quote_plus(decoded_password)
    
    reconstructed = f"{scheme}://{encoded_username}:{encoded_password}@{host_db}"
    if query:
        # If sslmode is present, replace it with ssl because asyncpg/SQLAlchemy dialect doesn't support sslmode
        # and instead expects ssl.
        query_params = []
        for param in query.split("&"):
            key, _, val = param.partition("=")
            if key == "sslmode":
                # Map sslmode=require or others to ssl=require
                query_params.append(f"ssl={val}")
            else:
                query_params.append(param)
        reconstructed += f"?{'&'.join(query_params)}"
        
    return reconstructed

db_file = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../pb_data/data.db"))
DATABASE_URL = make_robust_db_url(os.getenv("DATABASE_URL", f"sqlite+aiosqlite:///{db_file}"))

engine_kwargs = {
    "echo": False,
    "future": True,
}
if "sqlite" not in DATABASE_URL:
    engine_kwargs["pool_size"] = 20
    engine_kwargs["max_overflow"] = 10
    engine_kwargs["connect_args"] = {"prepared_statement_cache_size": 0}

engine = create_async_engine(DATABASE_URL, **engine_kwargs)

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
