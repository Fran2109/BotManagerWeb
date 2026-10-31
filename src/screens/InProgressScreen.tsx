import { useRef, useState } from 'react';
import { AVAILABLE_USERS } from '../constants/users';
import { useInProgressActivities } from '../hooks/useInProgressActivities';
import { usePolling } from '../hooks/usePolling';
import { ScreenWrapper, ActivityCard } from '../components';
import { ScreenTitle } from '../components/ScreenWrapper';
import { Panel, RefreshButton, useListEntrance } from '../components/ui';
import { StatusStrip } from './SummaryHeader';

const formatTime = (ms: number) =>
  new Date(ms).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });

export const InProgressScreen = () => {
  const { usersWithActivities, checkActivitiesStatus, getTotalRunningBots } = useInProgressActivities();
  const listRef = useRef<HTMLDivElement>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);

  const check = (silent: boolean) =>
    checkActivitiesStatus(AVAILABLE_USERS, silent).then(() => setUpdatedAt(Date.now()));

  // Every 10 seconds while the app is visible; paused in the background.
  usePolling(check, 10000);

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
            title="In progress"
            subtitle={updatedAt ? `Updated ${formatTime(updatedAt)}, refreshes every 10 s` : 'Refreshes every 10 s'}
            action={<RefreshButton onClick={() => check(false)} busy={isRefreshing} />}
          />
          <StatusStrip
            items={[
              { value: runningBotsCount, label: 'In progress', lamp: 'on' },
              { value: totalUsers - runningBotsCount - checkingCount, label: 'No activity', lamp: 'idle' },
              { value: checkingCount, label: 'Checking', lamp: 'wait' },
            ]}
          />
          <Panel className="mx-3 mb-4" header="Accounts">
            {usersWithActivities.map(item => (
              <ActivityCard key={item.id} user={item} />
            ))}
          </Panel>
        </div>
      </div>
    </ScreenWrapper>
  );
};
