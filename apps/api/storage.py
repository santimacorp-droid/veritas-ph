"""
apps/api/storage.py

Local filesystem storage client replacing MinIO.
"""

import logging
import os

logger = logging.getLogger(__name__)

# Base directory for local file storage (inside pb_data/storage)
STORAGE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../pb_data/storage"))


class APIDocumentStore:
    def __init__(self):
        self._base_dir = STORAGE_DIR
        os.makedirs(self._base_dir, exist_ok=True)

    def presign_url(self, storage_path: str, expires_hours: int = 1) -> str | None:
        # Return local download proxy endpoint URL
        return f"http://localhost:8000/documents/download_path?path={storage_path}"

    def get_bytes(self, storage_path: str) -> bytes | None:
        full_path = os.path.join(self._base_dir, storage_path)
        if not os.path.exists(full_path):
            logger.warning(f"File not found: {full_path}")
            return None
        try:
            with open(full_path, "rb") as f:
                return f.read()
        except Exception as e:
            logger.warning(f"Failed to read file {full_path}: {e}")
            return None

    def put_bytes(self, storage_path: str, data: bytes, content_type: str = None) -> bool:
        full_path = os.path.join(self._base_dir, storage_path)
        if os.path.exists(full_path):
            logger.warning(f"Immutability violation: File already exists and cannot be overwritten: {full_path}")
            return False
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        try:
            with open(full_path, "wb") as f:
                f.write(data)
            try:
                os.chmod(full_path, 0o444)
            except Exception as e:
                logger.warning(f"Failed to make file read-only {full_path}: {e}")
            return True
        except Exception as e:
            logger.warning(f"Failed to write file {full_path}: {e}")
            return False

    def stat(self, storage_path: str) -> dict | None:
        full_path = os.path.join(self._base_dir, storage_path)
        if not os.path.exists(full_path):
            return None
        try:
            stat_info = os.stat(full_path)
            return {
                "size": stat_info.st_size,
                "content_type": "application/pdf"
                if storage_path.endswith(".pdf")
                else "application/octet-stream",
                "last_modified": stat_info.st_mtime,
                "etag": str(stat_info.st_mtime),
            }
        except Exception:
            return None


_store: APIDocumentStore | None = None


def get_api_store() -> APIDocumentStore:
    global _store
    if _store is None:
        _store = APIDocumentStore()
    return _store
