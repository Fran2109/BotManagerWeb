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
      className="flex size-9 items-center justify-center rounded-lg border border-line bg-white text-primary transition active:scale-95 disabled:text-gray-300"
    >
      {icon}
    </button>
  );

  const pageSizeButton = (
    <button
      onClick={() => setShowDropdown(true)}
      className="flex items-center gap-1 self-center rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink-soft"
    >
      {pageSize} per page <ChevronDown size={14} />
    </button>
  );

  const dropdown = (
    <Modal visible={showDropdown} onRequestClose={() => setShowDropdown(false)}>
      <div className="mx-auto w-56 overflow-hidden rounded-2xl bg-white shadow-xl">
        {pageSizeOptions.map(option => (
          <button
            key={option}
            onClick={() => handlePageSizeChange(option)}
            className={`block w-full px-5 py-3 text-left text-sm ${
              option === pageSize ? 'bg-primary/10 font-semibold text-primary' : 'text-ink hover:bg-surface'
            }`}
          >
            {option} per page
          </button>
        ))}
      </div>
    </Modal>
  );

  if (totalPages <= 1) {
    return (
      <div className="flex items-center justify-between border-t border-line bg-white px-4 py-3 safe-bottom">
        <span className="text-sm text-muted">
          {totalItems === 0 ? 'No items' : `${totalItems} item${totalItems === 1 ? '' : 's'}`}
        </span>
        {pageSizeButton}
        {dropdown}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5 border-t border-line bg-white px-4 py-3 safe-bottom">
      <div className="flex justify-between text-sm">
        <span className="font-medium text-ink">
          {startItem}-{endItem} of {totalItems}
        </span>
        <span className="text-muted">
          Page {currentPage + 1} of {totalPages}
        </span>
      </div>

      <div className="flex items-center justify-center gap-1.5">
        {navButton(() => handlePageChange(0), canGoPrevious, <ChevronsLeft size={18} />, 'First page')}
        {navButton(() => handlePageChange(currentPage - 1), canGoPrevious, <ChevronLeft size={18} />, 'Previous page')}
        {getVisiblePages().map(page => (
          <button
            key={page}
            onClick={() => handlePageChange(page)}
            disabled={loading}
            className={`flex size-9 items-center justify-center rounded-lg text-sm font-semibold transition ${
              page === currentPage ? 'bg-primary text-white shadow' : 'border border-line bg-white text-ink'
            }`}
          >
            {page + 1}
          </button>
        ))}
        {navButton(() => handlePageChange(currentPage + 1), canGoNext, <ChevronRight size={18} />, 'Next page')}
        {navButton(() => handlePageChange(totalPages - 1), canGoNext, <ChevronsRight size={18} />, 'Last page')}
      </div>

      {pageSizeButton}
      {dropdown}
    </div>
  );
};
