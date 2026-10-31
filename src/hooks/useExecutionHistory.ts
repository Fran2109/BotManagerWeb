import { useState, useCallback } from 'react';
import { User, ActivityItem } from '../types';
import { getToken, getExecutionHistory } from '../Functions';
import { DEFAULT_PASSWORD } from '../constants/users';
import { describeError } from '../lib/errors';

interface HistoryData {
  page: {
    offset: number;
    total: number;
    totalFilter: number;
  };
  list: ActivityItem[];
}

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

  const fetchHistory = useCallback(async (
    user: User, 
    page: number = 0, 
    currentPageSize: number = pageSize
  ) => {
    try {
      setLoading(true);
      setError(null);

      const token = await getToken(user.email, DEFAULT_PASSWORD);
      const offset = page * currentPageSize;
      
      const historyData = await getExecutionHistory(user.email, token, offset, currentPageSize);
      
      const newExecutions = historyData.list || [];
      
      setHistory(newExecutions);
      setCurrentPage(page);
      setTotalExecutions(historyData.page.totalFilter || historyData.page.total || 0);
      setTotalPages(Math.ceil((historyData.page.totalFilter || historyData.page.total || 0) / currentPageSize));
      setHasMore((offset + currentPageSize) < (historyData.page.totalFilter || historyData.page.total || 0));

    } catch (err: any) {
      console.error('Error fetching execution history:', err);
      setError(describeError(err));
      setHistory([]);
    } finally {
      setLoading(false);
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

  const refresh = useCallback(() => {
    if (selectedUser) {
      fetchHistory(selectedUser, currentPage, pageSize);
    }
  }, [selectedUser, currentPage, pageSize, fetchHistory]);

  const clearSelection = useCallback(() => {
    setSelectedUser(null);
    setHistory([]);
    setCurrentPage(0);
    setTotalPages(0);
    setTotalExecutions(0);
    setHasMore(false);
    setError(null);
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
    selectUser,
    goToPage,
    changePageSize,
    refresh,
    clearSelection,
  };
};