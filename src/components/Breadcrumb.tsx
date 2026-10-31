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
    <div className="border-b border-line bg-white">
      <div className="no-scrollbar flex items-center overflow-x-auto px-4 py-2.5">
        {path.map((item, index) => {
          const isCurrent = index === path.length - 1;
          return (
            <div key={item.id} className="flex shrink-0 items-center">
              <button
                onClick={() => onNavigate(item, index)}
                disabled={isCurrent}
                className={`rounded-md px-2 py-1 text-sm transition ${
                  isCurrent ? 'bg-primary/10 font-semibold text-primary' : 'text-muted hover:text-primary'
                }`}
              >
                {item.name}
              </button>
              {!isCurrent && <ChevronRight size={16} className="mx-0.5 text-gray-400" />}
            </div>
          );
        })}
      </div>
    </div>
  );
};
