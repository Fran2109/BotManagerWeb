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

  // When 9 buttons of 44 px don't fit (narrow phone or large system text), first/last and
  // the two outermost page numbers are hidden so the rest keep a full touch target.
  // A container query in rem reacts to both the available width and the text size.
  const narrowHidden = '@max-[26rem]:hidden';

  const navButton = (
    onClick: () => void,
    enabled: boolean,
    icon: React.ReactNode,
    label: string,
    className = '',
  ) => (
    <button
      onClick={onClick}
      disabled={!enabled || loading}
      aria-label={label}
      className={`flex size-11 shrink-0 items-center justify-center rounded-md text-ink active:bg-page disabled:text-line ${className}`}
    >
      {icon}
    </button>
  );

  return (
    <nav aria-label="Pages" className="border-t border-line bg-surface px-3 pt-2 safe-bottom land:flex land:items-center land:gap-2 land:py-1">
      <div className="flex items-center justify-between gap-2 px-1 text-sm land:contents">
        <span className="text-muted">
          {totalPages <= 1
            ? totalItems === 0
              ? 'No runs'
              : `${totalItems} run${totalItems === 1 ? '' : 's'}`
            : `${startItem}–${endItem} of ${totalItems}`}
        </span>
        <button
          onClick={() => setShowDropdown(true)}
          aria-haspopup="dialog"
          className="flex min-h-11 items-center gap-1 rounded-lg px-2 font-medium text-ink active:bg-page land:order-2"
        >
          {pageSize} per page <ChevronDown size={14} />
        </button>
      </div>

      {totalPages > 1 && (
        <div className="@container flex items-center justify-center gap-0.5 pb-2 pt-1 land:order-1 land:flex-1 land:py-0">
          {navButton(() => handlePageChange(0), canGoPrevious, <ChevronsLeft size={18} />, 'First page', narrowHidden)}
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
                className={`flex size-11 shrink-0 items-center justify-center rounded-md text-sm font-semibold ${Math.abs(page - currentPage) >= 2 ? narrowHidden : ''} ${
                  current ? 'bg-brand-strong text-white' : 'text-ink active:bg-page'
                }`}
              >
                {page + 1}
              </button>
            );
          })}
          {navButton(() => handlePageChange(currentPage + 1), canGoNext, <ChevronRight size={18} />, 'Next page')}
          {navButton(() => handlePageChange(totalPages - 1), canGoNext, <ChevronsRight size={18} />, 'Last page', narrowHidden)}
        </div>
      )}

      <Modal
        visible={showDropdown}
        onRequestClose={() => setShowDropdown(false)}
        variant="center"
        labelledBy="page-size-title"
      >
        <div className="overflow-hidden rounded-lg bg-surface py-2 shadow-xl">
          <h2 id="page-size-title" className="px-5 pb-1 pt-2 text-base font-semibold text-ink">
            Runs per page
          </h2>
          {pageSizeOptions.map(option => (
            <button
              key={option}
              onClick={() => handlePageSizeChange(option)}
              data-autofocus={option === pageSize || undefined}
              aria-pressed={option === pageSize}
              className={`block w-full px-5 py-3 text-left ${
                option === pageSize ? 'bg-brand/25 font-semibold text-ink' : 'text-ink active:bg-page'
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
