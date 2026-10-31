import React from 'react';
import { ArrowLeft, Menu, X } from 'lucide-react';
import logo from '../assets/Logo.jpg';
import { ROUTE_META, useDrawer } from '../navigation/drawerContext';
import { BreadcrumbItem } from './Breadcrumb';

interface HeaderProps {
  currentPath?: BreadcrumbItem[];
  onBackPress?: () => void;
}

/** Graphite top bar, like the Control Room's, showing where you are ("Activity / In progress"). */
export const Header: React.FC<HeaderProps> = ({ currentPath, onBackPress }) => {
  const { route, isDrawerOpen, toggleDrawer } = useDrawer();
  const isInSubfolder = !!currentPath && currentPath.length > 1;
  const { group, label } = ROUTE_META[route];

  return (
    <header className="bg-nav text-white safe-top">
      <div className="flex items-center gap-2 px-2 py-2">
        <button
          className="flex size-11 shrink-0 items-center justify-center rounded-md active:bg-white/10"
          onClick={isInSubfolder ? onBackPress : toggleDrawer}
          aria-label={isInSubfolder ? 'Back to parent folder' : isDrawerOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isInSubfolder ? undefined : isDrawerOpen}
        >
          {isInSubfolder ? <ArrowLeft size={22} /> : isDrawerOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
        <img src={logo} alt="" className="size-7 shrink-0 rounded bg-white object-contain p-0.5" />
        <p className="min-w-0 truncate pl-1 text-[15px]">
          <span className="text-white/60">{group} / </span>
          <span className="font-semibold">{label}</span>
        </p>
      </div>
      <div className="brand-line h-0.5" />
    </header>
  );
};
