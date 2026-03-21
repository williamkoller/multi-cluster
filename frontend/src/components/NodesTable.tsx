import type { NodeInfo } from '../types';

interface NodesTableProps {
  nodes: NodeInfo[];
  loading: boolean;
}

export function NodesTable({ nodes, loading }: NodesTableProps) {
  if (loading) {
    return (
      <div className='flex justify-center py-12'>
        <div className='h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-accent)] border-t-transparent' />
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className='py-12 text-center text-[var(--color-text-muted)]'>
        No nodes found.
      </div>
    );
  }

  return (
    <div className='rounded-lg border border-[var(--color-border)] overflow-hidden'>
      <table className='w-full table-fixed divide-y divide-[var(--color-border)]'>
        <colgroup>
          <col className='w-[9%]' />
          <col className='w-[18%]' />
          <col className='w-[8%]' />
          <col className='w-[10%]' />
          <col className='w-[10%]' />
          <col className='w-[10%]' />
          <col className='w-[14%]' />
          <col className='w-[14%]' />
          <col className='w-[7%]' />
        </colgroup>
        <thead className='bg-[var(--color-surface-sunken)]'>
          <tr>
            {[
              'Cluster',
              'Name',
              'Status',
              'Roles',
              'Version',
              'OS/Arch',
              'CPU (alloc/cap)',
              'Memory (alloc/cap)',
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
          {nodes.map((node) => (
            <tr
              key={`${node.cluster}-${node.name}`}
              className='hover:bg-[var(--color-surface-sunken)] transition-colors'
            >
              <td
                className='truncate px-3 py-3 text-sm font-medium text-[var(--color-accent)]'
                title={node.cluster}
              >
                {node.cluster}
              </td>
              <td
                className='truncate px-3 py-3 text-sm font-mono text-[var(--color-text-primary)]'
                title={node.name}
              >
                {node.name}
              </td>
              <td className='px-3 py-3 text-sm'>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    node.status === 'Ready'
                      ? 'bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-400'
                      : 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-400'
                  }`}
                >
                  {node.status}
                </span>
              </td>
              <td
                className='truncate px-3 py-3 text-sm text-[var(--color-text-secondary)]'
                title={node.roles}
              >
                {node.roles}
              </td>
              <td
                className='truncate px-3 py-3 text-sm text-[var(--color-text-secondary)]'
                title={node.version}
              >
                {node.version}
              </td>
              <td
                className='truncate px-3 py-3 text-sm text-[var(--color-text-secondary)]'
                title={`${node.os}/${node.arch}`}
              >
                {node.os}/{node.arch}
              </td>
              <td
                className='truncate px-3 py-3 text-sm font-mono text-[var(--color-text-secondary)]'
                title={`${node.cpuAllocatable}/${node.cpuCapacity}`}
              >
                {node.cpuAllocatable}/{node.cpuCapacity}
              </td>
              <td
                className='truncate px-3 py-3 text-sm font-mono text-[var(--color-text-secondary)]'
                title={`${node.memoryAllocatable}/${node.memoryCapacity}`}
              >
                {node.memoryAllocatable}/{node.memoryCapacity}
              </td>
              <td className='truncate px-3 py-3 text-sm text-[var(--color-text-muted)]'>
                {node.age}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
