export type SourceCitation = {
  file: string;
  page?: number | null;
  source_path?: string | null;
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: SourceCitation[];
  error?: boolean;
};

export type DocumentInfo = {
  file: string;
  source_path: string;
  upload_date: string;
  page_count?: number | null;
  status: string;
};

export type IndexStatus = {
  status: string;
  message?: string;
  started_at?: string | null;
  finished_at?: string | null;
  updated_at?: string | null;
  indexed_files?: string[];
  error?: string | null;
};
