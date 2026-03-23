import { useEffect, useRef, useState, useCallback } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { getPodLogs, streamPodLogsURL } from '../api/client';

interface PodLogsViewerProps {
  cluster: string;
  namespace: string;
  pod: string;
  onClose: () => void;
}

export function PodLogsViewer({
  cluster,
  namespace,
  pod,
  onClose,
}: PodLogsViewerProps) {
  const [lines, setLines] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [streaming, setStreaming] = useState(false);
  const [tail, setTail] = useState(100);
  const [error, setError] = useState<string | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const connectStream = useCallback(
    (tailLines: number) => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      setStreaming(true);

      const url = streamPodLogsURL(cluster, namespace, pod, tailLines);
      const es = new EventSource(url);
      eventSourceRef.current = es;

      es.onmessage = (event) => {
        setError(null);
        setLines((prev) => {
          const next = [...prev, event.data];
          if (next.length > 10000) return next.slice(-5000);
          return next;
        });
      };

      es.addEventListener('error', (event) => {
        if (event instanceof MessageEvent) {
          setError(event.data);
        }
        es.close();
        setStreaming(false);
      });

      es.onerror = () => {
        es.close();
        setStreaming(false);
      };
    },
    [cluster, namespace, pod],
  );

  const loadAndStream = useCallback(
    async (tailLines: number) => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      setLines([]);
      setError(null);
      setLoading(true);

      try {
        const logs = await getPodLogs(cluster, namespace, pod, tailLines);
        const initial = logs ? logs.split('\n') : [];
        setLines(initial);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load logs');
      } finally {
        setLoading(false);
      }

      connectStream(0);
    },
    [cluster, namespace, pod, connectStream],
  );

  useEffect(() => {
    loadAndStream(tail);
    return () => {
      eventSourceRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (autoScroll && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [lines, autoScroll]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    setAutoScroll(scrollHeight - scrollTop - clientHeight < 50);
  };

  const handleClose = () => {
    eventSourceRef.current?.close();
    onClose();
  };

  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className='fixed inset-0 z-50 bg-[var(--color-overlay)] data-[state=open]:animate-[fadeIn_0.15s_ease-out]' />
        <Dialog.Content className='fixed inset-0 z-50 flex items-center justify-center p-4'>
          <div className='flex h-[80vh] w-full max-w-4xl flex-col rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] data-[state=open]:animate-[slideIn_0.15s_ease-out]'>
            <div className='flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3'>
              <div>
                <Dialog.Title className='text-lg font-semibold text-[var(--color-text-primary)]'>
                  Pod Logs
                  {streaming && (
                    <span className='ml-2 inline-flex items-center gap-1 text-xs font-normal text-green-500'>
                      <span className='h-2 w-2 rounded-full bg-green-500 animate-pulse' />
                      streaming
                    </span>
                  )}
                </Dialog.Title>
                <Dialog.Description className='text-xs text-[var(--color-text-muted)]'>
                  <span className='font-mono'>
                    {namespace}/{pod}
                  </span>{' '}
                  on{' '}
                  <span className='font-medium text-[var(--color-accent)]'>
                    {cluster}
                  </span>
                </Dialog.Description>
              </div>
              <div className='flex items-center gap-2'>
                <select
                  value={tail}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setTail(v);
                    loadAndStream(v);
                  }}
                  className='rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-xs text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none'
                >
                  {[50, 100, 500, 1000].map((n) => (
                    <option key={n} value={n}>
                      Tail {n}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => loadAndStream(tail)}
                  className='rounded-md bg-[var(--color-accent-subtle)] px-2 py-1 text-xs font-medium text-[var(--color-accent)] hover:bg-[var(--color-accent-subtle)] transition-colors'
                >
                  Reconnect
                </button>
                <Dialog.Close className='rounded-md p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors'>
                  <svg
                    className='h-5 w-5'
                    fill='none'
                    viewBox='0 0 24 24'
                    strokeWidth='2'
                    stroke='currentColor'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      d='M6 18L18 6M6 6l12 12'
                    />
                  </svg>
                </Dialog.Close>
              </div>
            </div>
            <div
              ref={containerRef}
              onScroll={handleScroll}
              className='log-scroll flex-1 overflow-y-auto overflow-x-hidden bg-[var(--color-log-bg)] px-4 py-3'
            >
              {error ? (
                <p className='text-red-400 text-sm'>{error}</p>
              ) : loading ? (
                <div className='flex items-center justify-center gap-2 py-8'>
                  <div className='h-5 w-5 animate-spin rounded-full border-2 border-green-400 border-t-transparent' />
                  <span className='text-xs text-green-400/70'>
                    Loading logs…
                  </span>
                </div>
              ) : (
                <pre className='whitespace-pre-wrap break-all font-mono text-xs text-green-400 leading-relaxed m-0'>
                  {lines.join('\n') || '(no logs available)'}
                </pre>
              )}
              <div ref={logEndRef} />
            </div>
            <div className='flex items-center justify-between border-t border-[var(--color-border)] px-4 py-2'>
              <span className='text-xs text-[var(--color-text-muted)]'>
                {lines.length} lines
              </span>
              <button
                onClick={() => {
                  setAutoScroll(true);
                  logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                }}
                className='text-xs text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors'
              >
                Scroll to bottom
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
