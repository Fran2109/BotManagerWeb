import React from 'react';
import { UserWithActivity } from '../types';
import { Loader } from 'lucide-react';
import { ProgressBar, Spinner, StatusBadge } from './ui';

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
  if (progress === 0) return 'var(--color-muted)';
  if (progress < 25) return 'var(--color-fail)';
  if (progress < 50) return 'var(--color-warn)';
  if (progress < 75) return 'var(--color-run)';
  return 'var(--color-ok)';
};

/** One account row on the In progress screen, with Control Room status labels. */
export const ActivityCard: React.FC<ActivityCardProps> = ({ user }) => {
  const header = (badge: React.ReactNode) => (
    <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink">{user.label}</p>
        <p className="truncate text-sm text-muted">{user.email}</p>
      </div>
      {badge}
    </div>
  );

  if (user.checkingActivity) {
    return (
      <div data-row className="px-4 py-3.5">
        {header(
          <StatusBadge tone="warn" icon={<Spinner className="size-3" />}>
            Checking
          </StatusBadge>,
        )}
      </div>
    );
  }

  if (!user.activity) {
    return (
      <div data-row className="px-4 py-3.5">
        {header(<StatusBadge tone="neutral">No activity</StatusBadge>)}
      </div>
    );
  }

  const { activity } = user;
  const progressPercentage =
    Math.round(((activity.currentLine - 1) / activity.totalLines) * 100) || activity.progress || 0;

  return (
    <div data-row className="border-l-4 border-run px-4 py-4">
      {header(
        <StatusBadge tone="run" icon={<Loader size={13} className="animate-spin motion-reduce:animate-none" />}>
          In progress
        </StatusBadge>,
      )}

      <div className="mt-3 space-y-3">
        <div>
          <p className="break-words text-base font-semibold leading-snug text-ink">{activity.fileName}</p>
          <p className="text-sm text-muted">
            on {activity.deviceName}
            {activity.currentBotName && activity.currentBotName !== activity.fileName
              ? `, now in ${activity.currentBotName}`
              : ''}
          </p>
          {activity.command && <p className="mt-0.5 break-words text-sm text-muted">Step: {activity.command}</p>}
        </div>

        <div>
          <div className="mb-1 flex justify-between text-sm">
            <span className="text-muted">
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
            <dt className="text-muted">Started</dt>
            <dd className="font-medium text-ink">{formatDateTime(activity.startDateTime)}</dd>
          </div>
          <div>
            <dt className="text-muted">Running for</dt>
            <dd className="font-medium text-ink">{formatDuration(activity.startDateTime)}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
};
