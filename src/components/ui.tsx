import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { RotateCw, TriangleAlert } from 'lucide-react';
import { useBackHandler } from '../navigation/backHandler';
import { gsap, motionDuration, useGSAP } from '../lib/motion';

// Shared building blocks that replace React Native's Modal, ActivityIndicator and Switch.

type ModalVariant = 'sheet' | 'center' | 'page';

interface ModalProps {
  visible: boolean;
  /** Called on Esc, back gesture/button and (when dismissible) a tap outside. */
  onRequestClose?: () => void;
  /** false = only the app can close it (e.g. while a bot is being launched). */
  dismissible?: boolean;
  variant?: ModalVariant;
  /** Accessible name: id of the dialog's heading, or a label when there is none. */
  labelledBy?: string;
  label?: string;
  children: React.ReactNode;
}

const ENTER_FROM: Record<ModalVariant, gsap.TweenVars> = {
  sheet: { yPercent: 100 },
  center: { scale: 0.92, opacity: 0 },
  page: { yPercent: 6, opacity: 0 },
};

const supportsClosedBy = typeof HTMLDialogElement !== 'undefined' && 'closedBy' in HTMLDialogElement.prototype;

/**
 * Native modal <dialog> opened with showModal(): the browser provides the top layer,
 * inert page, focus containment and focus return. Visibility stays controlled by
 * React; close requests are routed through onRequestClose.
 */
export const Modal: React.FC<ModalProps> = ({
  visible,
  onRequestClose,
  dismissible = true,
  variant = 'sheet',
  labelledBy,
  label,
  children,
}) => {
  const ref = useRef<HTMLDialogElement>(null);
  const [mounted, setMounted] = useState(visible);
  const requestClose = useRef(onRequestClose);
  requestClose.current = onRequestClose;

  if (visible && !mounted) setMounted(true);

  // Android hardware back button (Capacitor doesn't turn it into a dialog cancel).
  useBackHandler(() => {
    if (dismissible) requestClose.current?.();
    return true;
  }, visible);

  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!dialog || !mounted) return;

    if (visible) {
      if (!dialog.open) {
        dialog.showModal();
        // React doesn't render the autofocus attribute (it calls focus() on mount, before
        // showModal() runs), so mark the initial control with data-autofocus instead.
        dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus();
      }
      gsap.fromTo(
        dialog,
        ENTER_FROM[variant],
        {
          yPercent: 0,
          scale: 1,
          opacity: 1,
          duration: motionDuration(variant === 'sheet' ? 0.38 : 0.24),
          ease: variant === 'sheet' ? 'power3.out' : 'back.out(1.6)',
        },
      );
    } else if (dialog.open) {
      gsap.to(dialog, {
        ...ENTER_FROM[variant],
        duration: motionDuration(0.2),
        ease: 'power2.in',
        onComplete: () => {
          dialog.close();
          setMounted(false);
        },
      });
    } else {
      setMounted(false);
    }
  }, [visible, mounted, variant]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || !mounted) return;

    // Esc / back gesture: keep the dialog open and let React decide.
    const onCancel = (e: Event) => {
      e.preventDefault();
      if (dismissible) requestClose.current?.();
    };
    // The browser may still close it (e.g. repeated Esc); keep React in sync.
    const onClose = () => {
      if (!visible) return;
      if (dismissible) requestClose.current?.();
      else dialog.showModal();
    };
    dialog.addEventListener('cancel', onCancel);
    dialog.addEventListener('close', onClose);

    // Light-dismiss fallback where closedby isn't supported: press and release outside.
    let pressedOutside = false;
    const outside = (e: PointerEvent) => {
      const r = dialog.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };
    const onDown = (e: PointerEvent) => {
      pressedOutside = outside(e);
    };
    const onUp = (e: PointerEvent) => {
      if (pressedOutside && outside(e)) requestClose.current?.();
    };
    const useFallback = dismissible && !supportsClosedBy;
    if (useFallback) {
      dialog.addEventListener('pointerdown', onDown);
      dialog.addEventListener('pointerup', onUp);
    }

    return () => {
      dialog.removeEventListener('cancel', onCancel);
      dialog.removeEventListener('close', onClose);
      if (useFallback) {
        dialog.removeEventListener('pointerdown', onDown);
        dialog.removeEventListener('pointerup', onUp);
      }
    };
  }, [mounted, visible, dismissible]);

  if (!mounted) return null;

  return (
    <dialog
      ref={ref}
      className={`dialog-${variant}`}
      aria-labelledby={labelledBy}
      aria-label={labelledBy ? undefined : label}
      {...{ closedby: dismissible ? 'any' : 'none' }}
    >
      {children}
    </dialog>
  );
};

