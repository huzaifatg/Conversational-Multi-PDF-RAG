"use client";

import { useEffect, useState } from 'react';
import { FileUp, RefreshCw, Trash2, CheckCircle2, Loader2, AlertCircle, FileText } from 'lucide-react';

import { deletePdf, getDocumentFileUrl, getIndexStatus, listDocuments, reindexPdfs, uploadPdf } from '@/lib/api';
import type { DocumentInfo, IndexStatus } from '@/lib/types';

function StatusBadge({ status }: { status: string }) {
  if (status === 'indexed' || status === 'completed') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-success border border-success/20">
        <CheckCircle2 className="h-3 w-3" />
        Indexed
      </span>
    );
  }
  if (status === 'running' || status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent border border-accent/20">
        <Loader2 className="h-3 w-3 animate-spin" />
        Indexing
      </span>
    );
  }
  if (status === 'failed') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-danger/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-danger border border-danger/20">
        <AlertCircle className="h-3 w-3" />
        Failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-sidebar-surfaceHover px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-sidebar-textSecondary border border-sidebar-border">
      {status}
    </span>
  );
}

export function DocumentsManager() {
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [status, setStatus] = useState<IndexStatus | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  async function refresh() {
    const [docs, currentStatus] = await Promise.all([listDocuments(), getIndexStatus()]);
    setDocuments(docs);
    setStatus(currentStatus);
  }

  // Initial load now distinguishes "still loading" / "failed to load" / "no
  // documents yet" instead of treating a fetch failure the same as an empty
  // list (see M1 in the audit report).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refresh();
        if (!cancelled) setLoadError(null);
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : 'Could not reach the backend.');
        }
      } finally {
        if (!cancelled) setIsInitialLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Uploads are now indexed in the background (see H1). While a job is
  // running, poll for completion so the list updates without a manual
  // refresh; stop as soon as it's no longer running.
  useEffect(() => {
    if (status?.status !== 'running') return;
    const interval = setInterval(() => {
      refresh().catch(() => {
        /* transient poll failures aren't worth surfacing */
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [status?.status]);

  async function handleUpload(file: File | null) {
    if (!file) return;
    setLoading(true);
    setMessage('Uploading...');
    try {
      await uploadPdf(file);
      await refresh();
      setMessage('Upload complete. Indexing in the background \u2014 status will update automatically.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Upload failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(filename: string) {
    setLoading(true);
    try {
      await deletePdf(filename);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Delete failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleReindex() {
    setLoading(true);
    setMessage('Reindexing all documents...');
    try {
      await reindexPdfs();
      await refresh();
      setMessage('Reindexing completed.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Reindexing failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto border-r border-sidebar-border bg-sidebar-bg p-5">
      <div className="mb-5">
        <h2 className="text-sm font-semibold text-sidebar-textPrimary">Documents</h2>
        <p className="mt-1 text-xs text-sidebar-textSecondary">Upload and manage PDFs</p>
      </div>
      <div className="flex flex-col gap-5">
        <section className="rounded-xl border border-sidebar-border bg-sidebar-surface p-4 shadow-sm">
          <h3 className="text-sm font-medium text-sidebar-textPrimary">Upload PDF</h3>
          <p className="mt-1 text-[11px] text-sidebar-textSecondary">Files are indexed in the background.</p>

          <label className={`mt-3 flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-sidebar-borderStrong bg-sidebar-bg px-4 py-6 text-center transition-colors hover:border-sidebar-textTertiary hover:bg-sidebar-surfaceHover ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <FileUp className="h-5 w-5 text-sidebar-textSecondary" />
            <span className="mt-2 text-xs font-medium text-sidebar-textPrimary">Choose a PDF</span>
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              disabled={loading}
              onChange={(event) => void handleUpload(event.target.files?.[0] ?? null)}
            />
          </label>

          {message ? (
            <div className="mt-3 animate-fade-in rounded-md border border-sidebar-border bg-sidebar-bg p-2.5 text-[11px] text-sidebar-textSecondary">{message}</div>
          ) : null}

          {status?.status === 'running' && (
            <div className="mt-3 rounded-md border border-sidebar-border bg-sidebar-bg p-2.5 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sidebar-textPrimary">Indexing</span>
                <StatusBadge status={status.status} />
              </div>
              {status.message && <div className="mt-1 text-sidebar-textTertiary">{status.message}</div>}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-sidebar-border bg-sidebar-surface p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-medium text-sidebar-textPrimary">Uploaded PDFs</h3>
            <button
              type="button"
              onClick={() => void handleReindex()}
              disabled={loading}
              className="rounded p-1 text-sidebar-textSecondary hover:bg-sidebar-surfaceHover hover:text-sidebar-textPrimary disabled:opacity-40 transition-colors"
              title="Re-index all"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>

          {isInitialLoading ? (
            <div className="space-y-3" aria-live="polite" aria-busy="true">
              {[0, 1, 2].map((key) => (
                <div key={key} className="h-[78px] animate-pulse rounded-lg border border-sidebar-border bg-sidebar-bg/50" />
              ))}
            </div>
          ) : loadError ? (
            <div className="rounded-lg border border-danger/30 bg-danger/10 p-4 text-sm text-sidebar-textPrimary">
              <div className="font-medium text-danger">Couldn&apos;t load documents</div>
              <p className="mt-1 text-danger/80">{loadError}</p>
              <button
                type="button"
                onClick={() => {
                  setIsInitialLoading(true);
                  refresh()
                    .then(() => setLoadError(null))
                    .catch((error) => setLoadError(error instanceof Error ? error.message : 'Could not reach the backend.'))
                    .finally(() => setIsInitialLoading(false));
                }}
                className="mt-3 rounded-md border border-danger/20 px-3 py-1.5 text-xs text-danger transition-colors hover:bg-danger/20"
              >
                Try again
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div key={doc.file} className="rounded-lg border border-sidebar-border bg-sidebar-bg p-3.5 transition-colors hover:border-sidebar-borderStrong">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2.5">
                        <FileText className="h-4 w-4 text-sidebar-textTertiary shrink-0" />
                        <span className="truncate text-[13px] font-medium text-sidebar-textPrimary">{doc.file}</span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2 text-[11px] text-sidebar-textTertiary pl-6">
                        <StatusBadge status={doc.status} />
                        <span>&middot;</span>
                        <span>{new Date(doc.upload_date).toLocaleDateString()}</span>
                        <span>&middot;</span>
                        <span>{doc.page_count ?? '?'} pages</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <a
                        href={getDocumentFileUrl(doc.file)}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-md border border-sidebar-border px-2 py-1.5 text-[11px] text-sidebar-textSecondary transition-colors hover:bg-sidebar-surfaceHover hover:text-sidebar-textPrimary"
                      >
                        View
                      </a>
                      <button
                        type="button"
                        onClick={() => void handleDelete(doc.file)}
                        aria-label={`Delete ${doc.file}`}
                        className="rounded-md border border-sidebar-border p-1.5 text-sidebar-textSecondary transition-colors hover:border-danger/40 hover:bg-danger/10 hover:text-danger"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {!documents.length ? (
                <div className="rounded-lg border border-dashed border-sidebar-borderStrong p-6 text-center text-xs text-sidebar-textTertiary">
                  No PDFs yet. Upload one to get started.
                </div>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
