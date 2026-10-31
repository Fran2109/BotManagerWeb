import { useRef } from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { AVAILABLE_USERS } from '../constants/users';
import { useExecutionHistory } from '../hooks/useExecutionHistory';
import { useBackHandler } from '../navigation/backHandler';
import { ScreenWrapper, HistoryCard, Paginator } from '../components';
import { ScreenTitle } from '../components/ScreenWrapper';
import { ErrorState, Panel, RefreshButton, SkeletonRows, buttonStyles, initials, useListEntrance } from '../components/ui';

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
  const listRef = useRef<HTMLDivElement>(null);

  // Android back button returns to the account list.
  useBackHandler(() => {
    clearSelection();
    return true;
  }, !!selectedUser);

  // Re-run the entrance for each page and account, not for a refresh of the same page.
  useListEntrance(listRef, history.length > 0, `${selectedUser?.id}-${currentPage}-${pageSize}`);

  if (!selectedUser) {
    return (
      <ScreenWrapper>
        <div className="flex-1 overflow-y-auto">
          <div ref={listRef} className="mx-auto w-full max-w-3xl safe-bottom">
            <ScreenTitle title="Historical" subtitle="Pick an account to see its completed activity." />
            <ul className="mx-3 divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
              {AVAILABLE_USERS.map(user => (
                <li key={user.id} data-row>
                  <button
                    onClick={() => selectUser(user)}
                    className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left active:bg-page"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-tint text-sm font-semibold text-brand-strong">
                      {initials(user.label)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-ink">{user.label}</span>
                      <span className="block truncate text-sm text-muted">{user.email}</span>
                    </span>
                    <ChevronRight size={20} className="text-muted" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </ScreenWrapper>
    );
  }

  let body: React.ReactNode;
  if (error) {
    body = <ErrorState title="Couldn't load the history" error={error} onRetry={refresh} />;
  } else if (loading && history.length === 0) {
    body = <SkeletonRows label="Loading activity" />;
  } else if (history.length === 0) {
    body = <p className="px-4 py-10 text-muted">No completed activity for {selectedUser.label} yet.</p>;
  } else {
    body = (
      <div
        ref={listRef}
        aria-busy={loading}
        className={`mx-auto mb-4 w-full max-w-3xl px-3 transition-opacity ${loading ? 'opacity-50' : ''}`}
      >
        <Panel header="Newest first. Tap a row for details.">
          {history.map(item => (
            <HistoryCard key={item.id} activity={item} />
          ))}
        </Panel>
      </div>
    );
  }

  return (
    <ScreenWrapper>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl">
          <button onClick={clearSelection} className={`${buttonStyles.ghost} ml-2 mt-2`}>
            <ArrowLeft size={18} /> All accounts
          </button>
          <ScreenTitle
            title={selectedUser.label}
            subtitle={selectedUser.email}
            action={<RefreshButton onClick={refresh} busy={loading} busyLabel="Loading" />}
          />
        </div>
        {body}
      </div>

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
