import { useState } from 'react';
import type { ServiceInfo } from '../types';
import { StatusBadge } from './StatusBadge';

interface ServicesTableProps {
  services: ServiceInfo[];
  loading: boolean;
}

export function ServicesTable({ services, loading }: ServicesTableProps) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  if (loading) {
    return (
      <div className='flex justify-center py-12'>
        <div className='h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-accent)] border-t-transparent' />
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className='py-12 text-center text-[var(--color-text-muted)]'>
        No services found.
      </div>
    );
  }

  const toggleRow = (key: string) => {
    setExpandedRow((prev) => (prev === key ? null : key));
  };

  return (
    <div className='rounded-lg border border-[var(--color-border)] overflow-hidden'>
      <table className='w-full table-fixed divide-y divide-[var(--color-border)]'>
        <colgroup>
          <col className='w-[4%]' />
          <col className='w-[10%]' />
          <col className='w-[12%]' />
          <col className='w-[20%]' />
          <col className='w-[10%]' />
          <col className='w-[14%]' />
          <col className='w-[22%]' />
          <col className='w-[8%]' />
        </colgroup>
        <thead className='bg-[var(--color-surface-sunken)]'>
          <tr>
            {[
              '',
              'Cluster',
              'Namespace',
              'Name',
              'Type',
              'Cluster IP',
              'Ports',
              'Age',
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
          {services.map((svc) => {
            const key = `${svc.cluster}-${svc.namespace}-${svc.name}`;
            const isExpanded = expandedRow === key;
            return (
              <>
                <tr
                  key={key}
                  className='hover:bg-[var(--color-surface-sunken)] transition-colors cursor-pointer'
                  onClick={() => toggleRow(key)}
                >
                  <td className='px-3 py-3 text-sm text-[var(--color-text-muted)]'>
                    {svc.pods.length > 0 && (
                      <span
                        className={`inline-block transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      >
                        ▶
                      </span>
                    )}
                  </td>
                  <td
                    className='truncate px-3 py-3 text-sm font-medium text-[var(--color-accent)]'
                    title={svc.cluster}
                  >
                    {svc.cluster}
                  </td>
                  <td
                    className='truncate px-3 py-3 text-sm text-[var(--color-text-secondary)]'
                    title={svc.namespace}
                  >
                    {svc.namespace}
                  </td>
                  <td
                    className='truncate px-3 py-3 text-sm font-mono text-[var(--color-text-primary)]'
                    title={svc.name}
                  >
                    {svc.name}
                  </td>
                  <td className='truncate px-3 py-3 text-sm text-[var(--color-text-secondary)]'>
                    {svc.type}
                  </td>
                  <td
                    className='truncate px-3 py-3 text-sm font-mono text-[var(--color-text-secondary)]'
                    title={svc.clusterIp}
                  >
                    {svc.clusterIp}
                  </td>
                  <td
                    className='truncate px-3 py-3 text-sm font-mono text-[var(--color-text-secondary)]'
                    title={svc.ports}
                  >
                    {svc.ports}
                  </td>
                  <td className='truncate px-3 py-3 text-sm text-[var(--color-text-muted)]'>
                    {svc.age}
                  </td>
                </tr>
                {isExpanded && svc.pods.length > 0 && (
                  <tr key={`${key}-pods`}>
                    <td
                      colSpan={8}
                      className='bg-[var(--color-accent-subtle)] px-8 py-3'
                    >
                      <div className='text-xs font-semibold uppercase text-[var(--color-text-muted)] mb-2'>
                        Pods ({svc.pods.length})
                      </div>
                      <table className='w-full divide-y divide-[var(--color-border)] rounded overflow-hidden'>
                        <thead className='bg-[var(--color-surface-sunken)]'>
                          <tr>
                            {[
                              'Name',
                              'Namespace',
                              'Ready',
                              'Status',
                              'Age',
                            ].map((h) => (
                              <th
                                key={h}
                                className='px-3 py-2 text-left text-xs font-medium text-[var(--color-text-muted)]'
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className='divide-y divide-[var(--color-border-subtle)] bg-[var(--color-surface)]'>
                          {svc.pods.map((pod) => (
                            <tr key={`${pod.namespace}-${pod.name}`}>
                              <td className='px-3 py-2 text-sm font-mono text-[var(--color-text-primary)]'>
                                {pod.name}
                              </td>
                              <td className='px-3 py-2 text-sm text-[var(--color-text-secondary)]'>
                                {pod.namespace}
                              </td>
                              <td className='px-3 py-2 text-sm text-[var(--color-text-secondary)]'>
                                {pod.ready}
                              </td>
                              <td className='px-3 py-2 text-sm'>
                                <StatusBadge status={pod.status} />
                              </td>
                              <td className='px-3 py-2 text-sm text-[var(--color-text-muted)]'>
                                {pod.age}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
