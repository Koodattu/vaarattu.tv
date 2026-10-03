interface PaginationProps {
  page: number;
  totalPages: number;
  disabled?: boolean;
  onPageChange: (page: number) => void;
  previousLabel?: string;
  nextLabel?: string;
}

export function Pagination({ page, totalPages, disabled, onPageChange, previousLabel = "Previous", nextLabel = "Next" }: PaginationProps) {
  const buttonClass = "min-h-11 rounded-md bg-gray-800 px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed";
  return (
    <nav aria-label="Pagination" className="mt-6 flex flex-wrap items-center justify-center gap-3">
      <button type="button" className={buttonClass} disabled={disabled || page <= 1} onClick={() => onPageChange(page - 1)}>{previousLabel}</button>
      <span className="text-sm text-gray-400" aria-live="polite">Page {page} of {Math.max(page, totalPages, 1)}</span>
      <button type="button" className={buttonClass} disabled={disabled || page >= totalPages} onClick={() => onPageChange(page + 1)}>{nextLabel}</button>
    </nav>
  );
}
