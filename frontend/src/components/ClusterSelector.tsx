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
      className='h-8 rounded border border-[var(--color-header-control-border)] bg-[var(--color-header-control-bg)] px-2.5 text-xs text-[var(--color-header-text)] focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] focus:outline-none transition-colors'
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
