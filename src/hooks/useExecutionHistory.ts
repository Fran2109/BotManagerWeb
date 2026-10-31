import { useState, useCallback, useRef } from 'react';
import { User, ActivityItem } from '../types';
import { getToken, getExecutionHistory, HistoryFilter } from '../Functions';
import { DEFAULT_PASSWORD } from '../constants/users';
import { describeError } from '../lib/errors';

export const useExecutionHistory = () => {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [history, setHistory] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalExecutions, setTotalExecutions] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [hasMore, setHasMore] = useState(false);
  // Status/date filters are applied by the Control Room, so totals and pages cover every
  // matching run, not just the loaded page.
  const [filter, setFilter] = useState<HistoryFilter>({});
  const filterRef = useRef(filter);
  // Only the latest request may update the list (filters can change faster than replies).
  const requestId = useRef(0);

  const fetchHistory = useCallback(async (
    user: User,
    page: number = 0,
    currentPageSize: number = pageSize,
    currentFilter: HistoryFilter = filterRef.current,
  ) => {
    const id = ++requestId.current;
    try {
      setLoading(true);
      setError(null);

      const token = await getToken(user.email, DEFAULT_PASSWORD);
      const offset = page * currentPageSize;

      const historyData = await getExecutionHistory(user.email, token, offset, currentPageSize, currentFilter);
      if (id !== requestId.current) return;

      const total = historyData.page.totalFilter ?? historyData.page.total ?? 0;
      setHistory(historyData.list || []);
      setCurrentPage(page);
      setTotalExecutions(total);
      setTotalPages(Math.ceil(total / currentPageSize));
      setHasMore(offset + currentPageSize < total);
    } catch (err: any) {
      if (id !== requestId.current) return;
      console.error('Error fetching execution history:', err);
      setError(describeError(err));
      setHistory([]);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [pageSize]);

  const selectUser = useCallback((user: User) => {
    setSelectedUser(user);
    setCurrentPage(0);
    setHistory([]);
    setTotalPages(0);
    setTotalExecutions(0);
    setHasMore(false);
    setError(null);
    fetchHistory(user, 0, pageSize);
  }, [fetchHistory, pageSize]);

  const goToPage = useCallback((page: number) => {
    if (selectedUser && !loading && page >= 0) {
      fetchHistory(selectedUser, page, pageSize);
    }
  }, [selectedUser, loading, fetchHistory, pageSize]);

  const changePageSize = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    if (selectedUser) {
      setCurrentPage(0);
      fetchHistory(selectedUser, 0, newPageSize);
    }
  }, [selectedUser, fetchHistory]);

  /** Applies new filters and goes back to the first page. */
  const changeFilter = useCallback((next: HistoryFilter) => {
    filterRef.current = next;
    setFilter(next);
    if (selectedUser) {
      setCurrentPage(0);
      fetchHistory(selectedUser, 0, pageSize, next);
    }
  }, [selectedUser, fetchHistory, pageSize]);

  const refresh = useCallback(() => {
    if (selectedUser) {
      fetchHistory(selectedUser, currentPage, pageSize);
    }
  }, [selectedUser, currentPage, pageSize, fetchHistory]);

  const clearSelection = useCallback(() => {
    requestId.current++;
    setSelectedUser(null);
    setHistory([]);
    setCurrentPage(0);
    setTotalPages(0);
    setTotalExecutions(0);
    setHasMore(false);
    setError(null);
    setLoading(false);
  }, []);

  return {
    selectedUser,
    history,
    loading,
    error,
    currentPage,
    totalPages,
    totalExecutions,
    pageSize,
    hasMore,
    filter,
    selectUser,
    goToPage,
    changePageSize,
    changeFilter,
    refresh,
    clearSelection,
  };
};
