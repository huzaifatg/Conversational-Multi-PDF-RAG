# Local RAG

A self-hosted Retrieval-Augmented Generation app: upload PDFs, ask questions about them, and get answers with cited sources — all running on your own machine, with no data leaving it.

**Stack:** Next.js (TypeScript, Tailwind) · FastAPI · LangChain · Qdrant · HuggingFace embeddings · Ollama

## How it works

```
PDF upload  →  chunk (RecursiveCharacterTextSplitter)  →  embed (HuggingFace)  →  store (Qdrant)
                                                                                       │
question  →  query rewriting (using chat history)  →  embed  →  similarity search  →  top-k chunks  →  Ollama  →  answer + sources
```

- **Frontend** (`frontend/`) — a chat UI for asking questions, and a documents page for uploading/inspecting/deleting/reindexing PDFs.
- **Backend** (`backend/`) — a FastAPI service with three concerns kept separate: `api/routes` (HTTP layer), `services` (document handling, indexing, answering), and `rag` (embeddings + Qdrant client — the core retrieval logic).
- **Qdrant** — the vector database storing document chunk embeddings.
- **Ollama** — runs the local LLM that generates answers from retrieved chunks.

Uploaded PDFs are indexed in the background, so the upload request returns immediately; the Documents page polls for status until indexing finishes. The chat engine supports **Conversational Memory** and **History-Aware Query Rewriting** out of the box, allowing you to ask follow-up questions seamlessly.

## Prerequisites

- Python 3.11+
- Node.js 18+
- [Docker](https://docs.docker.com/get-docker/) (for Qdrant), or a Qdrant instance reachable some other way
- [Ollama](https://ollama.com) installed locally, with a model pulled (e.g. `ollama pull llama3`)

## Setup

Clone the repo, then start each piece in order:

**1. Qdrant**

```bash
docker compose up -d
```

This starts Qdrant on `localhost:6333` (see `docker-compose.yml`).

**2. Ollama**

```bash
ollama serve        # if not already running
ollama pull llama3   # or whichever model you configure below
```

**3. Backend**

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # optional but recommended
pip install -r requirements.txt
cp ../.env.example ../.env   # adjust if needed — see Configuration below
uvicorn main:app --reload --port 8000
```

**4. Frontend**

```bash
cd frontend
npm install
cp .env.example .env.local   # set NEXT_PUBLIC_API_BASE_URL if not localhost:8000
npm run dev
```

Visit `http://localhost:3000`, upload a PDF from the Documents page, and start asking questions once it finishes indexing.

**Optional — CLI scripts:** `index.py` and `chat.py` at the project root let you reindex or query from the command line (`python index.py`, `python chat.py`) without running the frontend, useful for quick local testing of the backend service layer.

## Configuration

All backend configuration is environment-driven (`backend/utils/config.py`), loaded from a `.env` file at the project root.

| Variable | Default | Purpose |
|---|---|---|
| `QDRANT_URL` | `http://localhost:6333` | Qdrant connection |
| `QDRANT_COLLECTION` | `learning_rag` | Collection name for document chunks |
| `QDRANT_TIMEOUT_SECONDS` | `60` | Client request timeout (see note below) |
| `OLLAMA_MODEL` | `llama3` | Model used to generate answers |
| `EMBEDDING_MODEL_NAME` | `sentence-transformers/all-MiniLM-L6-v2` | HuggingFace embedding model |
| `CHUNK_SIZE` / `CHUNK_OVERLAP` | `1000` / `400` | Text splitting parameters |
| `TOP_K` | `4` | Chunks retrieved per query |
| `ALLOWED_ORIGINS` | `http://localhost:3000,http://127.0.0.1:3000` | Comma-separated CORS allowlist — add your deployed frontend domain here in production. Note: all local dev ports (e.g. `localhost:3001`) are automatically allowed via regex. |

Frontend configuration (`frontend/.env.local`):

| Variable | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:8000` | Where the frontend reaches the backend |

## Design notes

A few decisions worth calling out, since they're easy to misread as oversights:

- **Indexing runs in the background, not inline with the upload request.** Embedding a PDF and upserting its chunks can take longer than a typical HTTP client's patience, especially on the first call while the embedding model loads into memory. The upload endpoint now schedules indexing via FastAPI's `BackgroundTasks` and returns immediately; the Documents page polls `/documents/status` until it completes.
- **The Qdrant client timeout is explicit (`QDRANT_TIMEOUT_SECONDS`, default 60s) rather than left at the library default (5s).** A 5-second window is tight for a batch upsert of a full document's chunks, and was the root cause of a recorded indexing failure during development.
- **No authentication on the API.** This is built for local/personal use. If you deploy a publicly reachable instance, put it behind some form of access control before sharing the link widely — the upload/delete/reindex endpoints are unauthenticated by design for local use, not by oversight.

## Project structure

```
backend/
  api/routes/      HTTP endpoints (chat, documents, health)
  services/        document handling, indexing orchestration, answer generation
  rag/             embeddings + Qdrant client (the core retrieval logic)
  models/          Pydantic request/response schemas
  utils/           config, logging, persisted index state
frontend/
  app/             Next.js App Router pages (chat, documents)
  components/      chat UI, document manager, message rendering
  lib/             API client, shared types
docker-compose.yml  Qdrant service
```

## Troubleshooting

- **Upload succeeds but indexing never finishes** — check the backend logs and confirm Ollama/Qdrant are both reachable at the URLs in your `.env`.
- **CORS errors in the browser** — make sure your frontend's origin is listed in `ALLOWED_ORIGINS`.
- **Empty or low-quality answers** — confirm at least one PDF shows `indexed` status on the Documents page before asking questions; the LLM only knows what's been indexed.
