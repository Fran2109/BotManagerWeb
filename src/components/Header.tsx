import React from 'react';
import { ArrowLeft } from 'lucide-react';
import logo from '../assets/Logo.jpg';
import { useDrawer } from '../navigation/drawerContext';
import { BreadcrumbItem } from './Breadcrumb';

interface HeaderProps {
  currentPath?: BreadcrumbItem[];
  onBackPress?: () => void;
}

const HamburgerIcon: React.FC<{ open: boolean }> = ({ open }) => (
  <span className="relative block h-4 w-5">
    <span
      className={`absolute left-0 h-0.5 w-5 rounded bg-ink transition-all duration-300 ${
        open ? 'top-1.5 rotate-45' : 'top-0'
      }`}
    />
    <span
      className={`absolute left-0 top-1.5 h-0.5 w-5 rounded bg-ink transition-opacity duration-300 ${
        open ? 'opacity-0' : 'opacity-100'
      }`}
    />
    <span
      className={`absolute left-0 h-0.5 w-5 rounded bg-ink transition-all duration-300 ${
        open ? 'top-1.5 -rotate-45' : 'top-3'
      }`}
    />
  </span>
);

export const Header: React.FC<HeaderProps> = ({ currentPath, onBackPress }) => {
  const { isDrawerOpen, toggleDrawer } = useDrawer();
  const isInSubfolder = !!currentPath && currentPath.length > 1;

  return (
    <header className="flex items-center border-b border-line bg-white px-4 py-3 shadow-sm safe-top">
      <button
        className="flex size-11 items-center justify-center rounded-xl bg-surface transition active:scale-95"
        onClick={isInSubfolder ? onBackPress : toggleDrawer}
        aria-label={isInSubfolder ? 'Back' : 'Menu'}
      >
        {isInSubfolder ? <ArrowLeft size={22} className="text-ink" /> : <HamburgerIcon open={isDrawerOpen} />}
      </button>

      <div className="flex flex-1 flex-col items-center">
        <img src={logo} alt="" className="mb-1 size-9 rounded-lg object-contain" />
        <h1 className="text-base font-bold leading-tight text-ink">Bot Manager</h1>
        <p className="text-xs text-muted">Automation Anywhere</p>
      </div>

      <div className="size-11" />
    </header>
  );
};
