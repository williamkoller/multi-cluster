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
  { color: string; icon: string; bg: string }
> = {
  Healthy: {
    color: 'text-[var(--color-health-green)]',
    bg: 'bg-[var(--color-health-green)]',
    icon: '✓',
  },
  Progressing: {
    color: 'text-[var(--color-health-yellow)]',
    bg: 'bg-[var(--color-health-yellow)]',
    icon: '↻',
  },
  Degraded: {
    color: 'text-[var(--color-health-red)]',
    bg: 'bg-[var(--color-health-red)]',
    icon: '✗',
  },
  Suspended: {
    color: 'text-[var(--color-health-grey)]',
    bg: 'bg-[var(--color-health-grey)]',
    icon: '‖',
  },
  Missing: {
    color: 'text-[var(--color-health-grey)]',
    bg: 'bg-[var(--color-health-grey)]',
    icon: '?',
  },
  Unknown: {
    color: 'text-[var(--color-health-grey)]',
    bg: 'bg-[var(--color-health-grey)]',
    icon: '?',
  },
};

const syncConfig: Record<SyncStatus, { color: string; label: string }> = {
  Synced: { color: 'text-[var(--color-health-green)]', label: 'Synced' },
  OutOfSync: { color: 'text-[var(--color-health-yellow)]', label: 'OutOfSync' },
  Unknown: { color: 'text-[var(--color-health-grey)]', label: 'Unknown' },
};

