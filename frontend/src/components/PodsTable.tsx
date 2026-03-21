import { useState } from 'react';
import type { PodInfo } from '../types';
import { StatusBadge } from './StatusBadge';

interface PodsTableProps {
  pods: PodInfo[];
  loading: boolean;
  onRestart: (cluster: string, namespace: string, pod: string) => Promise<void>;
  onViewLogs: (cluster: string, namespace: string, pod: string) => void;
}

export function PodsTable({
  pods,
  loading,
  onRestart,
  onViewLogs,
}: PodsTableProps) {
  const [restartingPod, setRestartingPod] = useState<string | null>(null);

  const handleRestart = async (pod: PodInfo) => {
    const key = `${pod.cluster}-${pod.namespace}-${pod.name}`;
    setRestartingPod(key);
    try {
      await onRestart(pod.cluster, pod.namespace, pod.name);
    } finally {
      setRestartingPod(null);
    }
  };

  if (loading) {
    return (
      <div className='flex justify-center py-12'>
        <div className='h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-accent)] border-t-transparent' />
      </div>
    );
  }

  if (pods.length === 0) {
    return (
      <div className='py-12 text-center text-[var(--color-text-muted)]'>
        No pods found.
      </div>
    );
  }

  return (
    <div className='rounded-lg border border-[var(--color-border)] overflow-hidden'>
      <table className='w-full table-fixed divide-y divide-[var(--color-border)]'>
        <colgroup>
          <col className='w-[10%]' />
          <col className='w-[12%]' />
          <col className='w-[28%]' />
          <col className='w-[7%]' />
          <col className='w-[10%]' />
          <col className='w-[8%]' />
          <col className='w-[25%]' />
        </colgroup>
        <thead className='bg-[var(--color-surface-sunken)]'>
          <tr>
            {[
              'Cluster',
              'Namespace',
              'Name',
              'Ready',
              'Status',
              'Age',
              'Actions',
            ].map((h) => (
              <th
                key={h}
                className='px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]'
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className='divide-y divide-[var(--color-border-subtle)] bg-[var(--color-surface)]'>
          {pods.map((pod) => (
            <tr
              key={`${pod.cluster}-${pod.namespace}-${pod.name}`}
              className='hover:bg-[var(--color-surface-sunken)] transition-colors'
            >
              <td
                className='truncate px-3 py-3 text-sm font-medium text-[var(--color-accent)]'
                title={pod.cluster}
              >
                {pod.cluster}
              </td>
              <td
                className='truncate px-3 py-3 text-sm text-[var(--color-text-secondary)]'
                title={pod.namespace}
              >
                {pod.namespace}
              </td>
              <td
                className='truncate px-3 py-3 text-sm font-mono text-[var(--color-text-primary)]'
                title={pod.name}
              >
                {pod.name}
              </td>
              <td className='px-3 py-3 text-sm text-[var(--color-text-secondary)]'>
                {pod.ready}
              </td>
              <td className='px-3 py-3 text-sm'>
                <StatusBadge status={pod.status} />
              </td>
              <td className='px-3 py-3 text-sm text-[var(--color-text-muted)]'>
                {pod.age}
              </td>
              <td className='whitespace-nowrap px-3 py-3 text-sm'>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRestart(pod);
                  }}
                  disabled={
                    restartingPod ===
                    `${pod.cluster}-${pod.namespace}-${pod.name}`
                  }
                  className='inline-flex items-center gap-1 rounded-md border border-red-200 dark:border-red-800/50 px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-50 transition-colors'
                  title='Restart pod (delete and let controller recreate)'
                >
                  {restartingPod ===
                  `${pod.cluster}-${pod.namespace}-${pod.name}` ? (
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
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewLogs(pod.cluster, pod.namespace, pod.name);
                  }}
                  className='ml-2 inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] px-2 py-1 text-xs font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-sunken)] transition-colors'
                  title='View pod logs'
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
                  Logs
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
