'use client';

import { useEffect, useId, type ReactNode } from 'react';

// A small centred pop-up. Closes on Escape or a click outside, unless `busy`.
export function Modal({
  open,
  title,
  onClose,
  children,
  busy = false,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  busy?: boolean;
}) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-lg border border-border-line bg-bg-surface p-5 shadow-xl space-y-4 text-text-primary"
      >
        <h3 id={titleId} className="font-display text-base font-bold">
          {title}
        </h3>
        {children}
      </div>
    </div>
  );
}

export const modalButton =
  'rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50 border border-border-line bg-bg-elevated text-text-primary';
export const modalPrimary =
  'rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50 bg-accent-primary text-white';
export const modalDanger =
  'rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50 bg-red-600 text-white';
