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
    <div className="flex h-full flex-col bg-surface">
      <Header currentPath={currentPath} onBackPress={onBackPress} />
      <main className="flex min-h-0 flex-1 flex-col">{children}</main>
    </div>
  );
};
