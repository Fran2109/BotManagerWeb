import React from 'react';
import { UserWithActivity } from '../types';
import { Lamp, ProgressBar } from './ui';

interface ActivityCardProps {
  user: UserWithActivity;
}

const formatDateTime = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Argentina/Buenos_Aires',
    });
  } catch {
    return dateString;
  }
};

const formatDuration = (startTime: string): string => {
  try {
    const start = new Date(startTime);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  } catch {
    return 'N/A';
  }
};

const getProgressColor = (progress: number): string => {
  if (progress === 0) return '#626d73';
  if (progress < 25) return '#d2382b';
  if (progress < 50) return '#e08a00';
  if (progress < 75) return '#2f7fb5';
  return '#1f9d55';
};

/** One account row on the "Running now" screen. */
export const ActivityCard: React.FC<ActivityCardProps> = ({ user }) => {
  const header = (lamp: React.ReactNode, state: string) => (
    <div className="flex items-center gap-3">
      {lamp}
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink">{user.label}</p>
        <p className="truncate text-sm text-steel">{user.email}</p>
      </div>
      <span className="shrink-0 text-sm font-medium text-ink-soft">{state}</span>
    </div>
  );

  if (user.checkingActivity) {
    return (
      <div data-row className="px-4 py-3.5">
        {header(<Lamp state="wait" />, 'Checking')}
      </div>
    );
  }

  if (!user.activity) {
    return (
      <div data-row className="px-4 py-3.5">
        {header(<Lamp state="idle" />, 'Idle')}
      </div>
    );
  }

  const { activity } = user;
  const progressPercentage =
    Math.round(((activity.currentLine - 1) / activity.totalLines) * 100) || activity.progress || 0;

  return (
    <div data-row className="bg-signal/10 px-4 py-4">
      {header(<Lamp state="on" />, 'Running')}

      <div className="mt-3 ml-[22px] space-y-3">
        <div>
          <p className="break-words font-display text-lg font-semibold leading-snug text-ink">{activity.fileName}</p>
          <p className="text-sm text-steel">
            on {activity.deviceName}
            {activity.currentBotName && activity.currentBotName !== activity.fileName
              ? `, now in ${activity.currentBotName}`
              : ''}
          </p>
          {activity.command && <p className="mt-0.5 break-words text-sm text-steel">Step: {activity.command}</p>}
        </div>

        <div>
          <div className="mb-1 flex justify-between text-sm">
            <span className="text-steel">
              Line {activity.currentLine} of {activity.totalLines}
            </span>
            <span className="font-semibold text-ink">{progressPercentage}%</span>
          </div>
          <ProgressBar
            value={progressPercentage}
            color={getProgressColor(progressPercentage)}
            label={`${activity.fileName} progress`}
          />
        </div>

        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-steel">Started</dt>
            <dd className="font-medium text-ink">{formatDateTime(activity.startDateTime)}</dd>
          </div>
          <div>
            <dt className="text-steel">Running for</dt>
            <dd className="font-medium text-ink">{formatDuration(activity.startDateTime)}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
};
