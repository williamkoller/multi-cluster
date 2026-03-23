import type { ClusterSummary } from '../types';

interface OverviewCardsProps {
  clusters: ClusterSummary[];
  loading: boolean;
}

function RingGauge({
  value,
  total,
  size = 48,
  strokeWidth = 4,
}: {
  value: number;
  total: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = total > 0 ? value / total : 0;
  const offset = circumference * (1 - pct);
  const color =
    pct === 1
      ? 'var(--color-health-green)'
      : pct >= 0.5
        ? 'var(--color-health-yellow)'
        : 'var(--color-health-red)';

  return (
    <svg width={size} height={size} className='-rotate-90'>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill='none'
        stroke='var(--color-border)'
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill='none'
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap='round'
        className='transition-all duration-500'
      />
    </svg>
  );
}

export function OverviewCards({ clusters, loading }: OverviewCardsProps) {
  if (loading && clusters.length === 0) {
    return (
      <div className='flex items-center justify-center py-24 text-sm text-[var(--color-text-muted)]'>
        <svg
          className='h-5 w-5 animate-spin mr-2'
          viewBox='0 0 24 24'
          fill='none'
        >
          <circle
            className='opacity-25'
            cx='12'
            cy='12'
            r='10'
            stroke='currentColor'
            strokeWidth='4'
          />
          <path
            className='opacity-75'
            fill='currentColor'
            d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z'
          />
        </svg>
        Loading clusters…
      </div>
    );
  }

  if (clusters.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center py-24 text-[var(--color-text-muted)]'>
        <svg
          className='h-12 w-12 mb-3 opacity-30'
          fill='none'
          viewBox='0 0 24 24'
          strokeWidth='1'
          stroke='currentColor'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            d='M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9'
          />
        </svg>
        <p className='text-sm'>No clusters connected</p>
      </div>
    );
  }

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

  const summaryItems = [
    {
      label: 'Clusters',
      value: clusters.length,
      sub: `${clusters.filter((c) => c.status === 'Connected').length} connected`,
    },
    {
      label: 'Namespaces',
      value: totals.namespaces,
      sub: `across ${clusters.length} clusters`,
    },
    { label: 'Pods', value: totals.pods, sub: `${totals.podsRunning} running` },
    {
      label: 'Deployments',
      value: totals.deployments,
      sub: `${totals.deploymentsAvailable} available`,
    },
    { label: 'Services', value: totals.services, sub: 'total' },
    { label: 'Nodes', value: totals.nodes, sub: `${totals.nodesReady} ready` },
    { label: 'Ingresses', value: totals.ingresses, sub: 'total' },
  ];

  return (
    <div className='space-y-6'>
      {/* Summary tiles */}
      <div className='grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7'>
        {summaryItems.map((item) => (
          <div
            key={item.label}
            className='rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4'
          >
            <p className='text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-1'>
              {item.label}
            </p>
            <p className='text-2xl font-semibold tabular-nums text-[var(--color-text-primary)] leading-none'>
              {item.value}
            </p>
            <p className='text-[10px] text-[var(--color-text-muted)] mt-1'>
              {item.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Cluster cards */}
      <div>
        <h2 className='text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)] mb-3'>
          Clusters
        </h2>
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {clusters.map((c) => {
            const allHealthy =
              c.podsRunning === c.pods &&
              c.nodesReady === c.nodes &&
              c.deploymentsAvailable === c.deployments;

            return (
              <div
                key={c.name}
                className='rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden'
              >
                {/* Card header */}
                <div className='flex items-center justify-between px-5 py-3 border-b border-[var(--color-border-subtle)]'>
                  <div className='flex items-center gap-2.5'>
                    <span className='relative flex h-2.5 w-2.5'>
                      <span
                        className={`absolute inline-flex h-full w-full rounded-full opacity-40 ${c.status === 'Connected' ? 'bg-[var(--color-health-green)] animate-ping' : 'bg-[var(--color-health-red)]'}`}
                      />
                      <span
                        className={`relative inline-flex h-2.5 w-2.5 rounded-full ${c.status === 'Connected' ? 'bg-[var(--color-health-green)]' : 'bg-[var(--color-health-red)]'}`}
                      />
                    </span>
                    <h3 className='text-sm font-semibold text-[var(--color-text-primary)]'>
                      {c.name}
                    </h3>
                  </div>
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      allHealthy
                        ? 'bg-[var(--color-health-green)]/10 text-[var(--color-health-green)]'
                        : c.podsFailed > 0
                          ? 'bg-[var(--color-health-red)]/10 text-[var(--color-health-red)]'
                          : 'bg-[var(--color-health-yellow)]/10 text-[var(--color-health-yellow)]'
                    }`}
                  >
                    {allHealthy
                      ? 'Healthy'
                      : c.podsFailed > 0
                        ? 'Degraded'
                        : 'Progressing'}
                  </span>
                </div>

                {/* Gauges row */}
                <div className='grid grid-cols-3 divide-x divide-[var(--color-border-subtle)] px-2 py-4'>
                  {[
                    { label: 'Pods', value: c.podsRunning, total: c.pods },
                    {
                      label: 'Deploys',
                      value: c.deploymentsAvailable,
                      total: c.deployments,
                    },
                    { label: 'Nodes', value: c.nodesReady, total: c.nodes },
                  ].map((g) => (
                    <div
                      key={g.label}
                      className='flex flex-col items-center gap-1'
                    >
                      <div className='relative'>
                        <RingGauge value={g.value} total={g.total} />
                        <span className='absolute inset-0 flex items-center justify-center text-[10px] font-semibold tabular-nums text-[var(--color-text-primary)]'>
                          {g.total > 0
                            ? Math.round((g.value / g.total) * 100)
                            : 0}
                          %
                        </span>
                      </div>
                      <p className='text-[10px] text-[var(--color-text-muted)]'>
                        {g.label}
                      </p>
                      <p className='text-[10px] tabular-nums text-[var(--color-text-secondary)]'>
                        {g.value}/{g.total}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Resource counts footer */}
                <div className='flex items-center justify-between px-5 py-2.5 bg-[var(--color-surface-raised)] border-t border-[var(--color-border-subtle)] text-[10px] text-[var(--color-text-muted)]'>
                  <span>{c.services} services</span>
                  <span>{c.ingresses} ingresses</span>
                  <span>{c.namespaces} namespaces</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
