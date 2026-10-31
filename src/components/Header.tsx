import React from 'react';
import { ArrowLeft, Menu, X } from 'lucide-react';
import logo from '../assets/Logo.jpg';
import { useDrawer } from '../navigation/drawerContext';
import { BreadcrumbItem } from './Breadcrumb';

interface HeaderProps {
  currentPath?: BreadcrumbItem[];
  onBackPress?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentPath, onBackPress }) => {
  const { isDrawerOpen, toggleDrawer } = useDrawer();
  const isInSubfolder = !!currentPath && currentPath.length > 1;

  return (
    <header className="bg-ink text-panel safe-top">
      <div className="flex items-center gap-3 px-3 py-2.5">
        <button
          className="flex size-11 items-center justify-center rounded-lg active:bg-white/10"
          onClick={isInSubfolder ? onBackPress : toggleDrawer}
          aria-label={isInSubfolder ? 'Back to parent folder' : isDrawerOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isInSubfolder ? undefined : isDrawerOpen}
        >
          {isInSubfolder ? <ArrowLeft size={24} /> : isDrawerOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <img src={logo} alt="" className="size-8 rounded-md bg-white object-contain p-0.5" />
        <div className="min-w-0">
          <p className="font-display text-lg font-bold leading-tight">Bot Manager</p>
          <p className="text-xs text-panel/60">Automation Anywhere</p>
        </div>
      </div>
      {/* Hazard-stripe edge: the one decorative nod to the machine-panel theme. */}
      <div
        aria-hidden
        className="h-1.5"
        style={{
          background:
            'repeating-linear-gradient(-45deg, var(--color-signal) 0 10px, var(--color-ink) 10px 20px)',
        }}
      />
    </header>
  );
};
