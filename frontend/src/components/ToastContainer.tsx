import { useEffect } from 'react';
import type { Toast } from '../types';

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className='fixed bottom-4 right-4 z-50 flex flex-col gap-2'>
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onRemove,
}: {
  toast: Toast;
  onRemove: (id: string) => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  return (
    <div
      className={`flex items-center gap-2 rounded-lg border bg-[var(--color-surface)] px-4 py-3 text-sm font-medium transition-all animate-[slideIn_0.2s_ease-out] ${
        toast.type === 'success'
          ? 'border-[var(--color-status-success-border)] text-[var(--color-status-success-text)]'
          : 'border-[var(--color-status-danger-border)] text-[var(--color-status-danger-text)]'
      }`}
    >
      <div
        className={`w-1 self-stretch rounded-full ${
          toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        }`}
      />
      {toast.type === 'success' ? (
        <svg
          className='h-4 w-4 shrink-0'
          fill='none'
          viewBox='0 0 24 24'
          strokeWidth='2'
          stroke='currentColor'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            d='M4.5 12.75l6 6 9-13.5'
          />
        </svg>
      ) : (
        <svg
          className='h-4 w-4 shrink-0'
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
      )}
      <span className='max-w-xs truncate'>{toast.message}</span>
      <button
        onClick={() => onRemove(toast.id)}
        className='ml-2 opacity-70 hover:opacity-100'
      >
        &times;
      </button>
    </div>
  );
}
