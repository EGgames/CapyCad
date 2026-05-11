'use client';
import { X } from 'lucide-react';
import { useToastStore, ToastType } from '@/lib/toast';
import { cn } from '@/lib/utils';

const TYPE_STYLES: Record<ToastType, string> = {
  success: 'bg-green-900 border-green-700 text-green-100',
  error: 'bg-red-900 border-red-700 text-red-100',
  warning: 'bg-yellow-900 border-yellow-700 text-yellow-100',
  info: 'bg-zinc-800 border-zinc-600 text-zinc-100',
};

export function Toaster() {
  const { toasts, remove } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="alert"
          className={cn(
            'flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg pointer-events-auto',
            'animate-in slide-in-from-right-4 fade-in duration-200',
            TYPE_STYLES[t.type]
          )}
        >
          <span className="flex-1 text-sm leading-snug">{t.message}</span>
          <button
            onClick={() => remove(t.id)}
            className="ml-1 rounded p-0.5 opacity-70 hover:opacity-100 transition-opacity"
            aria-label="Cerrar notificación"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
