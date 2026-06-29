from __future__ import annotations

from fastapi import HTTPException
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

from pathlib import Path

from backend.rag.embeddings import get_embeddings
from backend.rag.vector_store import delete_collection_if_exists, delete_document_from_collection
from backend.services.document_service import get_document_paths
from backend.utils.config import settings
from backend.utils.logger import get_logger
from backend.utils.state import read_state, set_index_status

logger = get_logger(__name__)


def _annotate_pages(pdf_path: Path):
    try:
        loader = PyPDFLoader(file_path=str(pdf_path))
        pages = loader.load()
    except Exception as e:
        logger.warning(f"Failed to load {pdf_path}: {e}")
        return []

    for page in pages:
        metadata = dict(page.metadata or {})
        page_number = metadata.get("page_label")
        if page_number is None:
            raw_page = metadata.get("page")
            page_number = int(raw_page) + 1 if raw_page is not None else 1

        try:
            page_number = int(page_number)
        except Exception:
            page_number = 1

        metadata.update(
            {
                "file": pdf_path.name,
                "file_name": pdf_path.name,
                "page": page_number,
                "page_number": page_number,
                "source_path": str(pdf_path.resolve()),
            }
        )
        page.metadata = metadata

    return pages


def index_document(pdf_path: Path) -> None:
    delete_document_from_collection(pdf_path.name)
    pages = _annotate_pages(pdf_path)
    if not pages:
        return

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
    )
    chunks = splitter.split_documents(pages)
    if not chunks:
        return

    from langchain_qdrant import QdrantVectorStore

    QdrantVectorStore.from_documents(
        documents=chunks,
        embedding=get_embeddings(),
        url=settings.qdrant_url,
        collection_name=settings.qdrant_collection,
        force_recreate=False,
        timeout=settings.qdrant_timeout_seconds,
    )


def index_document_and_track(pdf_path: Path) -> None:
    """Index a single uploaded document and persist the resulting status.

    This is the function the upload route schedules via FastAPI's
    BackgroundTasks (see H1 in the audit report). It exists because
    index_document() previously ran inline inside the upload request and had
    no error handling: a failure raised an unhandled exception with nothing
    recorded in index_state.json, unlike index_all_documents() which already
    tracks "running" / "completed" / "failed". This wrapper applies that same
    pattern to the single-file path so a failure is visible to the frontend
    via /documents/status, regardless of whether indexing runs in the request
    or in the background.
    """
    state = read_state()
    indexed_files = state.get("indexed_files", [])

    try:
        index_document(pdf_path)
    except Exception as exc:
        logger.error(f"Failed to index {pdf_path.name}: {exc}")
        set_index_status(
            "failed",
            message=f"Failed to index {pdf_path.name}.",
            indexed_files=indexed_files,
            error=str(exc),
        )
        return

    if pdf_path.name not in indexed_files:
        indexed_files.append(pdf_path.name)
    set_index_status(
        "completed",
        message=f"Indexed {pdf_path.name}.",
        indexed_files=indexed_files,
    )


def index_all_documents() -> dict:
    pdf_paths = get_document_paths()
    if not pdf_paths:
        delete_collection_if_exists()
        set_index_status(
            "completed",
            message="No PDF documents were found. Collection cleared.",
            indexed_files=[],
        )
        return {"message": "Collection cleared.", "indexed_files": []}

    indexed_files = [path.name for path in pdf_paths]
    set_index_status("running", message="Indexing documents...", indexed_files=indexed_files)

    try:
        all_pages = []
        for pdf_path in pdf_paths:
            all_pages.extend(_annotate_pages(pdf_path))

        delete_collection_if_exists()

        if not all_pages:
            state = set_index_status(
                "completed",
                message="No text could be extracted from any PDFs.",
                indexed_files=indexed_files,
            )
            return {"message": state["message"], "indexed_files": indexed_files}

        splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.chunk_size,
            chunk_overlap=settings.chunk_overlap,
        )
        chunks = splitter.split_documents(all_pages)
        if not chunks:
            state = set_index_status(
                "completed",
                message="No text could be extracted from any PDFs.",
                indexed_files=indexed_files,
            )
            return {"message": state["message"], "indexed_files": indexed_files}

        from langchain_qdrant import QdrantVectorStore

        QdrantVectorStore.from_documents(
            documents=chunks,
            embedding=get_embeddings(),
            url=settings.qdrant_url,
            collection_name=settings.qdrant_collection,
            force_recreate=True,
            timeout=settings.qdrant_timeout_seconds,
        )

        state = set_index_status(
            "completed",
            message=f"Indexed {len(pdf_paths)} PDF(s).",
            indexed_files=indexed_files,
        )
        return {"message": state["message"], "indexed_files": indexed_files}
    except HTTPException:
        raise
    except Exception as exc:
        set_index_status(
            "failed",
            message="Indexing failed.",
            indexed_files=indexed_files,
            error=str(exc),
        )
        raise HTTPException(status_code=500, detail=f"Indexing failed: {exc}") from exc
