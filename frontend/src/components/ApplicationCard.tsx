import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import type { ApplicationInfo, HealthStatus, SyncStatus } from '../types';

interface ApplicationCardProps {
  apps: ApplicationInfo[];
  loading: boolean;
  onSync: (cluster: string, namespace: string, name: string) => Promise<void>;
  onScale: (
    cluster: string,
    namespace: string,
    name: string,
    replicas: number,
  ) => Promise<void>;
  onRefresh: () => void;
  onDeletePod: (
    cluster: string,
    namespace: string,
    pod: string,
  ) => Promise<void>;
  onViewLogs: (cluster: string, namespace: string, pod: string) => void;
}

const healthConfig: Record<
  HealthStatus,
  { color: string; icon: string; bg: string; ringColor: string }
> = {
  Healthy: {
    color: 'text-[var(--color-health-green)]',
    bg: 'bg-[var(--color-health-green)]',
    ringColor: 'ring-[var(--color-health-green)]',
    icon: '✓',
  },
  Progressing: {
    color: 'text-[var(--color-health-yellow)]',
    bg: 'bg-[var(--color-health-yellow)]',
    ringColor: 'ring-[var(--color-health-yellow)]',
    icon: '↻',
  },
  Degraded: {
    color: 'text-[var(--color-health-red)]',
    bg: 'bg-[var(--color-health-red)]',
    ringColor: 'ring-[var(--color-health-red)]',
    icon: '✗',
  },
  Suspended: {
    color: 'text-[var(--color-health-grey)]',
    bg: 'bg-[var(--color-health-grey)]',
    ringColor: 'ring-[var(--color-health-grey)]',
    icon: '‖',
  },
  Missing: {
    color: 'text-[var(--color-health-grey)]',
    bg: 'bg-[var(--color-health-grey)]',
    ringColor: 'ring-[var(--color-health-grey)]',
    icon: '?',
  },
  Unknown: {
    color: 'text-[var(--color-health-grey)]',
    bg: 'bg-[var(--color-health-grey)]',
    ringColor: 'ring-[var(--color-health-grey)]',
    icon: '?',
  },
};

const syncConfig: Record<
  SyncStatus,
  { color: string; label: string; icon: string }
> = {
  Synced: {
    color: 'text-[var(--color-health-green)]',
    label: 'Synced',
    icon: '✓',
  },
  OutOfSync: {
    color: 'text-[var(--color-sync-yellow)]',
    label: 'OutOfSync',
    icon: '⟳',
  },
  Unknown: {
    color: 'text-[var(--color-health-grey)]',
    label: 'Unknown',
    icon: '?',
  },
};

