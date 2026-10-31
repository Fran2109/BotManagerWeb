import React, { useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Modal } from './ui';

interface PaginatorProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  pageSizeOptions: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  loading?: boolean;
}

export const Paginator: React.FC<PaginatorProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,
  loading = false,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);

  const startItem = currentPage * pageSize + 1;
  const endItem = Math.min((currentPage + 1) * pageSize, totalItems);

  const canGoPrevious = currentPage > 0;
  const canGoNext = currentPage < totalPages - 1;

  const handlePageChange = (page: number) => {
    if (page >= 0 && page < totalPages && !loading) {
      onPageChange(page);
    }
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setShowDropdown(false);
    if (newPageSize !== pageSize) {
      onPageSizeChange(newPageSize);
    }
  };

  const getVisiblePages = () => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 0; i < totalPages; i++) {
        pages.push(i);
      }
    } else {
      const startPage = Math.max(0, currentPage - 2);
      const endPage = Math.min(totalPages - 1, startPage + maxVisiblePages - 1);

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }

    return pages;
  };

  const navButton = (onClick: () => void, enabled: boolean, icon: React.ReactNode, label: string) => (
    <button
      onClick={onClick}
      disabled={!enabled || loading}
      aria-label={label}
      className="flex size-10 items-center justify-center rounded-lg text-ink active:bg-enamel disabled:text-line"
    >
      {icon}
    </button>
  );

  return (
    <nav aria-label="Pages" className="border-t border-line bg-panel px-3 pt-2 safe-bottom">
      <div className="flex items-center justify-between gap-2 px-1 text-sm">
        <span className="text-steel">
          {totalPages <= 1
            ? totalItems === 0
              ? 'No runs'
              : `${totalItems} run${totalItems === 1 ? '' : 's'}`
            : `${startItem}–${endItem} of ${totalItems}`}
        </span>
        <button
          onClick={() => setShowDropdown(true)}
          aria-haspopup="dialog"
          className="flex items-center gap-1 rounded-lg px-2 py-1.5 font-medium text-ink active:bg-enamel"
        >
          {pageSize} per page <ChevronDown size={14} />
        </button>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-0.5 pb-2 pt-1">
          {navButton(() => handlePageChange(0), canGoPrevious, <ChevronsLeft size={18} />, 'First page')}
          {navButton(() => handlePageChange(currentPage - 1), canGoPrevious, <ChevronLeft size={18} />, 'Previous page')}
          {getVisiblePages().map(page => {
            const current = page === currentPage;
            return (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                disabled={loading}
                aria-label={`Page ${page + 1}`}
                aria-current={current ? 'page' : undefined}
                className={`flex size-10 items-center justify-center rounded-lg text-sm font-semibold ${
                  current ? 'bg-ink text-panel' : 'text-ink active:bg-enamel'
                }`}
              >
                {page + 1}
              </button>
            );
          })}
          {navButton(() => handlePageChange(currentPage + 1), canGoNext, <ChevronRight size={18} />, 'Next page')}
          {navButton(() => handlePageChange(totalPages - 1), canGoNext, <ChevronsRight size={18} />, 'Last page')}
        </div>
      )}

      <Modal
        visible={showDropdown}
        onRequestClose={() => setShowDropdown(false)}
        variant="center"
        labelledBy="page-size-title"
      >
        <div className="overflow-hidden rounded-2xl bg-panel py-2 shadow-xl">
          <h2 id="page-size-title" className="px-5 pb-1 pt-2 font-display text-lg font-semibold text-ink">
            Runs per page
          </h2>
          {pageSizeOptions.map(option => (
            <button
              key={option}
              onClick={() => handlePageSizeChange(option)}
              data-autofocus={option === pageSize || undefined}
              aria-pressed={option === pageSize}
              className={`block w-full px-5 py-3 text-left ${
                option === pageSize ? 'bg-signal/25 font-semibold text-ink' : 'text-ink active:bg-enamel'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </Modal>
    </nav>
  );
};
