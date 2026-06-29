from fastapi import APIRouter, BackgroundTasks, File, HTTPException, UploadFile
from fastapi.responses import FileResponse

from backend.models.schemas import DocumentInfo, IndexStatusResponse, UploadResponse
from backend.services.document_service import (
    build_document_info,
    delete_document,
    list_documents,
    sanitize_filename,
    save_uploaded_pdf,
)
from backend.services.index_service import index_all_documents, index_document_and_track
from backend.utils.config import settings
from backend.utils.state import read_state, set_index_status
from backend.rag.vector_store import delete_document_from_collection


router = APIRouter()


@router.get("/documents", response_model=list[DocumentInfo])
def documents() -> list[DocumentInfo]:
    return list_documents()


@router.get("/documents/status", response_model=IndexStatusResponse)
def documents_status() -> IndexStatusResponse:
    return IndexStatusResponse(**read_state())


@router.get("/documents/{filename}")
def download_document(filename: str):
    # Reuse the same sanitize_filename() helper used for upload/delete so this
    # route can't be pointed at a path outside documents_dir (e.g. "..").
    safe_name = sanitize_filename(filename)
    file_path = settings.documents_dir / safe_name
    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="PDF not found.")
    return FileResponse(file_path, media_type="application/pdf", filename=safe_name)


@router.post("/documents/upload", response_model=UploadResponse)
def upload_document(background_tasks: BackgroundTasks, file: UploadFile = File(...)) -> UploadResponse:
    saved_path = save_uploaded_pdf(file)

    # Indexing (embedding + Qdrant upsert) runs in the background instead of
    # blocking this request. See H1 in the audit report: this was previously
    # synchronous and could exceed the Qdrant client's request timeout for
    # anything beyond a trivial PDF, with no error tracking on failure.
    # index_document_and_track() (in index_service.py) now records
    # "running" / "completed" / "failed" the same way bulk reindexing already
    # does, so /documents/status reflects real progress either way.
    state = read_state()
    set_index_status(
        "running",
        message=f"Indexing {saved_path.name}...",
        indexed_files=state.get("indexed_files", []),
    )
    background_tasks.add_task(index_document_and_track, saved_path)

    return UploadResponse(
        message="PDF uploaded. Indexing started in the background.",
        document=build_document_info(saved_path),
    )


@router.post("/documents/reindex", response_model=IndexStatusResponse)
def reindex_documents() -> IndexStatusResponse:
    index_all_documents()
    return IndexStatusResponse(**read_state())


@router.delete("/documents/{filename}", response_model=IndexStatusResponse)
def remove_document(filename: str) -> IndexStatusResponse:
    delete_document(filename)
    delete_document_from_collection(filename)
    
    # Update state
    state = read_state()
    indexed_files = state.get("indexed_files", [])
    if filename in indexed_files:
        indexed_files.remove(filename)
    set_index_status(state.get("status", "idle"), message="Document deleted.", indexed_files=indexed_files)
    
    return IndexStatusResponse(**read_state())
