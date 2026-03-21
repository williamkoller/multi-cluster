interface NamespaceFilterProps {
  value: string;
  onChange: (ns: string) => void;
}

export function NamespaceFilter({ value, onChange }: NamespaceFilterProps) {
  return (
    <input
      type='text'
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder='Filter by namespace...'
      className='h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] focus:outline-none transition-colors'
    />
  );
}
