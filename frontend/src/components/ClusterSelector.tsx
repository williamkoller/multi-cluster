interface ClusterSelectorProps {
  clusters: string[];
  selected: string;
  onChange: (cluster: string) => void;
}

export function ClusterSelector({
  clusters,
  selected,
  onChange,
}: ClusterSelectorProps) {
  return (
    <select
      value={selected}
      onChange={(e) => onChange(e.target.value)}
      className='h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] focus:outline-none transition-colors'
    >
      <option value=''>All Clusters</option>
      {clusters.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  );
}
