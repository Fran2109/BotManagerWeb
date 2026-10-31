import { ArrowLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { AVAILABLE_USERS } from '../constants/users';
import { useExecutionHistory } from '../hooks/useExecutionHistory';
import { useBackHandler } from '../navigation/backHandler';
import { ScreenWrapper, HistoryCard, Paginator } from '../components';
import { ErrorState, LoadingState, initials } from '../components/ui';

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100, 200];

export const HistoricalScreen = () => {
  const {
    selectedUser,
    history,
    loading,
    error,
    currentPage,
    totalPages,
    totalExecutions,
    pageSize,
    selectUser,
    goToPage,
    changePageSize,
    refresh,
    clearSelection,
  } = useExecutionHistory();

  // Android back button returns to the account list.
  useBackHandler(() => {
    clearSelection();
    return true;
  }, !!selectedUser);

  if (!selectedUser) {
    return (
      <ScreenWrapper>
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl p-4 safe-bottom">
            <h2 className="mt-2 text-center text-2xl font-bold text-ink">Select Account to View History</h2>
            <p className="mb-5 text-center text-sm text-muted">Choose an account to see execution history</p>
            <div className="flex flex-col gap-3">
              {AVAILABLE_USERS.map((user, index) => (
                <button
                  key={user.id}
                  onClick={() => selectUser(user)}
                  style={{ animationDelay: `${index * 70}ms` }}
                  className="flex items-center gap-3 rounded-2xl border border-line bg-white p-4 text-left shadow-sm transition animate-slide-up active:scale-[0.98]"
                >
                  <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                    {initials(user.label)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold text-ink">{user.label}</span>
                    <span className="block truncate text-sm text-muted">{user.email}</span>
                  </span>
                  <ChevronRight size={20} className="text-gray-400" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </ScreenWrapper>
    );
  }

  let body: React.ReactNode;
  if (error) {
    body = <ErrorState title="Error loading history:" error={error} onRetry={refresh} retryLabel="Retry" />;
  } else if (loading && history.length === 0) {
    body = <LoadingState emoji="📋" title="Loading execution history" subtitle="Retrieving your automation timeline" />;
  } else if (history.length === 0) {
    body = <p className="py-16 text-center text-muted">No executions found</p>;
  } else {
    body = (
      <div className={`mx-auto flex w-full max-w-3xl flex-col gap-3 p-4 transition-opacity ${loading ? 'opacity-50' : ''}`}>
        {history.map(item => (
          <HistoryCard key={item.id} activity={item} />
        ))}
      </div>
    );
  }

  return (
    <ScreenWrapper>
      <div className="border-b border-line bg-white px-4 pb-4 pt-3">
        <div className="mb-2 flex items-center justify-between">
          <button
            onClick={clearSelection}
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 font-semibold text-primary"
          >
            <ArrowLeft size={18} /> Back
          </button>
          <button
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow transition active:scale-95 disabled:bg-primary/60"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Loading' : 'Refresh'}
          </button>
        </div>
        <h2 className="text-center text-2xl font-bold text-ink">Execution History</h2>
        <p className="text-center text-sm text-muted">{selectedUser.label}</p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{body}</div>

      {!error && totalExecutions > 0 && (
        <Paginator
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalExecutions}
          pageSize={pageSize}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          onPageChange={goToPage}
          onPageSizeChange={changePageSize}
          loading={loading}
        />
      )}
    </ScreenWrapper>
  );
};
