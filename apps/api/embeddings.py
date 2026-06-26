import os

import httpx
import numpy as np
import structlog

logger = structlog.get_logger()


async def generate_embedding(text: str) -> list[float]:
    """
    Generates a 1536-dimensional embedding vector for the given text.
    (1536 matches OpenAI text-embedding-3-small)
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if api_key and api_key != "your_key_here" and not api_key.startswith("your_"):
        try:
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
            payload = {
                "input": text,
                "model": "text-embedding-3-small"
            }
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post("https://api.openai.com/v1/embeddings", json=payload, headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    return data["data"][0]["embedding"]
                else:
                    logger.warn(f"OpenAI Embeddings API returned status {response.status_code}: {response.text}")
        except Exception as e:
            logger.error(f"Error calling OpenAI Embeddings: {e}")

    # Fallback to deterministic mock
    seed = sum(ord(c) for c in text)
    rng = np.random.default_rng(seed)
    vector = rng.standard_normal(1536).tolist()

    # Normalize vector to unit length
    norm = np.linalg.norm(vector)
    return (np.array(vector) / norm).tolist()
