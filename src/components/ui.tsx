import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useBackHandler } from '../navigation/backHandler';

// Shared building blocks that replace React Native's Modal, ActivityIndicator and Switch.

interface ModalProps {
  visible: boolean;
  onRequestClose?: () => void;
  children: React.ReactNode;
  /** 'center' = dialog card, 'sheet' = full-height page sheet. */
  variant?: 'center' | 'sheet';
}

export const Modal: React.FC<ModalProps> = ({ visible, onRequestClose, children, variant = 'center' }) => {
  // Android back button closes the top-most modal, like RN's onRequestClose.
  useBackHandler(
    () => {
      onRequestClose?.();
      return true;
    },
    visible,
  );

  useEffect(() => {
    if (!visible) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [visible]);

  if (!visible) return null;

  if (variant === 'sheet') {
    return createPortal(
      <div className="fixed inset-0 z-50 flex flex-col bg-surface animate-slide-up safe-top safe-bottom">
        {children}
      </div>,
      document.body,
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-5 animate-fade-in safe-top safe-bottom">
      <div className="w-full max-w-md animate-pop-in">{children}</div>
    </div>,
    document.body,
  );
};

export const Spinner: React.FC<{ className?: string; color?: string }> = ({
  className = 'size-5',
  color = 'currentColor',
}) => (
  <span
    role="status"
    aria-label="Loading"
    className={`inline-block animate-spin rounded-full border-2 border-t-transparent ${className}`}
    style={{ borderColor: color, borderTopColor: 'transparent' }}
  />
);

export const Dots: React.FC<{ className?: string }> = ({ className = 'bg-primary' }) => (
  <span className="inline-flex items-center gap-1">
    {[0, 150, 300].map(delay => (
      <span
        key={delay}
        className={`size-2 rounded-full animate-dot ${className}`}
        style={{ animationDelay: `${delay}ms` }}
      />
    ))}
  </span>
);

interface SwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  label?: string;
}

export const Switch: React.FC<SwitchProps> = ({ value, onValueChange, disabled, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={value}
    aria-label={label}
    disabled={disabled}
    onClick={() => onValueChange(!value)}
    className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
      value ? 'bg-primary' : 'bg-gray-400'
    } disabled:opacity-50`}
  >
    <span
      className={`inline-block size-5 rounded-full bg-white shadow transition-transform ${
        value ? 'translate-x-6' : 'translate-x-1'
      }`}
    />
  </button>
);

/** Full-area animated loading state (replaces the RN "Modern...Loading" screens). */
export const LoadingState: React.FC<{ emoji: string; title: string; subtitle?: string }> = ({
  emoji,
  title,
  subtitle,
}) => (
  <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-16 animate-fade-in">
    <div className="absolute left-8 top-16 size-20 rounded-full bg-primary/10 animate-float" />
    <div
      className="absolute bottom-24 right-10 size-14 rounded-full bg-success/10 animate-float"
      style={{ animationDelay: '1s' }}
    />
    <div className="relative mb-6 flex size-24 items-center justify-center rounded-full bg-white shadow-lg">
      <span className="absolute inset-0 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
      <span className="text-4xl">{emoji}</span>
    </div>
    <div className="mb-2 flex items-center gap-2">
      <h2 className="text-lg font-bold text-ink">{title}</h2>
      <Dots />
    </div>
    {subtitle ? <p className="text-center text-sm text-muted">{subtitle}</p> : null}
  </div>
);

/** Full-area error state with retry (replaces the RN "ModernErrorScreen"s). */
export const ErrorState: React.FC<{
  title: string;
  subtitle?: string;
  error: string;
  onRetry: () => void;
  retryLabel?: string;
  help?: string;
}> = ({ title, subtitle, error, onRetry, retryLabel = 'Try Again', help }) => (
  <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 animate-fade-in">
    <div className="relative mb-6 animate-shake">
      <span className="absolute -inset-3 rounded-full bg-danger/15 animate-pulse" />
      <div className="relative flex size-20 items-center justify-center rounded-full bg-white shadow-lg">
        <span className="text-4xl">⚠️</span>
      </div>
    </div>
    <h2 className="mb-1 text-center text-xl font-bold text-ink">{title}</h2>
    {subtitle ? <p className="mb-5 text-center text-sm text-muted">{subtitle}</p> : null}
    <div className="mb-6 w-full max-w-md rounded-2xl border border-danger/20 bg-white p-4 shadow-sm">
      <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-danger/10 px-3 py-1 text-xs font-semibold text-danger">
        🔍 Error Details
      </div>
      <p className="break-words text-sm text-ink-soft">{error}</p>
    </div>
    <button
      onClick={onRetry}
      className="rounded-full bg-primary px-8 py-3 font-semibold text-white shadow-md shadow-primary/30 transition active:scale-95"
    >
      🔄 {retryLabel}
    </button>
    {help ? <p className="mt-4 text-center text-xs text-muted">{help}</p> : null}
  </div>
);

export const initials = (label: string) =>
  label
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase();
