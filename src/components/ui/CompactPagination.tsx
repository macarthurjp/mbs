import { ChevronLeft, ChevronRight } from 'lucide-react';

type CompactPaginationProps = {
  currentPage: number;
  totalPages: number;
  start: number;
  end: number;
  total: number;
  onPageChange: (page: number) => void;
  previousLabel: string;
  nextLabel: string;
  ofLabel: string;
  showPageCount?: boolean;
};

export function CompactPagination({
  currentPage,
  totalPages,
  start,
  end,
  total,
  onPageChange,
  previousLabel,
  nextLabel,
  ofLabel,
  showPageCount = true,
}: CompactPaginationProps) {
  return (
    <nav
      className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-[#e9e2d3] bg-[#fbfaf7] p-2 shadow-sm sm:p-3"
      aria-label={`${currentPage} / ${totalPages}`}
    >
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage <= 1}
        aria-label={previousLabel}
        title={previousLabel}
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#e9e2d3] bg-white text-[#050505] transition hover:border-[#f4c542] hover:bg-[#fff9e8] disabled:cursor-not-allowed disabled:opacity-35"
      >
        <ChevronLeft size={19} />
      </button>

      <div className="min-w-0 text-center">
        {showPageCount && (
          <p className="whitespace-nowrap text-xs font-black text-[#050505]">
            {currentPage.toLocaleString('en-US')} / {totalPages.toLocaleString('en-US')}
          </p>
        )}
        <p className={`${showPageCount ? 'mt-0.5 text-[10px]' : 'text-xs'} whitespace-nowrap font-bold text-[#71717a]`}>
          {start.toLocaleString('en-US')}-{end.toLocaleString('en-US')} {ofLabel} {total.toLocaleString('en-US')}
        </p>
      </div>

      <button
        type="button"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage >= totalPages}
        aria-label={nextLabel}
        title={nextLabel}
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#e9e2d3] bg-white text-[#050505] transition hover:border-[#f4c542] hover:bg-[#fff9e8] disabled:cursor-not-allowed disabled:opacity-35"
      >
        <ChevronRight size={19} />
      </button>
    </nav>
  );
}