function HealthBadge({ health }: { health: HealthStatus }) {
  const cfg = healthConfig[health] ?? healthConfig.Unknown;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium ${cfg.color}`}
    >
      <span className={`h-2 w-2 rounded-full ${cfg.bg}`} />
      {health}
    </span>
  );
}

function SyncBadge({ sync }: { sync: SyncStatus }) {
  const cfg = syncConfig[sync] ?? syncConfig.Unknown;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium ${cfg.color}`}
    >
      <svg
        className='h-3 w-3'
        fill='none'
        viewBox='0 0 24 24'
        strokeWidth='2'
        stroke='currentColor'
      >
        {sync === 'Synced' ? (
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            d='M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
          />
        ) : (
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            d='M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182'
          />
        )}
      </svg>
      {cfg.label}
    </span>
  );
}

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

  return (
    <div className='space-y-2'>
      {Object.entries(kindGroups).map(([kind, items]) => (
        <div key={kind}>
          <p className='text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-1'>
            {kind} ({items.length})
          </p>
          <div className='space-y-1'>
            {items.slice(0, 12).map((r) => {
              const cfg = healthConfig[r.health] ?? healthConfig.Unknown;
              const podKey = `${app.cluster}-${r.namespace}-${r.name}`;
              return (
                <div
                  key={`${r.kind}-${r.name}`}
                  className='flex items-center justify-between rounded bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)] px-2 py-1'
                >
                  <span className='inline-flex items-center gap-1.5 text-[10px] font-mono text-[var(--color-text-secondary)] min-w-0'>
                    <span
                      className={`h-1.5 w-1.5 rounded-full shrink-0 ${cfg.bg}`}
                    />
                    <span className='truncate'>{r.name}</span>
                    <span className='text-[var(--color-text-muted)] shrink-0'>
                      {r.status}
                    </span>
                  </span>
                  {kind === 'Pod' && (
                    <div className='flex items-center gap-1 shrink-0 ml-2'>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewLogs(app.cluster, r.namespace, r.name);
                        }}
                        className='rounded p-0.5 text-[var(--color-text-muted)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent-subtle)] transition-colors'
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
                        className='rounded p-0.5 text-[var(--color-text-muted)] hover:text-[var(--color-health-red)] hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-50 transition-colors'
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
              <span className='text-[10px] text-[var(--color-text-muted)] px-2'>
                +{items.length - 12} more
              </span>
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
  const [expanded, setExpanded] = useState<string | null>(null);
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
      <div className='flex items-center justify-center py-20 text-sm text-[var(--color-text-muted)]'>
        Loading applications...
      </div>
    );
  }

  if (apps.length === 0) {
    return (
      <div className='flex items-center justify-center py-20 text-sm text-[var(--color-text-muted)]'>
        No applications found
      </div>
    );
  }

  // Aggregated stats
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
      {/* Summary bar */}
      <div className='flex items-center gap-6 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-3'>
        <div className='flex items-center gap-2'>
          <span className='text-xl font-bold tabular-nums text-[var(--color-text-primary)]'>
            {stats.total}
          </span>
          <span className='text-xs uppercase tracking-wider text-[var(--color-text-muted)]'>
            Apps
          </span>
        </div>
        <div className='h-6 w-px bg-[var(--color-border)]' />
        <div className='flex items-center gap-4 text-xs'>
          <span className='flex items-center gap-1.5'>
            <span className='h-2 w-2 rounded-full bg-[var(--color-health-green)]' />
            <span className='text-[var(--color-text-secondary)] tabular-nums'>
              {stats.healthy} Healthy
            </span>
          </span>
          <span className='flex items-center gap-1.5'>
            <span className='h-2 w-2 rounded-full bg-[var(--color-health-yellow)]' />
            <span className='text-[var(--color-text-secondary)] tabular-nums'>
              {stats.progressing} Progressing
            </span>
          </span>
          <span className='flex items-center gap-1.5'>
            <span className='h-2 w-2 rounded-full bg-[var(--color-health-red)]' />
            <span className='text-[var(--color-text-secondary)] tabular-nums'>
              {stats.degraded} Degraded
            </span>
          </span>
          {stats.suspended > 0 && (
            <span className='flex items-center gap-1.5'>
              <span className='h-2 w-2 rounded-full bg-[var(--color-health-grey)]' />
              <span className='text-[var(--color-text-secondary)] tabular-nums'>
                {stats.suspended} Suspended
              </span>
            </span>
          )}
        </div>
        <div className='h-6 w-px bg-[var(--color-border)]' />
        <div className='flex items-center gap-4 text-xs'>
          <span className='flex items-center gap-1.5'>
            <svg
              className='h-3 w-3 text-[var(--color-health-green)]'
              fill='none'
              viewBox='0 0 24 24'
              strokeWidth='2'
              stroke='currentColor'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
              />
            </svg>
            <span className='text-[var(--color-text-secondary)] tabular-nums'>
              {stats.synced} Synced
            </span>
          </span>
          <span className='flex items-center gap-1.5'>
            <svg
              className='h-3 w-3 text-[var(--color-health-yellow)]'
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
            <span className='text-[var(--color-text-secondary)] tabular-nums'>
              {stats.outOfSync} OutOfSync
            </span>
          </span>
        </div>
      </div>

      {/* Application cards grid */}
      <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
        {apps.map((app) => {
          const key = `${app.cluster}-${app.namespace}-${app.name}`;
          const isExpanded = expanded === key;
          const hCfg = healthConfig[app.health] ?? healthConfig.Unknown;

          return (
            <div
              key={key}
              className={`rounded-lg border bg-[var(--color-surface)] overflow-hidden transition-all cursor-pointer ${
                app.health === 'Healthy'
                  ? 'border-[var(--color-border)]'
                  : app.health === 'Degraded'
                    ? 'border-[var(--color-health-red)]/40'
                    : app.health === 'Progressing'
                      ? 'border-[var(--color-health-yellow)]/40'
                      : 'border-[var(--color-border)]'
              }`}
              onClick={() => setExpanded(isExpanded ? null : key)}
            >
              {/* Top status bar */}
              <div className={`h-1 ${hCfg.bg}`} />

              {/* Card body */}
              <div className='p-4 space-y-3'>
                {/* Header row */}
                <div className='flex items-start justify-between'>
                  <div className='min-w-0 flex-1'>
                    <h3
                      className='text-sm font-semibold font-mono text-[var(--color-text-primary)] truncate'
                      title={app.name}
                    >
                      {app.name}
                    </h3>
                    <p className='text-[10px] text-[var(--color-text-muted)] mt-0.5'>
                      {app.cluster} / {app.namespace}
                    </p>
                  </div>
                  <span className='text-[10px] text-[var(--color-text-muted)] shrink-0 ml-2'>
                    {app.age}
                  </span>
                </div>

                {/* Health + Sync row */}
                <div className='flex items-center gap-4'>
                  <HealthBadge health={app.health} />
                  <SyncBadge sync={app.syncStatus} />
                </div>

                {/* Target vs Live state */}
                <div className='grid grid-cols-2 gap-3'>
                  <div className='rounded bg-[var(--color-surface-sunken)] p-2'>
                    <p className='text-[9px] uppercase tracking-wider text-[var(--color-text-muted)] mb-1'>
                      Target State
                    </p>
                    <p className='text-xs tabular-nums text-[var(--color-text-primary)]'>
                      {app.targetState.replicas} replicas
                    </p>
                  </div>
                  <div className='rounded bg-[var(--color-surface-sunken)] p-2'>
                    <p className='text-[9px] uppercase tracking-wider text-[var(--color-text-muted)] mb-1'>
                      Live State
                    </p>
                    <p className='text-xs tabular-nums text-[var(--color-text-primary)]'>
                      {app.liveState.availableReplicas}/
                      {app.targetState.replicas} available
                    </p>
                    <div className='flex gap-2 mt-0.5'>
                      {app.liveState.runningPods > 0 && (
                        <span className='text-[10px] text-[var(--color-health-green)] tabular-nums'>
                          {app.liveState.runningPods} running
                        </span>
                      )}
                      {app.liveState.pendingPods > 0 && (
                        <span className='text-[10px] text-[var(--color-health-yellow)] tabular-nums'>
                          {app.liveState.pendingPods} pending
                        </span>
                      )}
                      {app.liveState.failedPods > 0 && (
                        <span className='text-[10px] text-[var(--color-health-red)] tabular-nums'>
                          {app.liveState.failedPods} failed
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Source badge */}
                <div className='flex items-center gap-2'>
                  <span className='inline-flex items-center rounded bg-[var(--color-accent-subtle)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-accent)]'>
                    {app.source}
                  </span>
                  <span className='text-[10px] text-[var(--color-text-muted)]'>
                    {app.resources.length} resources
                  </span>
                </div>

                {/* Action buttons — ArgoCD-style */}
                <div className='flex items-center gap-1.5 pt-1'>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSync(app);
                    }}
                    disabled={syncingKey === key}
                    className='inline-flex items-center gap-1 rounded-md bg-[var(--color-accent)] px-2.5 py-1 text-[10px] font-medium text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-50 transition-colors'
                    title='Sync — Rollout restart to reconcile'
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
                    onClick={(e) => {
                      e.stopPropagation();
                      onRefresh();
                    }}
                    className='inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] px-2.5 py-1 text-[10px] font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-sunken)] transition-colors'
                    title='Refresh — Re-fetch application state'
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
                        d='M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182'
                      />
                    </svg>
                    Refresh
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openScaleDialog(app);
                    }}
                    className='inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] px-2.5 py-1 text-[10px] font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-sunken)] transition-colors'
                    title='Scale — Change replica count'
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
                        d='M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5-6L16.5 21m0 0L12 16.5m4.5 4.5V7.5'
                      />
                    </svg>
                    Scale
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpanded(isExpanded ? null : key);
                    }}
                    className='inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] px-2.5 py-1 text-[10px] font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-sunken)] transition-colors'
                    title='Details — Show resource tree'
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
                    Details
                  </button>
                </div>

                {/* Expandable resource tree */}
                {isExpanded && (
                  <div className='border-t border-[var(--color-border-subtle)] pt-3 mt-1'>
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
          <Dialog.Overlay className='fixed inset-0 bg-black/50 z-50' />
          <Dialog.Content className='fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-xl'>
            <Dialog.Title className='text-sm font-semibold text-[var(--color-text-primary)]'>
              Scale {scaleTarget?.name}
            </Dialog.Title>
            <Dialog.Description className='text-xs text-[var(--color-text-muted)] mt-1'>
              {scaleTarget?.cluster} / {scaleTarget?.namespace}
            </Dialog.Description>
            <div className='mt-4 space-y-3'>
              <label className='block text-xs text-[var(--color-text-secondary)]'>
                Replicas
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
                  className='mt-1 block w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]'
                />
              </label>
              <div className='flex justify-end gap-2'>
                <Dialog.Close asChild>
                  <button className='rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-sunken)] transition-colors'>
                    Cancel
                  </button>
                </Dialog.Close>
                <button
                  onClick={handleScale}
                  disabled={!!scalingKey}
                  className='rounded-md bg-[var(--color-accent)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-50 transition-colors'
                >
                  {scalingKey ? 'Scaling…' : 'Scale'}
                </button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
