import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Header } from './Header';
import { BreadcrumbItem } from './Breadcrumb';

interface ScreenWrapperProps {
  children: React.ReactNode;
  currentPath?: BreadcrumbItem[];
  onBackPress?: () => void;
}

export const ScreenWrapper: React.FC<ScreenWrapperProps> = ({ children, currentPath, onBackPress }) => {
  return (
    <div className="flex h-full flex-col bg-page">
      <Header currentPath={currentPath} onBackPress={onBackPress} />
      <main className="flex min-h-0 flex-1 flex-col safe-x">{children}</main>
    </div>
  );
};

/** Page title row, like the Control Room's page headers: title, context line, actions. */
export const ScreenTitle: React.FC<{
  title: string;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  /** Shows a back arrow before the title (e.g. from an account's history to the list). */
  onBack?: () => void;
  backLabel?: string;
}> = ({ title, subtitle, action, onBack, backLabel = 'Back' }) => (
  <div className="flex items-center gap-3 px-4 pb-3 pt-4 land:py-2">
    {onBack ? (
      <button
        onClick={onBack}
        aria-label={backLabel}
        className="-ml-2 flex size-11 shrink-0 items-center justify-center rounded-md text-ink active:bg-line/60"
      >
        <ArrowLeft size={22} />
      </button>
    ) : null}
    {/* In landscape the title and its context line share one row to save height. */}
    <div className="min-w-0 flex-1 land:flex land:items-baseline land:gap-3">
      <h1 className="text-[1.375rem] font-semibold leading-tight text-ink land:shrink-0 land:text-lg">{title}</h1>
      {subtitle ? <p className="mt-0.5 truncate text-sm text-muted land:mt-0">{subtitle}</p> : null}
    </div>
    {action}
  </div>
);
