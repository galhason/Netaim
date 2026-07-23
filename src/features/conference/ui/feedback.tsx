'use client';

import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from 'motion/react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { IconCheck, IconClose } from './icons';

/* ============================ Toasts ============================ */

type ToastTone = 'info' | 'success' | 'warn';
interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
}
interface ToastApi {
  show: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

/* Imperative toasts from anywhere under the provider. */
export const useToast = (): ToastApi => {
  const ctx = useContext(ToastContext);
  return ctx ?? { show: () => undefined };
};

const TONES: Record<ToastTone, { bar: string; icon: ReactNode }> = {
  info: { bar: 'bg-[var(--x-primary)]', icon: null },
  success: {
    bar: 'bg-[var(--x-ok)]',
    icon: <IconCheck className="size-4 text-[var(--x-ok)]" />,
  },
  warn: { bar: 'bg-[var(--x-warn)]', icon: null },
};

export const ToastProvider = ({
  children,
  initial,
}: {
  children: ReactNode;
  initial?: { message: string; tone?: ToastTone };
}) => {
  const [items, setItems] = useState<ToastItem[]>([]);
  const [, setSeq] = useState(1);
  const reduce = useReducedMotion();

  const show = useCallback((message: string, tone: ToastTone = 'info') => {
    setSeq((n) => {
      const id = n;
      setItems((prev) => [...prev, { id, tone, message }]);
      return n + 1;
    });
  }, []);

  const dismiss = useCallback(
    (id: number) => setItems((prev) => prev.filter((t) => t.id !== id)),
    [],
  );

  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    if (initial?.message) show(initial.message, initial.tone ?? 'info');
    // run once for the seeded notice
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[80] flex flex-col items-center gap-2 p-4"
      >
        <AnimatePresence>
          {items.map((t) => (
            <ToastCard
              key={t.id}
              item={t}
              reduce={!!reduce}
              onDismiss={() => dismiss(t.id)}
            />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

const ToastCard = ({
  item,
  reduce,
  onDismiss,
}: {
  item: ToastItem;
  reduce: boolean;
  onDismiss: () => void;
}) => {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4200);
    return () => clearTimeout(t);
  }, [onDismiss]);
  const tone = TONES[item.tone];
  return (
    <motion.div
      layout
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 460, damping: 34 }}
      className="pointer-events-auto flex w-full max-w-md items-center gap-3 overflow-hidden rounded-[var(--x-r-field)] border border-[var(--x-line)] bg-[var(--x-surface)] px-4 py-3 shadow-[var(--x-shadow-lift)]"
      role="status"
    >
      <span className={`h-9 w-1 flex-none rounded-full ${tone.bar}`} />
      {tone.icon}
      <span className="flex-1 text-sm text-[var(--x-ink)]">{item.message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="grid size-6 flex-none place-items-center rounded-md text-[var(--x-faint)] transition-colors hover:text-[var(--x-ink)]"
      >
        <IconClose className="size-4" />
      </button>
    </motion.div>
  );
};

/* ============================ Modal ============================ */

export const Modal = ({
  open,
  onClose,
  title,
  children,
  labelledBy,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  labelledBy?: string;
}) => {
  const reduce = useReducedMotion();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="experience fixed inset-0 z-[70] grid place-items-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.18 }}
        >
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="absolute inset-0 bg-[rgba(14,27,46,0.34)] backdrop-blur-[2px]"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            aria-labelledby={labelledBy}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 360, damping: 32 }}
            className="relative z-10 w-full max-w-md rounded-[var(--x-r-card)] bg-[var(--x-surface)] p-6 shadow-[var(--x-shadow-lift)]"
          >
            {title ? (
              <h2 className="font-display text-lg font-bold text-[var(--x-ink)]">
                {title}
              </h2>
            ) : null}
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};

/* ======================= Confirm dialog ======================= */

export const ConfirmDialog = ({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  tone = 'primary',
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  body?: string;
  confirmLabel: string;
  cancelLabel: string;
  tone?: 'primary' | 'danger';
  onConfirm: () => void;
  onClose: () => void;
}) => (
  <Modal open={open} onClose={onClose} title={title}>
    {body ? (
      <p className="mt-2 text-sm leading-relaxed text-[var(--x-soft)]">{body}</p>
    ) : null}
    <div className="mt-5 flex justify-end gap-2.5">
      <button
        type="button"
        onClick={onClose}
        className="rounded-[var(--x-r-field)] px-4 py-2 text-sm font-medium text-[var(--x-soft)] transition-colors hover:text-[var(--x-ink)]"
      >
        {cancelLabel}
      </button>
      <button
        type="button"
        onClick={() => {
          onConfirm();
          onClose();
        }}
        className={`rounded-[var(--x-r-field)] px-5 py-2 text-sm font-medium text-white transition-colors ${
          tone === 'danger'
            ? 'bg-[var(--x-full)] hover:brightness-95'
            : 'bg-[var(--x-primary)] hover:bg-[var(--x-primary-strong)]'
        }`}
      >
        {confirmLabel}
      </button>
    </div>
  </Modal>
);
