import type { ClusterSummary } from '../types';

interface OverviewCardsProps {
  clusters: ClusterSummary[];
  loading: boolean;
}

function HealthBar({
  healthy,
  total,
  label,
}: {
  healthy: number;
  total: number;
  label: string;
}) {
  const pct = total > 0 ? (healthy / total) * 100 : 0;
  const color =
    pct === 100
      ? 'bg-[var(--color-health-green)]'
      : pct >= 50
        ? 'bg-[var(--color-health-yellow)]'
        : 'bg-[var(--color-health-red)]';
  return (
    <div className='flex items-center gap-2'>
      <span className='w-20 text-xs text-[var(--color-text-muted)]'>
        {label}
      </span>
      <div className='flex-1 h-1.5 rounded-full bg-[var(--color-border)]'>
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className='text-xs tabular-nums text-[var(--color-text-secondary)] w-12 text-right'>
        {healthy}/{total}
      </span>
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <div className='text-center'>
      <p className='text-lg font-semibold tabular-nums text-[var(--color-text-primary)]'>
        {value}
      </p>
      <p className='text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]'>
        {label}
      </p>
    </div>
  );
}

export function OverviewCards({ clusters, loading }: OverviewCardsProps) {
  if (loading && clusters.length === 0) {
    return (
      <div className='flex items-center justify-center py-20 text-sm text-[var(--color-text-muted)]'>
        Loading cluster summary...
      </div>
    );
  }

  if (clusters.length === 0) {
    return (
      <div className='flex items-center justify-center py-20 text-sm text-[var(--color-text-muted)]'>
        No clusters found
      </div>
    );
  }

  // Aggregated totals
  const totals = clusters.reduce(
    (acc, c) => ({
      pods: acc.pods + c.pods,
      podsRunning: acc.podsRunning + c.podsRunning,
      deployments: acc.deployments + c.deployments,
      deploymentsAvailable: acc.deploymentsAvailable + c.deploymentsAvailable,
      services: acc.services + c.services,
      nodes: acc.nodes + c.nodes,
      nodesReady: acc.nodesReady + c.nodesReady,
      ingresses: acc.ingresses + c.ingresses,
      namespaces: acc.namespaces + c.namespaces,
    }),
    {
      pods: 0,
      podsRunning: 0,
      deployments: 0,
      deploymentsAvailable: 0,
      services: 0,
      nodes: 0,
      nodesReady: 0,
      ingresses: 0,
      namespaces: 0,
    },
  );

  return (
    <div className='space-y-6'>
      {/* Aggregated summary row */}
      <div className='grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-9'>
        <StatItem label='Clusters' value={clusters.length} />
        <StatItem label='Pods' value={totals.pods} />
        <StatItem label='Running' value={totals.podsRunning} />
        <StatItem label='Deploys' value={totals.deployments} />
        <StatItem label='Available' value={totals.deploymentsAvailable} />
        <StatItem label='Services' value={totals.services} />
        <StatItem label='Nodes' value={totals.nodes} />
        <StatItem label='Ready' value={totals.nodesReady} />
        <StatItem label='Ingresses' value={totals.ingresses} />
      </div>

      {/* Per-cluster cards */}
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
        {clusters.map((c) => {
          const allHealthy =
            c.podsRunning === c.pods &&
            c.nodesReady === c.nodes &&
            c.deploymentsAvailable === c.deployments;
          const borderColor = allHealthy
            ? 'border-l-[var(--color-health-green)]'
            : c.podsFailed > 0
              ? 'border-l-[var(--color-health-red)]'
              : 'border-l-[var(--color-health-yellow)]';

          return (
            <div
              key={c.name}
              className={`rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] border-l-4 ${borderColor} p-4 space-y-4`}
            >
              {/* Header */}
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${c.status === 'Connected' ? 'bg-[var(--color-health-green)]' : 'bg-[var(--color-health-red)]'}`}
                  />
                  <h3 className='text-sm font-semibold font-mono text-[var(--color-text-primary)]'>
                    {c.name}
                  </h3>
                </div>
                <span className='text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]'>
                  {c.status}
                </span>
              </div>

              {/* Resource counts */}
              <div className='grid grid-cols-4 gap-2'>
                <div>
                  <p className='text-base font-semibold tabular-nums text-[var(--color-text-primary)]'>
                    {c.pods}
                  </p>
                  <p className='text-[10px] text-[var(--color-text-muted)]'>
                    Pods
                  </p>
                </div>
                <div>
                  <p className='text-base font-semibold tabular-nums text-[var(--color-text-primary)]'>
                    {c.deployments}
                  </p>
                  <p className='text-[10px] text-[var(--color-text-muted)]'>
                    Deploys
                  </p>
                </div>
                <div>
                  <p className='text-base font-semibold tabular-nums text-[var(--color-text-primary)]'>
                    {c.services}
                  </p>
                  <p className='text-[10px] text-[var(--color-text-muted)]'>
                    Services
                  </p>
                </div>
                <div>
                  <p className='text-base font-semibold tabular-nums text-[var(--color-text-primary)]'>
                    {c.nodes}
                  </p>
                  <p className='text-[10px] text-[var(--color-text-muted)]'>
                    Nodes
                  </p>
                </div>
              </div>

              {/* Health bars */}
              <div className='space-y-2'>
                <HealthBar
                  healthy={c.podsRunning}
                  total={c.pods}
                  label='Pods'
                />
                <HealthBar
                  healthy={c.deploymentsAvailable}
                  total={c.deployments}
                  label='Deploys'
                />
                <HealthBar
                  healthy={c.nodesReady}
                  total={c.nodes}
                  label='Nodes'
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
