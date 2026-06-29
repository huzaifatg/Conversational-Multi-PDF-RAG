from functools import lru_cache

from langchain_qdrant import QdrantVectorStore
from qdrant_client import QdrantClient
from qdrant_client.http import models

from backend.rag.embeddings import get_embeddings
from backend.utils.config import settings


@lru_cache(maxsize=1)
def get_client() -> QdrantClient:
    # qdrant-client defaults to a 5-second request timeout when none is given
    # (DEFAULT_GRPC_TIMEOUT, reused as the REST fallback). That is too tight for
    # a synchronous upsert of a full document's worth of chunks, especially on
    # the first call when the embedding model is still loading into memory, and
    # is the documented root cause of the "timed out" indexing failure recorded
    # in backend/index_state.json. This only raises the client-side timeout; it
    # does not change the Qdrant schema, retrieval logic, or embedding behavior.
    return QdrantClient(url=settings.qdrant_url, timeout=settings.qdrant_timeout_seconds)


def collection_exists() -> bool:
    try:
        get_client().get_collection(settings.qdrant_collection)
        return True
    except Exception:
        return False


def delete_collection_if_exists() -> None:
    if collection_exists():
        get_client().delete_collection(settings.qdrant_collection)


def delete_document_from_collection(filename: str) -> None:
    if not collection_exists():
        return
    client = get_client()
    try:
        client.delete(
            collection_name=settings.qdrant_collection,
            points_selector=models.Filter(
                must=[
                    models.FieldCondition(
                        key="metadata.file_name",
                        match=models.MatchValue(value=filename),
                    )
                ]
            ),
        )
    except Exception:
        pass


def get_vector_store() -> QdrantVectorStore:
    return QdrantVectorStore.from_existing_collection(
        url=settings.qdrant_url,
        collection_name=settings.qdrant_collection,
        embedding=get_embeddings(),
        timeout=settings.qdrant_timeout_seconds,
    )
