from pydantic import BaseModel, Field


class HistoryItem(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    query: str = Field(min_length=1)
    history: list[HistoryItem] = []


class SourceCitation(BaseModel):
    file: str
    page: int | None = None
    source_path: str | None = None


class ChatResponse(BaseModel):
    answer: str
    sources: list[SourceCitation] = []


class DocumentInfo(BaseModel):
    file: str
    source_path: str
    upload_date: str
    page_count: int | None = None
    status: str = "indexed"


class IndexStatusResponse(BaseModel):
    status: str
    message: str = ""
    started_at: str | None = None
    finished_at: str | None = None
    updated_at: str | None = None
    indexed_files: list[str] = []
    error: str | None = None


class UploadResponse(BaseModel):
    message: str
    document: DocumentInfo
