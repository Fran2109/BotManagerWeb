import React from 'react';
import { ActivityItem } from '../types';

interface HistoryCardProps {
  activity: ActivityItem;
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
      second: '2-digit',
      timeZone: 'America/Argentina/Buenos_Aires',
    });
  } catch {
    return dateString;
  }
};

const formatDuration = (startTime: string, endTime: string): string => {
  if (!endTime) return 'N/A';

  try {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end.getTime() - start.getTime();

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  } catch {
    return 'N/A';
  }
};

const getStatusColor = (status: string): string => {
  switch (status.toUpperCase()) {
    case 'COMPLETED':
      return '#28a745';
    case 'FAILED':
    case 'ERROR':
    case 'RUN_FAILED':
      return '#dc3545';
    case 'UPDATE':
    case 'RUNNING':
      return '#007bff';
    default:
      return '#6c757d';
  }
};

const getStatusIcon = (status: string): string => {
  switch (status.toUpperCase()) {
    case 'COMPLETED':
      return '✅';
    case 'FAILED':
    case 'ERROR':
    case 'RUN_FAILED':
      return '❌';
    case 'UPDATE':
    case 'RUNNING':
      return '⏳';
    case 'STOPPED':
    case 'CANCELLED':
      return '⏹️';
    case 'ABORTED':
    case 'RUN_ABORTED':
      return '🚫';
    default:
      return '❓';
  }
};

const DetailRow: React.FC<{ label: string; children: React.ReactNode; mono?: boolean }> = ({
  label,
  children,
  mono,
}) => (
  <div className="flex gap-2 text-sm">
    <span className="w-24 shrink-0 text-muted">{label}</span>
    <span className={`min-w-0 break-words text-ink ${mono ? 'font-mono text-xs' : ''}`}>{children}</span>
  </div>
);

const TimeItem: React.FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono }) => (
  <div className="min-w-0">
    <p className="text-xs text-muted">{label}</p>
    <p className={`truncate font-medium text-ink ${mono ? 'font-mono text-xs' : 'text-sm'}`} title={value}>
      {value}
    </p>
  </div>
);

export const HistoryCard: React.FC<HistoryCardProps> = ({ activity }) => {
  const statusColor = getStatusColor(activity.status);
  const statusIcon = getStatusIcon(activity.status);
  const isCompleted = activity.status.toUpperCase() === 'COMPLETED';
  const progressPercentage = isCompleted
    ? 100
    : Math.round((activity.currentLine / activity.totalLines) * 100) || activity.progress || 0;

  return (
    <div className="rounded-2xl border-l-4 bg-white p-4 shadow-sm" style={{ borderLeftColor: statusColor }}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words font-bold text-ink">{activity.fileName}</p>
          <p className="break-words text-sm text-muted">{activity.automationName}</p>
        </div>
        <div className="flex shrink-0 flex-col items-center">
          <span
            className="flex size-9 items-center justify-center rounded-full text-base"
            style={{ backgroundColor: `${statusColor}22` }}
          >
            {statusIcon}
          </span>
          <span className="mt-1 text-[11px] font-bold" style={{ color: statusColor }}>
            {activity.status}
          </span>
        </div>
      </div>

      <div className="mb-3 space-y-1.5 rounded-xl bg-surface p-3">
        <DetailRow label="Device:">📱 {activity.deviceName}</DetailRow>
        {activity.currentBotName && activity.currentBotName !== activity.fileName && (
          <DetailRow label="Current Bot:">🤖 {activity.currentBotName}</DetailRow>
        )}
        {activity.command && (
          <DetailRow label="Command:" mono>
            ⚙️ {activity.command}
          </DetailRow>
        )}
      </div>

      <div className="mb-3">
        <div className="mb-1 flex justify-between text-sm">
          <span className="font-medium text-ink-soft">Progress</span>
          <span className="font-bold text-ink">{progressPercentage}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full"
            style={{ width: `${progressPercentage}%`, backgroundColor: statusColor }}
          />
        </div>
        <p className="mt-1 text-xs text-muted">
          Line {activity.currentLine} of {activity.totalLines}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <TimeItem label="Started:" value={formatDateTime(activity.startDateTime)} />
        <TimeItem label="Ended:" value={activity.endDateTime ? formatDateTime(activity.endDateTime) : 'N/A'} />
        <TimeItem label="Duration:" value={formatDuration(activity.startDateTime, activity.endDateTime)} />
        <TimeItem label="Deployment ID:" value={activity.deploymentId} mono />
      </div>

      {activity.message && (
        <div className="mt-3 rounded-xl bg-warning/10 p-3">
          <p className="text-xs font-semibold text-ink-soft">Message:</p>
          <p className="break-words text-sm text-ink">{activity.message}</p>
        </div>
      )}
    </div>
  );
};
