from fastapi import APIRouter

from backend.models.schemas import ChatRequest, ChatResponse
from backend.services.answer_service import answer_query


router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest) -> ChatResponse:
    return answer_query(request.query, history=request.history)
