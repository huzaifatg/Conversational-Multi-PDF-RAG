import type { ChatMessage, DocumentInfo, IndexStatus, SourceCitation } from '@/lib/types';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

// Single source of truth for building a link to a stored PDF, so the API
// base URL is never hardcoded at the call site (see H2 in the audit report).
export function getDocumentFileUrl(filename: string): string {
  return `${API_BASE_URL}/documents/${encodeURIComponent(filename)}`;
}

async function safeFetch(url: string, options?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, options);
  } catch (error: any) {
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      throw new Error(
        `Backend connection failed (${API_BASE_URL}). ` +
        `Verify that the FastAPI server is running, the URL is correct, and CORS is configured to allow this frontend.`
      );
    }
    throw error;
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const message = data?.detail || `Request failed with status ${response.status}.`;
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export async function sendChat(query: string, history: {role: string, content: string}[] = []): Promise<{ answer: string; sources: SourceCitation[] }> {
  const response = await safeFetch(`${API_BASE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, history }),
  });

  return parseResponse(response);
}

export async function listDocuments(): Promise<DocumentInfo[]> {
  const response = await safeFetch(`${API_BASE_URL}/documents`, { cache: 'no-store' });
  return parseResponse(response);
}

export async function getIndexStatus(): Promise<IndexStatus> {
  const response = await safeFetch(`${API_BASE_URL}/documents/status`, { cache: 'no-store' });
  return parseResponse(response);
}

export async function uploadPdf(file: File): Promise<{ message: string; document: DocumentInfo }> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await safeFetch(`${API_BASE_URL}/documents/upload`, {
    method: 'POST',
    body: formData,
  });

  return parseResponse(response);
}

export async function deletePdf(filename: string): Promise<IndexStatus> {
  const response = await safeFetch(`${API_BASE_URL}/documents/${encodeURIComponent(filename)}`, {
    method: 'DELETE',
  });

  return parseResponse(response);
}

export async function reindexPdfs(): Promise<IndexStatus> {
  const response = await safeFetch(`${API_BASE_URL}/documents/reindex`, {
    method: 'POST',
  });

  return parseResponse(response);
}
