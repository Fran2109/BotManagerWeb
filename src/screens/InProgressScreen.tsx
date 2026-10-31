import { useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { AVAILABLE_USERS } from '../constants/users';
import { useInProgressActivities } from '../hooks/useInProgressActivities';
import { ScreenWrapper, ActivityCard } from '../components';
import { SummaryHeader } from './SummaryHeader';

export const InProgressScreen = () => {
  const { usersWithActivities, checkActivitiesStatus, getTotalRunningBots } = useInProgressActivities();

  const handleRefresh = () => {
    checkActivitiesStatus(AVAILABLE_USERS, false);
  };

  // Initial check, then refresh silently every 10 seconds while this screen is mounted.
  useEffect(() => {
    checkActivitiesStatus(AVAILABLE_USERS, false);
    const interval = setInterval(() => {
      checkActivitiesStatus(AVAILABLE_USERS, true);
    }, 10000);
    return () => clearInterval(interval);
  }, [checkActivitiesStatus]);

  const runningBotsCount = getTotalRunningBots();
  const totalUsers = usersWithActivities.length;
  const checkingCount = usersWithActivities.filter(user => user.checkingActivity).length;
  const isRefreshing = checkingCount > 0;

  return (
    <ScreenWrapper>
      <SummaryHeader
        title="Bots in Progress"
        subtitle="Real-time activity monitor"
        items={[
          { value: runningBotsCount, label: 'Running', color: '#28a745' },
          { value: totalUsers - runningBotsCount - checkingCount, label: 'Inactive', color: '#6c757d' },
          { value: checkingCount, label: 'Checking', color: '#ffc107' },
        ]}
      />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl p-4 safe-bottom">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-bold text-ink">All Accounts</h3>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow transition active:scale-95 disabled:bg-primary/60"
            >
              <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
              {isRefreshing ? 'Checking' : 'Refresh'}
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {usersWithActivities.map(item => (
              <ActivityCard key={item.id} user={item} />
            ))}
          </div>
        </div>
      </div>
    </ScreenWrapper>
  );
};
