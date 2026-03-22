interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const normalized = status.toLowerCase();

  const dotColor: Record<string, string> = {
    running: 'bg-[var(--color-health-green)]',
    succeeded: 'bg-[var(--color-accent)]',
    ready: 'bg-[var(--color-health-green)]',
    pending: 'bg-[var(--color-health-yellow)]',
    failed: 'bg-[var(--color-health-red)]',
    notready: 'bg-[var(--color-health-red)]',
    unknown: 'bg-[var(--color-health-grey)]',
  };

  const dot = dotColor[normalized] ?? 'bg-[var(--color-health-grey)]';

  return (
    <span className='inline-flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]'>
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      {status}
    </span>
  );
}
