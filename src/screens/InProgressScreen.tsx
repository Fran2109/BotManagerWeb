import { useEffect, useRef } from 'react';
import { AVAILABLE_USERS } from '../constants/users';
import { useInProgressActivities } from '../hooks/useInProgressActivities';
import { ScreenWrapper, ActivityCard } from '../components';
import { ScreenTitle } from '../components/ScreenWrapper';
import { RefreshButton, useListEntrance } from '../components/ui';
import { StatusStrip } from './SummaryHeader';

export const InProgressScreen = () => {
  const { usersWithActivities, checkActivitiesStatus, getTotalRunningBots } = useInProgressActivities();
  const listRef = useRef<HTMLDivElement>(null);

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

  useListEntrance(listRef, totalUsers > 0);

  return (
    <ScreenWrapper>
      <div className="flex-1 overflow-y-auto">
        <div ref={listRef} className="mx-auto w-full max-w-3xl safe-bottom">
          <ScreenTitle
            title="Running now"
            subtitle="Updates every 10 seconds"
            action={<RefreshButton onClick={handleRefresh} busy={isRefreshing} />}
          />
          <StatusStrip
            items={[
              { value: runningBotsCount, label: 'Running', lamp: 'on' },
              { value: totalUsers - runningBotsCount - checkingCount, label: 'Idle', lamp: 'idle' },
              { value: checkingCount, label: 'Checking', lamp: 'wait' },
            ]}
          />
          <div className="mx-3 mb-4 divide-y divide-line overflow-hidden rounded-xl border border-line bg-panel">
            {usersWithActivities.map(item => (
              <ActivityCard key={item.id} user={item} />
            ))}
          </div>
        </div>
      </div>
    </ScreenWrapper>
  );
};
