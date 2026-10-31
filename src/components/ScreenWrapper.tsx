import React from 'react';
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
      <main className="flex min-h-0 flex-1 flex-col">{children}</main>
    </div>
  );
};

/** Page title row, like the Control Room's page headers: title, context line, actions. */
export const ScreenTitle: React.FC<{ title: string; subtitle?: React.ReactNode; action?: React.ReactNode }> = ({
  title,
  subtitle,
  action,
}) => (
  <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-4">
    <div className="min-w-0">
      <h1 className="text-[22px] font-semibold leading-tight text-ink">{title}</h1>
      {subtitle ? <p className="mt-0.5 text-sm text-muted">{subtitle}</p> : null}
    </div>
    {action}
  </div>
);
