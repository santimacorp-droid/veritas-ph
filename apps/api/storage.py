"""
apps/api/storage.py

MinIO client for the FastAPI layer.
Used by document download / proxy endpoints.

Same config as workers/crawler/storage.py — reads from environment.
"""

from __future__ import annotations

import io
import logging
import os
from datetime import timedelta
from typing import Optional

from minio import Minio
from minio.error import S3Error

logger = logging.getLogger(__name__)

MINIO_ENDPOINT   = os.getenv("MINIO_ENDPOINT",   "localhost:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY",  "veritas")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY",  "veritas_dev_secret")
MINIO_BUCKET     = os.getenv("MINIO_BUCKET",       "veritas-docs")
MINIO_SECURE     = os.getenv("MINIO_SECURE", "0") == "1"


class APIDocumentStore:
    def __init__(self):
        self._client = Minio(
            MINIO_ENDPOINT,
            access_key=MINIO_ACCESS_KEY,
            secret_key=MINIO_SECRET_KEY,
            secure=MINIO_SECURE,
        )
        self._bucket = MINIO_BUCKET

    def presign_url(self, storage_path: str, expires_hours: int = 1) -> Optional[str]:
        try:
            return self._client.presigned_get_object(
                self._bucket,
                storage_path,
                expires=timedelta(hours=expires_hours),
            )
        except S3Error as e:
            logger.warning(f"presign_url failed for {storage_path}: {e}")
            return None

    def get_bytes(self, storage_path: str) -> Optional[bytes]:
        response = None
        try:
            response = self._client.get_object(self._bucket, storage_path)
            return response.read()
        except S3Error as e:
            logger.warning(f"MinIO get failed for {storage_path}: {e}")
            return None
        finally:
            if response:
                response.close()
                response.release_conn()

    def stat(self, storage_path: str) -> Optional[dict]:
        try:
            info = self._client.stat_object(self._bucket, storage_path)
            return {
                "size":          info.size,
                "content_type":  info.content_type,
                "last_modified": info.last_modified.isoformat() if info.last_modified else None,
                "etag":          info.etag,
            }
        except S3Error:
            return None


_store: Optional[APIDocumentStore] = None


def get_api_store() -> APIDocumentStore:
    global _store
    if _store is None:
        _store = APIDocumentStore()
    return _store
