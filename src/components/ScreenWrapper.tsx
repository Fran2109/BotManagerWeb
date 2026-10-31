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
    <div className="flex h-full flex-col bg-enamel">
      <Header currentPath={currentPath} onBackPress={onBackPress} />
      <main className="flex min-h-0 flex-1 flex-col">{children}</main>
    </div>
  );
};

/** Screen title block: left-aligned, condensed display type. */
export const ScreenTitle: React.FC<{ title: string; subtitle?: React.ReactNode; action?: React.ReactNode }> = ({
  title,
  subtitle,
  action,
}) => (
  <div className="flex items-end justify-between gap-3 px-4 pb-3 pt-5">
    <div className="min-w-0">
      <h1 className="font-display text-[28px] font-bold leading-none text-ink">{title}</h1>
      {subtitle ? <p className="mt-1.5 text-sm text-steel">{subtitle}</p> : null}
    </div>
    {action}
  </div>
);
