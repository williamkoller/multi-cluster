interface SearchBarProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

export function SearchBar({
  value,
  onChange,
  placeholder = 'Search...',
}: SearchBarProps) {
  return (
    <div className='relative'>
      <svg
        className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]'
        fill='none'
        viewBox='0 0 24 24'
        strokeWidth='2'
        stroke='currentColor'
      >
        <path
          strokeLinecap='round'
          strokeLinejoin='round'
          d='M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z'
        />
      </svg>
      <input
        type='text'
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className='h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] py-2 pl-10 pr-3 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] focus:outline-none transition-colors'
      />
    </div>
  );
}
