import type { IngressInfo } from '../types';

interface IngressesTableProps {
  ingresses: IngressInfo[];
  loading: boolean;
}

export function IngressesTable({ ingresses, loading }: IngressesTableProps) {
  if (loading) {
    return (
      <div className='flex justify-center py-12'>
        <div className='h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-accent)] border-t-transparent' />
      </div>
    );
  }

  if (ingresses.length === 0) {
    return (
      <div className='py-12 text-center text-[var(--color-text-muted)]'>
        No ingresses found.
      </div>
    );
  }

  return (
    <div className='rounded-lg border border-[var(--color-border)] overflow-hidden'>
      <table className='w-full table-fixed divide-y divide-[var(--color-border)]'>
        <colgroup>
          <col className='w-[10%]' />
          <col className='w-[12%]' />
          <col className='w-[20%]' />
          <col className='w-[22%]' />
          <col className='w-[28%]' />
          <col className='w-[8%]' />
        </colgroup>
        <thead className='bg-[var(--color-surface-sunken)]'>
          <tr>
            {['Cluster', 'Namespace', 'Name', 'Hosts', 'Paths', 'Age'].map(
              (h) => (
                <th
                  key={h}
                  className='px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]'
                >
                  {h}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody className='divide-y divide-[var(--color-border-subtle)] bg-[var(--color-surface)]'>
          {ingresses.map((ing) => (
            <tr
              key={`${ing.cluster}-${ing.namespace}-${ing.name}`}
              className='hover:bg-[var(--color-surface-sunken)] transition-colors'
            >
              <td
                className='truncate px-3 py-2 text-xs font-medium text-[var(--color-accent)]'
                title={ing.cluster}
              >
                {ing.cluster}
              </td>
              <td
                className='truncate px-3 py-2 text-xs text-[var(--color-text-secondary)]'
                title={ing.namespace}
              >
                {ing.namespace}
              </td>
              <td
                className='truncate px-3 py-2 text-xs font-mono text-[var(--color-text-primary)]'
                title={ing.name}
              >
                {ing.name}
              </td>
              <td
                className='truncate px-3 py-2 text-xs text-[var(--color-text-secondary)]'
                title={ing.hosts.join(', ') || '-'}
              >
                {ing.hosts.join(', ') || '-'}
              </td>
              <td
                className='truncate px-3 py-2 text-xs font-mono text-[var(--color-text-secondary)]'
                title={ing.paths || '-'}
              >
                {ing.paths || '-'}
              </td>
              <td className='truncate px-3 py-2 text-xs text-[var(--color-text-muted)]'>
                {ing.age}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
