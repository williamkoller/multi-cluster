interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  if (total === 0) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className='mt-4 flex items-center justify-between'>
      <p className='text-sm text-[var(--color-text-secondary)]'>
        Showing <span className='font-medium'>{start}</span> to{' '}
        <span className='font-medium'>{end}</span> of{' '}
        <span className='font-medium'>{total}</span> results
      </p>
      <div className='flex items-center gap-3'>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className='rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] focus:outline-none transition-colors'
        >
          {[25, 50, 100, 200].map((s) => (
            <option key={s} value={s}>
              {s} / page
            </option>
          ))}
        </select>
        <nav className='flex items-center gap-1'>
          <button
            onClick={() => onPageChange(1)}
            disabled={page <= 1}
            className='rounded-md px-2 py-1 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-sunken)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors'
          >
            &laquo;
          </button>
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className='rounded-md px-2 py-1 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-sunken)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors'
          >
            &lsaquo;
          </button>
          <span className='px-3 py-1 text-sm font-medium text-[var(--color-text-primary)]'>
            {page} / {totalPages}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className='rounded-md px-2 py-1 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-sunken)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors'
          >
            &rsaquo;
          </button>
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={page >= totalPages}
            className='rounded-md px-2 py-1 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-sunken)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors'
          >
            &raquo;
          </button>
        </nav>
      </div>
    </div>
  );
}