/** Bottom-sheet surface used inside <Modal variant="sheet">. */
export const Sheet: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`flex max-h-[92dvh] flex-col overflow-y-auto rounded-t-xl bg-surface safe-bottom ${className}`}>
    <span aria-hidden className="mx-auto mb-1 mt-2.5 h-1 w-10 shrink-0 rounded-full bg-line" />
    {children}
  </div>
);

export const Spinner: React.FC<{ className?: string; color?: string; label?: string }> = ({
  className = 'size-5',
  color = 'currentColor',
  label,
}) => (
  <span
    role={label ? 'status' : undefined}
    aria-label={label}
    aria-hidden={label ? undefined : true}
    className={`inline-block animate-spin rounded-full border-2 motion-reduce:animate-none motion-reduce:opacity-60 ${className}`}
    style={{ borderColor: color, borderTopColor: 'transparent' }}
  />
);

export type LampState = 'on' | 'off' | 'wait' | 'idle';

/** Indicator lamp; always pair it with a text label, color alone isn't enough. */
export const Lamp: React.FC<{ state: LampState; className?: string }> = ({ state, className = '' }) => (
  <span aria-hidden className={`lamp ${className}`} data-state={state === 'idle' ? undefined : state} />
);

interface SwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  /** Visible label; use `label` instead when the label is elsewhere (aria-label). */
  children?: React.ReactNode;
  label?: string;
  hint?: string;
}

/** <input type="checkbox" switch>, polyfilled where needed (see main.tsx). */
export const Switch: React.FC<SwitchProps> = ({ value, onValueChange, disabled, children, label, hint }) => {
  const id = useId();
  const input = (
    <input
      id={id}
      type="checkbox"
      {...{ switch: '' }}
      checked={value}
      disabled={disabled}
      aria-label={children ? undefined : label}
      aria-describedby={hint ? `${id}-hint` : undefined}
      onChange={e => onValueChange(e.target.checked)}
      className="shrink-0"
    />
  );
  // Without a visible label, a padded <label> wrapper gives the small control a 44 px tap area.
  if (!children) {
    return <label className="-m-2.5 inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center">{input}</label>;
  }
  return (
    // The whole row is the label, so tapping anywhere on it toggles the switch.
    <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4">
      <span className="min-w-0">
        <span className="block font-medium text-ink">{children}</span>
        {hint ? (
          <span id={`${id}-hint`} className="block text-sm text-muted">
            {hint}
          </span>
        ) : null}
      </span>
      {input}
    </label>
  );
};

const buttonBase =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-md font-semibold transition-colors disabled:opacity-50';

export const buttonStyles = {
  /** AA orange, for the one main action of a screen or dialog. */
  primary: `${buttonBase} bg-brand-strong px-4 py-2.5 text-white active:brightness-90`,
  secondary: `${buttonBase} border border-line bg-surface px-4 py-2.5 text-ink active:bg-page`,
  danger: `${buttonBase} bg-fail px-4 py-2.5 text-white active:brightness-90`,
  ghost: `${buttonBase} px-2 text-ink-soft active:bg-page`,
};

/** Small refresh control for list headers. */
export const RefreshButton: React.FC<{ onClick: () => void; busy: boolean; label?: string; busyLabel?: string }> = ({
  onClick,
  busy,
  label = 'Refresh',
  busyLabel = 'Checking',
}) => (
  <button onClick={onClick} disabled={busy} className={`${buttonStyles.secondary} shrink-0 px-3 text-sm`}>
    <RotateCw size={16} className={busy ? 'animate-spin motion-reduce:animate-none' : ''} />
    {busy ? busyLabel : label}
  </button>
);

/** White bordered container for lists, like a Control Room table. */
export const Panel: React.FC<{ children: React.ReactNode; className?: string; header?: React.ReactNode }> = ({
  children,
  className = '',
  header,
}) => (
  <div className={`overflow-hidden rounded-lg border border-line bg-surface ${className}`}>
    {header ? (
      <div className="border-b border-line bg-page/60 px-4 py-2 text-sm font-medium text-muted">{header}</div>
    ) : null}
    <div className="divide-y divide-line">{children}</div>
  </div>
);

