import type { ChatMessage } from '@/lib/types';
import { SourceList } from '@/components/source-list';
import ReactMarkdown from 'react-markdown';
import { Bot } from 'lucide-react';

export function MessageBubble({ message, onCopy }: { message: ChatMessage; onCopy: (text: string) => void }) {
  const isUser = message.role === 'user';
  const isError = Boolean(message.error);

  if (isUser) {
    return (
      <div className="flex animate-fade-in justify-end w-full">
        <div className="max-w-[min(720px,92vw)] rounded-2xl bg-surfaceHover px-5 py-3.5 text-[15px] leading-relaxed text-textPrimary">
          <div className="whitespace-pre-wrap">{message.content}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex animate-fade-in justify-start w-full">
      <div className="flex w-full max-w-[min(840px,100vw)] flex-col rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]/80 shadow-[0_2px_12px_rgba(0,0,0,0.02)] p-5 md:p-6">
        <div className="flex items-start gap-4 md:gap-5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-slate-700 border border-slate-200 shadow-sm mt-0.5">
            <Bot className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[15px] leading-relaxed markdown-body">
              {isError ? (
                <div className="rounded-xl bg-danger/10 p-4 text-danger whitespace-pre-wrap">{message.content}</div>
              ) : (
                <ReactMarkdown>{message.content}</ReactMarkdown>
              )}
            </div>

            {!isError && (
              <div className="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => onCopy(message.content)}
                  className="rounded-md px-2 py-1 -ml-2 text-[13px] font-medium text-textTertiary transition-colors hover:bg-surfaceHover hover:text-textSecondary"
                >
                  Copy
                </button>
              </div>
            )}

            {!isError && message.sources ? (
              <div className="mt-2 border-t border-border/50 pt-4">
                <SourceList sources={message.sources} />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
