interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const normalized = status.toLowerCase();

  const colorMap: Record<string, string> = {
    running:
      'bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-400',
    succeeded:
      'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
    pending:
      'bg-yellow-50 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-400',
    failed: 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-400',
    unknown: 'bg-gray-100 text-gray-600 dark:bg-gray-500/15 dark:text-gray-400',
  };

  const classes =
    colorMap[normalized] ??
    'bg-gray-100 text-gray-600 dark:bg-gray-500/15 dark:text-gray-400';

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${classes}`}
    >
      {status}
    </span>
  );
}
