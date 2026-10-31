import React from 'react';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  id: string;
  name: string;
}

interface BreadcrumbProps {
  path: BreadcrumbItem[];
  onNavigate: (item: BreadcrumbItem, index: number) => void;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ path, onNavigate }) => {
  return (
    <nav aria-label="Folder path" className="border-b border-line bg-surface">
      <ol className="no-scrollbar flex items-center overflow-x-auto px-3 py-2">
        {path.map((item, index) => {
          const isCurrent = index === path.length - 1;
          return (
            <li key={item.id} className="flex shrink-0 items-center">
              {isCurrent ? (
                <span aria-current="page" className="flex min-h-11 items-center px-1.5 text-sm font-semibold text-ink">
                  {item.name}
                </span>
              ) : (
                <>
                  <button
                    onClick={() => onNavigate(item, index)}
                    className="min-h-11 min-w-11 rounded px-1.5 text-sm text-brand-strong underline-offset-2 active:underline"
                  >
                    {item.name}
                  </button>
                  <ChevronRight aria-hidden size={14} className="text-muted/70" />
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
