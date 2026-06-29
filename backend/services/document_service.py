from __future__ import annotations

from datetime import datetime
from pathlib import Path

from fastapi import HTTPException, UploadFile
from langchain_community.document_loaders import PyPDFLoader

from backend.models.schemas import DocumentInfo
from backend.utils.config import settings
from backend.utils.state import read_state


def sanitize_filename(name: str) -> str:
    return Path(name).name


def is_pdf(name: str) -> bool:
    return name.lower().endswith(".pdf")


def get_document_paths() -> list[Path]:
    if settings.documents_dir.exists():
        pdfs = sorted(settings.documents_dir.glob("*.pdf"))
        if pdfs:
            return pdfs
    return []


def save_uploaded_pdf(upload: UploadFile) -> Path:
    filename = sanitize_filename(upload.filename or "")
    if not filename or not is_pdf(filename):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    payload = upload.file.read()
    if not payload:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    target_path = settings.documents_dir / filename
    target_path.write_bytes(payload)
    return target_path


def delete_document(filename: str) -> Path:
    safe_name = sanitize_filename(filename)
    target_path = settings.documents_dir / safe_name
    if not target_path.exists():
        raise HTTPException(status_code=404, detail="PDF not found.")
    target_path.unlink()
    return target_path


def build_document_info(path: Path) -> DocumentInfo:
    try:
        loader = PyPDFLoader(file_path=str(path))
        pages = loader.load()
        page_count = len(pages)
    except Exception:
        page_count = 0
    uploaded_at = datetime.fromtimestamp(path.stat().st_mtime).isoformat()
    state = read_state()
    status = "indexed" if path.name in state.get("indexed_files", []) else "pending"
    return DocumentInfo(
        file=path.name,
        source_path=str(path.resolve()),
        upload_date=uploaded_at,
        page_count=page_count,
        status=status,
    )


def list_documents() -> list[DocumentInfo]:
    return [build_document_info(path) for path in get_document_paths()]
