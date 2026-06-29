from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.routes.chat import router as chat_router
from backend.api.routes.documents import router as documents_router
from backend.api.routes.health import router as health_router
from backend.utils.config import settings


app = FastAPI(title="Local RAG API", version="1.0.0")

# allow_origins is environment-driven (ALLOWED_ORIGINS, comma-separated) so the
# deployed frontend domain can be added in production without touching code.
# Defaults to the local Next.js dev server when unset.
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.allowed_origins),
    allow_origin_regex=r"^http://(localhost|127\.0\.0\.1)(:[0-9]+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(chat_router)
app.include_router(documents_router)


# Note: settings.documents_dir is already created at import time in
# backend/utils/config.py, so no separate startup hook is needed here.


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
