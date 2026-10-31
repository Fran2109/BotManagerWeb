import React, { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { ActivityItem } from '../types';
import { Lamp, LampState, ProgressBar } from './ui';
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

const STATUS: Record<string, { label: string; lamp: LampState; color: string }> = {
  COMPLETED: { label: 'Completed', lamp: 'on', color: '#1f9d55' },
  FAILED: { label: 'Failed', lamp: 'off', color: '#d2382b' },
  ERROR: { label: 'Error', lamp: 'off', color: '#d2382b' },
  RUN_FAILED: { label: 'Failed', lamp: 'off', color: '#d2382b' },
  UPDATE: { label: 'Running', lamp: 'wait', color: '#e08a00' },
  RUNNING: { label: 'Running', lamp: 'wait', color: '#e08a00' },
  STOPPED: { label: 'Stopped', lamp: 'idle', color: '#626d73' },
  CANCELLED: { label: 'Cancelled', lamp: 'idle', color: '#626d73' },
  ABORTED: { label: 'Aborted', lamp: 'idle', color: '#626d73' },
  RUN_ABORTED: { label: 'Aborted', lamp: 'idle', color: '#626d73' },
};

const statusOf = (status: string) =>
  STATUS[status.toUpperCase()] ?? { label: status, lamp: 'idle' as LampState, color: '#626d73' };

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
        className="flex w-full items-start gap-3 px-4 py-3.5 text-left active:bg-enamel"
      >
        <Lamp state={status.lamp} className="mt-1.5" />
        <span className="min-w-0 flex-1">
          <span className="block break-words font-semibold text-ink">{activity.fileName}</span>
          <span className="block text-sm text-steel">
            {status.label}, {formatDateTime(activity.startDateTime)}
          </span>
        </span>
        <ChevronDown
          size={20}
          className={`mt-0.5 shrink-0 text-steel transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {expanded && (
        <div ref={detailsRef} id={detailsId} className="overflow-hidden">
          <div className="space-y-3 px-4 pb-4 pl-[38px]">
            <div>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-steel">
                  Line {activity.currentLine} of {activity.totalLines}
                </span>
                <span className="font-semibold text-ink">{progressPercentage}%</span>
              </div>
              <ProgressBar value={progressPercentage} color={status.color} label={`${activity.fileName} progress`} />
            </div>

            <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
              <div>
                <dt className="text-steel">Device</dt>
                <dd className="break-words font-medium text-ink">{activity.deviceName}</dd>
              </div>
              <div>
                <dt className="text-steel">Duration</dt>
                <dd className="font-medium text-ink">
                  {formatDuration(activity.startDateTime, activity.endDateTime)}
                </dd>
              </div>
              <div>
                <dt className="text-steel">Ended</dt>
                <dd className="font-medium text-ink">
                  {activity.endDateTime ? formatDateTime(activity.endDateTime) : 'N/A'}
                </dd>
              </div>
              {activity.currentBotName && activity.currentBotName !== activity.fileName && (
                <div>
                  <dt className="text-steel">Last bot</dt>
                  <dd className="break-words font-medium text-ink">{activity.currentBotName}</dd>
                </div>
              )}
              {activity.command && (
                <div className="col-span-2">
                  <dt className="text-steel">Last step</dt>
                  <dd className="break-words font-medium text-ink">{activity.command}</dd>
                </div>
              )}
              <div className="col-span-2">
                <dt className="text-steel">Deployment ID</dt>
                <dd className="select-all break-all font-medium text-ink">{activity.deploymentId}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-steel">Automation</dt>
                <dd className="break-all text-ink-soft">{activity.automationName}</dd>
              </div>
            </dl>

            {activity.message && (
              <p className="rounded-lg border-l-4 border-amber bg-amber/10 px-3 py-2 text-sm text-ink">
                {activity.message}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
