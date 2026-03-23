import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import type { DeploymentInfo } from '../types';

interface DeploymentsTableProps {
  deployments: DeploymentInfo[];
  loading: boolean;
  onScale: (
    cluster: string,
    namespace: string,
    deployment: string,
    replicas: number,
  ) => Promise<void>;
  onRolloutRestart: (
    cluster: string,
    namespace: string,
    deployment: string,
  ) => Promise<void>;
}

export function DeploymentsTable({
  deployments,
  loading,
  onScale,
  onRolloutRestart,
}: DeploymentsTableProps) {
  const [scalingKey, setScalingKey] = useState<string | null>(null);
  const [restartingKey, setRestartingKey] = useState<string | null>(null);
  const [scaleTarget, setScaleTarget] = useState<DeploymentInfo | null>(null);
  const [replicas, setReplicas] = useState(0);

  const handleRolloutRestart = async (deploy: DeploymentInfo) => {
    const key = `${deploy.cluster}-${deploy.namespace}-${deploy.name}`;
    setRestartingKey(key);
    try {
      await onRolloutRestart(deploy.cluster, deploy.namespace, deploy.name);
    } finally {
      setRestartingKey(null);
    }
  };

  const openScaleModal = (deploy: DeploymentInfo) => {
    setScaleTarget(deploy);
    setReplicas(deploy.replicas);
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

  if (loading) {
    return (
      <div className='flex justify-center py-12'>
        <div className='h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-accent)] border-t-transparent' />
      </div>
    );
  }

  if (deployments.length === 0) {
    return (
      <div className='py-12 text-center text-[var(--color-text-muted)]'>
        No deployments found.
      </div>
    );
  }

  return (
    <>
      <div className='rounded-lg border border-[var(--color-border)] overflow-hidden'>
        <table className='w-full table-fixed divide-y divide-[var(--color-border)]'>
          <colgroup>
            <col className='w-[10%]' />
            <col className='w-[12%]' />
            <col className='w-[22%]' />
            <col className='w-[9%]' />
            <col className='w-[10%]' />
            <col className='w-[8%]' />
            <col className='w-[29%]' />
          </colgroup>
          <thead className='bg-[var(--color-surface-sunken)]'>
            <tr>
              {[
                'Cluster',
                'Namespace',
                'Name',
                'Replicas',
                'Available',
                'Age',
                'Actions',
              ].map((h) => (
                <th
                  key={h}
                  className='px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]'
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className='divide-y divide-[var(--color-border-subtle)] bg-[var(--color-surface)]'>
            {deployments.map((deploy) => {
              const key = `${deploy.cluster}-${deploy.namespace}-${deploy.name}`;
              return (
                <tr
                  key={key}
                  className='hover:bg-[var(--color-surface-sunken)] transition-colors'
                >
                  <td
                    className='truncate px-3 py-2 text-xs font-medium text-[var(--color-accent)]'
                    title={deploy.cluster}
                  >
                    {deploy.cluster}
                  </td>
                  <td
                    className='truncate px-3 py-2 text-xs text-[var(--color-text-secondary)]'
                    title={deploy.namespace}
                  >
                    {deploy.namespace}
                  </td>
                  <td
                    className='truncate px-3 py-2 text-xs font-mono text-[var(--color-text-primary)]'
                    title={deploy.name}
                  >
                    {deploy.name}
                  </td>
                  <td className='px-3 py-2 text-xs text-[var(--color-text-secondary)]'>
                    {deploy.replicas}
                  </td>
                  <td className='px-3 py-2 text-xs'>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        deploy.available === deploy.replicas
                          ? 'bg-[var(--color-status-success-bg)] text-[var(--color-status-success-text)]'
                          : 'bg-[var(--color-status-warning-bg)] text-[var(--color-status-warning-text)]'
                      }`}
                    >
                      {deploy.available}/{deploy.replicas}
                    </span>
                  </td>
                  <td className='px-3 py-2 text-xs text-[var(--color-text-muted)]'>
                    {deploy.age}
                  </td>
                  <td className='whitespace-nowrap px-3 py-2 text-xs'>
                    <button
                      onClick={() => openScaleModal(deploy)}
                      disabled={scalingKey === key}
                      className='inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] px-2 py-1 text-xs font-medium text-[var(--color-accent)] hover:bg-[var(--color-accent-subtle)] disabled:opacity-50 transition-colors'
                    >
                      {scalingKey === key ? (
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
                            d='M3 7.5 7.5 3m0 0L12 7.5M7.5 3v13.5m13.5-6L16.5 21m0 0L12 16.5m4.5 4.5V7.5'
                          />
                        </svg>
                      )}
                      Scale
                    </button>
                    <button
                      onClick={() => handleRolloutRestart(deploy)}
                      disabled={restartingKey === key}
                      className='ml-2 inline-flex items-center gap-1 rounded-md border border-[var(--color-status-orange-border)] px-2 py-1 text-xs font-medium text-[var(--color-status-orange-text)] hover:bg-[var(--color-status-orange-hover)] disabled:opacity-50 transition-colors'
                      title='Rollout restart deployment'
                    >
                      {restartingKey === key ? (
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
                            d='M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182'
                          />
                        </svg>
                      )}
                      Restart
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog.Root
        open={!!scaleTarget}
        onOpenChange={(open) => {
          if (!open) setScaleTarget(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className='fixed inset-0 z-50 bg-[var(--color-overlay)] data-[state=open]:animate-[fadeIn_0.15s_ease-out]' />
          <Dialog.Content className='fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6 data-[state=open]:animate-[slideIn_0.15s_ease-out]'>
            <Dialog.Title className='text-lg font-semibold text-[var(--color-text-primary)]'>
              Scale Deployment
            </Dialog.Title>
            <Dialog.Description className='mt-1 text-sm text-[var(--color-text-secondary)]'>
              {scaleTarget && (
                <>
                  <span className='font-mono'>
                    {scaleTarget.namespace}/{scaleTarget.name}
                  </span>
                  <span className='text-[var(--color-text-muted)]'> on </span>
                  <span className='font-medium text-[var(--color-accent)]'>
                    {scaleTarget.cluster}
                  </span>
                </>
              )}
            </Dialog.Description>
            <div className='mt-4'>
              <label className='block text-sm font-medium text-[var(--color-text-secondary)]'>
                Replicas
              </label>
              <div className='mt-1 flex items-center gap-3'>
                <button
                  onClick={() => setReplicas((r) => Math.max(0, r - 1))}
                  className='flex h-8 w-8 items-center justify-center rounded-md border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-sunken)] transition-colors'
                >
                  -
                </button>
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
                  className='w-20 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-center text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] focus:outline-none'
                />
                <button
                  onClick={() => setReplicas((r) => Math.min(100, r + 1))}
                  className='flex h-8 w-8 items-center justify-center rounded-md border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-sunken)] transition-colors'
                >
                  +
                </button>
              </div>
              <p className='mt-1 text-xs text-[var(--color-text-muted)]'>
                Current: {scaleTarget?.replicas ?? 0} replica(s)
              </p>
            </div>
            <div className='mt-6 flex justify-end gap-3'>
              <Dialog.Close className='rounded-md border border-[var(--color-border)] px-3 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-sunken)] transition-colors'>
                Cancel
              </Dialog.Close>
              <button
                onClick={handleScale}
                disabled={scalingKey !== null}
                className='rounded-md bg-[var(--color-accent)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-50 transition-colors'
              >
                {scalingKey ? 'Scaling...' : 'Apply'}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
