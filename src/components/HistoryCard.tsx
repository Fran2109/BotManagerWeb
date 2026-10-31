import React, { useId, useState } from 'react';
import { ChevronDown, CircleCheck, CircleSlash, CircleX, Loader } from 'lucide-react';
import { ActivityItem } from '../types';
import { ProgressBar, StatusBadge, StatusTone } from './ui';
import { gsap, motionDuration, useGSAP } from '../lib/motion';

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

// Labels as the Control Room shows them in Activity > Historical.
const OK = { tone: 'ok' as StatusTone, Icon: CircleCheck, color: '#1a7f37' };
const FAIL = { tone: 'fail' as StatusTone, Icon: CircleX, color: '#cf222e' };
const RUN = { tone: 'run' as StatusTone, Icon: Loader, color: '#0969da' };
const STOP = { tone: 'neutral' as StatusTone, Icon: CircleSlash, color: '#59636e' };

const STATUS: Record<string, { label: string } & typeof OK> = {
  COMPLETED: { label: 'Completed', ...OK },
  FAILED: { label: 'Run failed', ...FAIL },
  ERROR: { label: 'Run failed', ...FAIL },
  RUN_FAILED: { label: 'Run failed', ...FAIL },
  UPDATE: { label: 'In progress', ...RUN },
  RUNNING: { label: 'In progress', ...RUN },
  STOPPED: { label: 'Stopped', ...STOP },
  CANCELLED: { label: 'Cancelled', ...STOP },
  ABORTED: { label: 'Run aborted', ...STOP },
  RUN_ABORTED: { label: 'Run aborted', ...STOP },
};

const statusOf = (status: string) => STATUS[status.toUpperCase()] ?? { label: status, ...STOP };

/** "Today, 08:52" / "Yesterday, 19:10" / "Oct 28, 14:03" for scanning a list. */
const formatRelative = (dateString: string): string => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  const tz = 'America/Argentina/Buenos_Aires';
  const dayKey = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: tz });
  const time = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: tz });
  const now = new Date();
  const yesterday = new Date(now.getTime() - 86400000);
  if (dayKey(date) === dayKey(now)) return `Today, ${time}`;
  if (dayKey(date) === dayKey(yesterday)) return `Yesterday, ${time}`;
  return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: tz })}, ${time}`;
};

/** One execution in the history log; details expand on tap. */
export const HistoryCard: React.FC<HistoryCardProps> = ({ activity }) => {
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();
  const status = statusOf(activity.status);
  const isCompleted = activity.status.toUpperCase() === 'COMPLETED';
  const progressPercentage = isCompleted
    ? 100
    : Math.round((activity.currentLine / activity.totalLines) * 100) || activity.progress || 0;

  const detailsRef = React.useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      if (!expanded || !detailsRef.current) return;
      gsap.from(detailsRef.current, {
        height: 0,
        opacity: 0,
        duration: motionDuration(0.28),
        ease: 'power2.out',
        clearProps: 'height',
      });
    },
    { dependencies: [expanded] },
  );

  return (
    <div data-row>
      <button
        onClick={() => setExpanded(e => !e)}
        aria-expanded={expanded}
        aria-controls={detailsId}
        className="flex w-full items-start gap-3 px-4 py-3.5 text-left active:bg-page"
      >
        <span className="min-w-0 flex-1">
          <span className="block break-words font-semibold text-ink">{activity.fileName}</span>
          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <StatusBadge tone={status.tone} icon={<status.Icon size={13} />}>
              {status.label}
            </StatusBadge>
            <span className="text-sm text-muted">{formatRelative(activity.startDateTime)}</span>
          </span>
        </span>
        <ChevronDown
          size={20}
          className={`mt-0.5 shrink-0 text-muted transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {expanded && (
        <div ref={detailsRef} id={detailsId} className="overflow-hidden">
          <div className="space-y-3 px-4 pb-4 pl-[38px]">
            <div>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-muted">
                  Line {activity.currentLine} of {activity.totalLines}
                </span>
                <span className="font-semibold text-ink">{progressPercentage}%</span>
              </div>
              <ProgressBar value={progressPercentage} color={status.color} label={`${activity.fileName} progress`} />
            </div>

            <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
              <div>
                <dt className="text-muted">Device</dt>
                <dd className="break-words font-medium text-ink">{activity.deviceName}</dd>
              </div>
              <div>
                <dt className="text-muted">Duration</dt>
                <dd className="font-medium text-ink">
                  {formatDuration(activity.startDateTime, activity.endDateTime)}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Started</dt>
                <dd className="font-medium text-ink">{formatDateTime(activity.startDateTime)}</dd>
              </div>
              <div>
                <dt className="text-muted">Ended</dt>
                <dd className="font-medium text-ink">
                  {activity.endDateTime ? formatDateTime(activity.endDateTime) : 'N/A'}
                </dd>
              </div>
              {activity.currentBotName && activity.currentBotName !== activity.fileName && (
                <div>
                  <dt className="text-muted">Last bot</dt>
                  <dd className="break-words font-medium text-ink">{activity.currentBotName}</dd>
                </div>
              )}
              {activity.command && (
                <div className="col-span-2">
                  <dt className="text-muted">Last step</dt>
                  <dd className="break-words font-medium text-ink">{activity.command}</dd>
                </div>
              )}
              <div className="col-span-2">
                <dt className="text-muted">Deployment ID</dt>
                <dd className="select-all break-all font-medium text-ink">{activity.deploymentId}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-muted">Automation</dt>
                <dd className="break-all text-ink-soft">{activity.automationName}</dd>
              </div>
            </dl>

            {activity.message && (
              <p className="rounded-lg border-l-4 border-warn bg-warn/10 px-3 py-2 text-sm text-ink">
                {activity.message}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