export type StatusTone = 'ok' | 'fail' | 'run' | 'warn' | 'neutral';

const TONE_CLASSES: Record<StatusTone, string> = {
  ok: 'bg-ok/10 text-ok',
  fail: 'bg-fail/10 text-fail',
  run: 'bg-run/10 text-run',
  warn: 'bg-warn/10 text-warn',
  neutral: 'bg-ink/[0.06] text-muted',
};

/** Status label with icon and text, like the Control Room's status column. */
export const StatusBadge: React.FC<{ tone: StatusTone; icon?: React.ReactNode; children: React.ReactNode }> = ({
  tone,
  icon,
  children,
}) => (
  <span
    className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[0.8125rem] font-medium ${TONE_CLASSES[tone]}`}
  >
    {icon}
    {children}
  </span>
);

/** Placeholder rows shaped like a list while it loads. */
export const SkeletonRows: React.FC<{ rows?: number; label: string }> = ({ rows = 6, label }) => (
  <div role="status" aria-label={label} className="mx-3 my-3">
    <div className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-4">
          <span className="skeleton size-5 shrink-0 rounded-full" />
          <span className="flex-1 space-y-2">
            <span className="skeleton block h-3.5" style={{ width: `${55 + ((i * 17) % 35)}%` }} />
            <span className="skeleton block h-3 w-1/3" />
          </span>
        </div>
      ))}
    </div>
  </div>
);

/** Gauge-style progress bar; GSAP eases it to each new value from the last poll. */
export const ProgressBar: React.FC<{ value: number; color: string; label: string }> = ({ value, color, label }) => {
  const fill = useRef<HTMLDivElement>(null);
  const clamped = Math.max(0, Math.min(100, value));
  useGSAP(
    () => {
      gsap.to(fill.current, { width: `${clamped}%`, duration: motionDuration(0.6), ease: 'power2.out' });
    },
    { dependencies: [clamped] },
  );
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      className="h-2 overflow-hidden rounded-full bg-line"
    >
      <div ref={fill} className="h-full rounded-full" style={{ width: 0, backgroundColor: color }} />
    </div>
  );
};

/**
 * Fades list rows in when they first appear, and again when `key` changes (e.g. a new
 * folder), but not on every poll refresh.
 */
export const useListEntrance = (scope: React.RefObject<HTMLElement | null>, ready: boolean, key?: unknown) => {
  useGSAP(
    () => {
      if (!ready) return;
      gsap.from('[data-row]', {
        opacity: 0,
        y: motionDuration(10),
        duration: motionDuration(0.32),
        stagger: motionDuration(0.04),
        ease: 'power2.out',
        clearProps: 'all',
      });
    },
    { scope, dependencies: [ready, key] },
  );
};

/** Full-area loading state. */
export const LoadingState: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => (
  <div role="status" className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
    <Spinner className="size-8 border-[3px]" color="var(--color-ink)" />
    <p className="text-lg font-semibold text-ink">{title}</p>
    {subtitle ? <p className="text-sm text-muted">{subtitle}</p> : null}
  </div>
);

/** Full-area error state with retry. */
export const ErrorState: React.FC<{
  title: string;
  error: string;
  onRetry: () => void;
  retryLabel?: string;
  help?: string;
}> = ({ title, error, onRetry, retryLabel = 'Try again', help }) => {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      gsap.from(ref.current, { x: motionDuration(8), duration: motionDuration(0.45), ease: 'elastic.out(1, 0.3)' });
    },
    { scope: ref },
  );
  return (
    <div ref={ref} role="alert" className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-5 py-12">
      <TriangleAlert size={32} className="text-fail" />
      <div>
        <h2 className="text-xl font-semibold text-ink">{title}</h2>
        <p className="mt-1 break-words text-muted">{error}</p>
        {help ? <p className="mt-2 text-sm text-muted">{help}</p> : null}
      </div>
      <button onClick={onRetry} className={`${buttonStyles.primary} self-start`}>
        <RotateCw size={18} />
        {retryLabel}
      </button>
    </div>
  );
};

export const initials = (label: string) =>
  label
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase();