function ResourceTree({
  app,
  onDeletePod,
  onViewLogs,
  deletingPod,
}: {
  app: ApplicationInfo;
  onDeletePod: (cluster: string, ns: string, pod: string) => void;
  onViewLogs: (cluster: string, ns: string, pod: string) => void;
  deletingPod: string | null;
}) {
  const kindGroups: Record<string, typeof app.resources> = {};
  for (const r of app.resources) {
    if (!kindGroups[r.kind]) kindGroups[r.kind] = [];
    kindGroups[r.kind].push(r);
  }

  const kindIcons: Record<string, string> = {
    Deployment: '⎈',
    Pod: '◉',
    Service: '◈',
    ReplicaSet: '⊞',
  };

  return (
    <div className='space-y-3'>
      {Object.entries(kindGroups).map(([kind, items]) => (
        <div key={kind}>
          <div className='flex items-center gap-1.5 mb-1.5'>
            <span className='text-xs text-[var(--color-text-muted)]'>
              {kindIcons[kind] ?? '○'}
            </span>
            <span className='text-[10px] font-medium uppercase tracking-wider text-[var(--color-text-muted)]'>
              {kind}
            </span>
            <span className='text-[10px] tabular-nums text-[var(--color-text-muted)]'>
              ({items.length})
            </span>
          </div>
          <div className='space-y-0.5 pl-4 border-l-2 border-[var(--color-border-subtle)]'>
            {items.slice(0, 12).map((r) => {
              const cfg = healthConfig[r.health] ?? healthConfig.Unknown;
              const podKey = `${app.cluster}-${r.namespace}-${r.name}`;
              return (
                <div
                  key={`${r.kind}-${r.name}`}
                  className='group flex items-center justify-between rounded-md px-2.5 py-1.5 hover:bg-[var(--color-surface-inset)] transition-colors'
                >
                  <div className='flex items-center gap-2 min-w-0'>
                    <span
                      className={`h-1.5 w-1.5 rounded-full shrink-0 ${cfg.bg}`}
                    />
                    <span className='text-xs font-mono text-[var(--color-text-secondary)] truncate'>
                      {r.name}
                    </span>
                    <span className={`text-[10px] shrink-0 ${cfg.color}`}>
                      {r.status}
                    </span>
                  </div>
                  {kind === 'Pod' && (
                    <div className='flex items-center gap-0.5 shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity'>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewLogs(app.cluster, r.namespace, r.name);
                        }}
                        className='rounded p-1 text-[var(--color-text-muted)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent-subtle)] transition-colors'
                        title='View logs'
                      >
                        <svg
                          className='h-3 w-3'
                          fill='none'
                          viewBox='0 0 24 24'
                          strokeWidth='2'
                          stroke='currentColor'
                        >
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            d='M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z'
                          />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeletePod(app.cluster, r.namespace, r.name);
                        }}
                        disabled={deletingPod === podKey}
                        className='rounded p-1 text-[var(--color-text-muted)] hover:text-[var(--color-health-red)] hover:bg-[var(--color-health-red)]/5 disabled:opacity-50 transition-colors'
                        title='Restart pod'
                      >
                        {deletingPod === podKey ? (
                          <svg
                            className='h-3 w-3 animate-spin'
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
                        ) : (
                          <svg
                            className='h-3 w-3'
                            fill='none'
                            viewBox='0 0 24 24'
                            strokeWidth='2'
                            stroke='currentColor'
                          >
                            <path
                              strokeLinecap='round'
                              strokeLinejoin='round'
                              d='M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182'
                            />
                          </svg>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            {items.length > 12 && (
              <p className='text-[10px] text-[var(--color-text-muted)] px-2.5 py-1'>
                +{items.length - 12} more
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ApplicationCards({
  apps,
  loading,
  onSync,
  onScale,
  onRefresh,
  onDeletePod,
  onViewLogs,
}: ApplicationCardProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpanded = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  const [syncingKey, setSyncingKey] = useState<string | null>(null);
  const [scaleTarget, setScaleTarget] = useState<ApplicationInfo | null>(null);
  const [replicas, setReplicas] = useState(0);
  const [scalingKey, setScalingKey] = useState<string | null>(null);
  const [deletingPod, setDeletingPod] = useState<string | null>(null);

  const handleSync = async (app: ApplicationInfo) => {
    const key = `${app.cluster}-${app.namespace}-${app.name}`;
    setSyncingKey(key);
    try {
      await onSync(app.cluster, app.namespace, app.name);
    } finally {
      setSyncingKey(null);
    }
  };

  const openScaleDialog = (app: ApplicationInfo) => {
    setScaleTarget(app);
    setReplicas(app.targetState.replicas);
  };

  const handleScale = async () => {
    if (!scaleTarget) return;
    const key = `${scaleTarget.cluster}-${scaleTarget.namespace}-${scaleTarget.name}`;
    setScalingKey(key);
    try {
      await onScale(
        scaleTarget.cluster,
        scaleTarget.namespace,
        scaleTarget.name,
        replicas,
      );
    } finally {
      setScalingKey(null);
      setScaleTarget(null);
    }
  };

  const handleDeletePod = async (cluster: string, ns: string, pod: string) => {
    const key = `${cluster}-${ns}-${pod}`;
    setDeletingPod(key);
    try {
      await onDeletePod(cluster, ns, pod);
    } finally {
      setDeletingPod(null);
    }
  };

  if (loading && apps.length === 0) {
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
        Loading applications…
      </div>
    );
  }

  if (apps.length === 0) {
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
            d='M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125'
          />
        </svg>
        <p className='text-sm'>No applications found</p>
      </div>
    );
  }

  const stats = {
    total: apps.length,
    healthy: apps.filter((a) => a.health === 'Healthy').length,
    progressing: apps.filter((a) => a.health === 'Progressing').length,
    degraded: apps.filter((a) => a.health === 'Degraded').length,
    suspended: apps.filter((a) => a.health === 'Suspended').length,
    synced: apps.filter((a) => a.syncStatus === 'Synced').length,
    outOfSync: apps.filter((a) => a.syncStatus === 'OutOfSync').length,
  };

  return (
    <div className='space-y-6'>
      {/* Status bar */}
      <div className='flex items-center gap-2 flex-wrap'>
        <span className='inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-primary)]'>
          {stats.total} Applications
        </span>
        {[
          {
            count: stats.healthy,
            label: 'Healthy',
            color: 'var(--color-health-green)',
          },
          {
            count: stats.progressing,
            label: 'Progressing',
            color: 'var(--color-health-yellow)',
          },
          {
            count: stats.degraded,
            label: 'Degraded',
            color: 'var(--color-health-red)',
          },
          {
            count: stats.suspended,
            label: 'Suspended',
            color: 'var(--color-health-grey)',
          },
        ]
          .filter((s) => s.count > 0)
          .map((s) => (
            <span
              key={s.label}
              className='inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)]'
            >
              <span
                className='h-2 w-2 rounded-full'
                style={{ backgroundColor: s.color }}
              />
              {s.count} {s.label}
            </span>
          ))}
        <span className='w-px h-5 bg-[var(--color-border)] mx-1' />
        {[
          {
            count: stats.synced,
            label: 'Synced',
            color: 'var(--color-health-green)',
          },
          {
            count: stats.outOfSync,
            label: 'OutOfSync',
            color: 'var(--color-sync-yellow)',
          },
        ]
          .filter((s) => s.count > 0)
          .map((s) => (
            <span
              key={s.label}
              className='inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)]'
            >
              <span
                className='h-2 w-2 rounded-full'
                style={{ backgroundColor: s.color }}
              />
              {s.count} {s.label}
            </span>
          ))}
      </div>

      {/* Cards grid */}
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
        {apps.map((app) => {
          const key = `${app.cluster}-${app.namespace}-${app.name}`;
          const isExpanded = expanded.has(key);
          const hCfg = healthConfig[app.health] ?? healthConfig.Unknown;
          const sCfg = syncConfig[app.syncStatus] ?? syncConfig.Unknown;

          return (
            <div
              key={key}
              className='rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden'
            >
              {/* Health indicator bar */}
              <div className={`h-0.5 ${hCfg.bg}`} />

              <div className='p-5 space-y-4'>
                {/* Header */}
                <div className='flex items-start justify-between gap-2'>
                  <div className='min-w-0'>
                    <h3
                      className='text-sm font-semibold text-[var(--color-text-primary)] truncate'
                      title={app.name}
                    >
                      {app.name}
                    </h3>
                    <p className='text-[11px] text-[var(--color-text-muted)] mt-0.5'>
                      {app.cluster}
                      <span className='mx-1 opacity-40'>/</span>
                      {app.namespace}
                    </p>
                  </div>
                  <span className='text-[10px] text-[var(--color-text-muted)] shrink-0 tabular-nums'>
                    {app.age}
                  </span>
                </div>

                {/* Status pills */}
                <div className='flex items-center gap-2'>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium ${hCfg.bg}/10 ${hCfg.color}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${hCfg.bg}`} />
                    {app.health}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] px-2.5 py-1 text-[10px] font-medium ${sCfg.color}`}
                  >
                    {sCfg.icon} {sCfg.label}
                  </span>
                  <span className='inline-flex items-center rounded-full bg-[var(--color-accent-subtle)] px-2 py-1 text-[10px] font-medium text-[var(--color-accent)]'>
                    {app.source}
                  </span>
                </div>

                {/* Replica status */}
                <div className='flex items-center gap-4'>
                  <div className='flex-1'>
                    <div className='flex items-center justify-between mb-1'>
                      <span className='text-[10px] text-[var(--color-text-muted)]'>
                        Replicas
                      </span>
                      <span className='text-[10px] tabular-nums text-[var(--color-text-secondary)]'>
                        {app.liveState.availableReplicas}/
                        {app.targetState.replicas}
                      </span>
                    </div>
                    <div className='h-1.5 rounded-full bg-[var(--color-border)] overflow-hidden'>
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${hCfg.bg}`}
                        style={{
                          width: `${app.targetState.replicas > 0 ? (app.liveState.availableReplicas / app.targetState.replicas) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className='flex items-center gap-2 text-[10px] tabular-nums'>
                    {app.liveState.runningPods > 0 && (
                      <span className='text-[var(--color-health-green)]'>
                        {app.liveState.runningPods}↑
                      </span>
                    )}
                    {app.liveState.pendingPods > 0 && (
                      <span className='text-[var(--color-health-yellow)]'>
                        {app.liveState.pendingPods}◷
                      </span>
                    )}
                    {app.liveState.failedPods > 0 && (
                      <span className='text-[var(--color-health-red)]'>
                        {app.liveState.failedPods}✗
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className='flex items-center gap-1.5 pt-1 border-t border-[var(--color-border-subtle)]'>
                  <button
                    onClick={() => handleSync(app)}
                    disabled={syncingKey === key}
                    className='inline-flex items-center gap-1 rounded bg-[var(--color-accent)] px-2.5 py-1.5 text-[10px] font-medium text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-50 transition-colors'
                  >
                    {syncingKey === key ? (
                      <svg
                        className='h-3 w-3 animate-spin'
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
                    ) : (
                      <svg
                        className='h-3 w-3'
                        fill='none'
                        viewBox='0 0 24 24'
                        strokeWidth='2'
                        stroke='currentColor'
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          d='M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182'
                        />
                      </svg>
                    )}
                    Sync
                  </button>
                  <button
                    onClick={() => onRefresh()}
                    className='inline-flex items-center gap-1 rounded border border-[var(--color-border)] px-2.5 py-1.5 text-[10px] font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-sunken)] transition-colors'
                  >
                    Refresh
                  </button>
                  <button
                    onClick={() => openScaleDialog(app)}
                    className='inline-flex items-center gap-1 rounded border border-[var(--color-border)] px-2.5 py-1.5 text-[10px] font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-sunken)] transition-colors'
                  >
                    Scale
                  </button>
                  <button
                    onClick={() => toggleExpanded(key)}
                    className={`ml-auto inline-flex items-center gap-1 rounded border border-[var(--color-border)] px-2.5 py-1.5 text-[10px] font-medium transition-colors ${
                      isExpanded
                        ? 'bg-[var(--color-accent-subtle)] text-[var(--color-accent)] border-[var(--color-accent)]/30'
                        : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-sunken)]'
                    }`}
                  >
                    <svg
                      className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      fill='none'
                      viewBox='0 0 24 24'
                      strokeWidth='2'
                      stroke='currentColor'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        d='M8.25 4.5l7.5 7.5-7.5 7.5'
                      />
                    </svg>
                    {app.resources.length} Resources
                  </button>
                </div>

                {/* Resource tree */}
                {isExpanded && (
                  <div className='pt-3 mt-1'>
                    <ResourceTree
                      app={app}
                      onDeletePod={handleDeletePod}
                      onViewLogs={onViewLogs}
                      deletingPod={deletingPod}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Scale Dialog */}
      <Dialog.Root
        open={!!scaleTarget}
        onOpenChange={(open) => {
          if (!open) setScaleTarget(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className='fixed inset-0 bg-[var(--color-overlay)] backdrop-blur-sm z-50' />
          <Dialog.Content className='fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl'>
            <div className='p-5 space-y-4'>
              <div>
                <Dialog.Title className='text-sm font-semibold text-[var(--color-text-primary)]'>
                  Scale Application
                </Dialog.Title>
                <Dialog.Description className='text-xs text-[var(--color-text-muted)] mt-1'>
                  {scaleTarget?.name} — {scaleTarget?.cluster}/
                  {scaleTarget?.namespace}
                </Dialog.Description>
              </div>
              <label className='block'>
                <span className='text-xs font-medium text-[var(--color-text-secondary)]'>
                  Replica Count
                </span>
                <input
                  type='number'
                  min={0}
                  max={100}
                  value={replicas}
                  onChange={(e) =>
                    setReplicas(
                      Math.max(0, Math.min(100, Number(e.target.value))),
                    )
                  }
                  className='mt-1.5 block w-full rounded border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-3 py-2 text-sm tabular-nums text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]'
                />
              </label>
              <div className='flex justify-end gap-2 pt-2'>
                <Dialog.Close asChild>
                  <button className='rounded border border-[var(--color-border)] px-4 py-2 text-xs font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-sunken)] transition-colors'>
                    Cancel
                  </button>
                </Dialog.Close>
                <button
                  onClick={handleScale}
                  disabled={!!scalingKey}
                  className='rounded bg-[var(--color-accent)] px-4 py-2 text-xs font-medium text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-50 transition-colors'
                >
                  {scalingKey ? 'Scaling…' : 'Apply'}
                </button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
