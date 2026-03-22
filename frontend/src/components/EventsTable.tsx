import type { EventInfo } from '../types';

interface EventsTableProps {
  events: EventInfo[];
  loading: boolean;
}

export function EventsTable({ events, loading }: EventsTableProps) {
  if (loading) {
    return (
      <div className='flex justify-center py-12'>
        <div className='h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-accent)] border-t-transparent' />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className='py-12 text-center text-[var(--color-text-muted)]'>
        No events found.
      </div>
    );
  }

  return (
    <div className='rounded-lg border border-[var(--color-border)] overflow-hidden'>
      <table className='w-full table-fixed divide-y divide-[var(--color-border)]'>
        <colgroup>
          <col className='w-[8%]' />
          <col className='w-[10%]' />
          <col className='w-[7%]' />
          <col className='w-[9%]' />
          <col className='w-[15%]' />
          <col className='w-[35%]' />
          <col className='w-[6%]' />
          <col className='w-[10%]' />
        </colgroup>
        <thead className='bg-[var(--color-surface-sunken)]'>
          <tr>
            {[
              'Cluster',
              'Namespace',
              'Type',
              'Reason',
              'Object',
              'Message',
              'Count',
              'Last Seen',
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
          {events.map((ev, idx) => (
            <tr
              key={`${ev.cluster}-${ev.namespace}-${ev.object}-${idx}`}
              className='hover:bg-[var(--color-surface-sunken)] transition-colors'
            >
              <td
                className='truncate px-3 py-2 text-xs font-medium text-[var(--color-accent)]'
                title={ev.cluster}
              >
                {ev.cluster}
              </td>
              <td
                className='truncate px-3 py-2 text-xs text-[var(--color-text-secondary)]'
                title={ev.namespace}
              >
                {ev.namespace}
              </td>
              <td className='px-3 py-2 text-xs'>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    ev.type === 'Normal'
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400'
                      : 'bg-yellow-50 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-400'
                  }`}
                >
                  {ev.type}
                </span>
              </td>
              <td
                className='truncate px-3 py-2 text-xs font-medium text-[var(--color-text-primary)]'
                title={ev.reason}
              >
                {ev.reason}
              </td>
              <td
                className='truncate px-3 py-2 text-xs font-mono text-[var(--color-text-secondary)]'
                title={ev.object}
              >
                {ev.object}
              </td>
              <td
                className='px-3 py-2 text-xs text-[var(--color-text-secondary)] break-words'
                title={ev.message}
              >
                <span className='line-clamp-2'>{ev.message}</span>
              </td>
              <td className='px-3 py-2 text-xs text-center text-[var(--color-text-secondary)]'>
                {ev.count}
              </td>
              <td
                className='truncate px-3 py-2 text-xs text-[var(--color-text-muted)]'
                title={ev.lastSeen}
              >
                {ev.lastSeen}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
