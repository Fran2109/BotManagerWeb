import React from 'react';
import { UserWithActivity } from '../types';
import { Dots } from './ui';

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
  if (progress === 0) return '#6c757d';
  if (progress < 25) return '#dc3545';
  if (progress < 50) return '#ffc107';
  if (progress < 75) return '#17a2b8';
  return '#28a745';
};

const UserSection: React.FC<{ user: UserWithActivity }> = ({ user }) => (
  <div className="min-w-0">
    <p className="text-base font-bold text-ink">{user.label}</p>
    <p className="truncate text-sm text-muted">{user.email}</p>
  </div>
);

export const ActivityCard: React.FC<ActivityCardProps> = ({ user }) => {
  if (user.checkingActivity) {
    return (
      <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
        <UserSection user={user} />
        <div className="mt-3 flex items-center gap-3 rounded-xl bg-primary/5 px-4 py-3">
          <span className="inline-block animate-spin text-xl" style={{ animationDuration: '2s' }}>
            🔍
          </span>
          <span className="text-sm font-semibold text-primary">Checking</span>
          <Dots />
        </div>
      </div>
    );
  }

  if (!user.activity) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4 opacity-80 shadow-sm">
        <UserSection user={user} />
        <div className="flex shrink-0 flex-col items-center">
          <span className="text-2xl">💤</span>
          <span className="text-xs text-muted">No activity</span>
        </div>
      </div>
    );
  }

  const { activity } = user;
  const progressPercentage =
    Math.round(((activity.currentLine - 1) / activity.totalLines) * 100) || activity.progress || 0;

  return (
    <div className="rounded-2xl border-l-4 border-success bg-white p-4 shadow-sm animate-fade-in">
      <div className="mb-3 flex items-start justify-between gap-3">
        <UserSection user={user} />
        <div className="flex shrink-0 flex-col items-center">
          <span className="flex size-10 items-center justify-center rounded-full bg-success/15 text-xl animate-pulse">
            🤖
          </span>
          <span className="mt-1 text-xs font-semibold text-success">Running</span>
        </div>
      </div>

      <div className="mb-3 space-y-1 rounded-xl bg-surface p-3">
        <p className="break-words font-semibold text-ink">{activity.fileName}</p>
        <p className="text-sm text-ink-soft">📱 {activity.deviceName}</p>
        {activity.currentBotName && activity.currentBotName !== activity.fileName && (
          <p className="text-sm text-ink-soft">🤖 Current: {activity.currentBotName}</p>
        )}
        {activity.command && <p className="break-words font-mono text-xs text-muted">⚙️ {activity.command}</p>}
      </div>

      <div className="mb-3">
        <div className="mb-1 flex justify-between text-sm">
          <span className="font-medium text-ink-soft">Progress</span>
          <span className="font-bold text-ink">{progressPercentage}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progressPercentage}%`, backgroundColor: getProgressColor(progressPercentage) }}
          />
        </div>
        <p className="mt-1 text-xs text-muted">
          Line {activity.currentLine} of {activity.totalLines}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-muted">Started:</p>
          <p className="font-medium text-ink">{formatDateTime(activity.startDateTime)}</p>
        </div>
        <div>
          <p className="text-xs text-muted">Duration:</p>
          <p className="font-medium text-ink">{formatDuration(activity.startDateTime)}</p>
        </div>
      </div>
    </div>
  );
};
