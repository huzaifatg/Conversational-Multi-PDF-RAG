import type { SourceCitation } from '@/lib/types';
import { getDocumentFileUrl } from '@/lib/api';

export function SourceList({ sources }: { sources: SourceCitation[] }) {
  if (!sources.length) return null;

  // Group by file
  const grouped = sources.reduce((acc, source) => {
    if (!acc[source.file]) {
      acc[source.file] = { pages: new Set<number>() };
    }
    if (source.page !== undefined && source.page !== null) {
      acc[source.file].pages.add(source.page);
    }
    return acc;
  }, {} as Record<string, { pages: Set<number> }>);

  return (
    <div className="mt-5 flex flex-col gap-2.5">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-textTertiary">Sources</div>
      <div className="flex flex-wrap gap-2">
        {Object.entries(grouped).map(([file, data], index) => {
          const pagesArr = Array.from(data.pages).sort((a, b) => a - b);
          let pageText = '';
          if (pagesArr.length === 1) pageText = ` · p.${pagesArr[0]}`;
          else if (pagesArr.length > 1) pageText = ` · pp. ${pagesArr.join(', ')}`;
          
          return (
            <a
              key={`${file}-${index}`}
              href={getDocumentFileUrl(file)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded-md border border-border bg-surface px-2.5 py-1 text-[12px] font-medium text-textSecondary transition-colors hover:border-borderStrong hover:bg-surfaceHover hover:text-textPrimary"
            >
              <span className="truncate max-w-[200px]">{file}</span>
              <span className="shrink-0">{pageText}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
