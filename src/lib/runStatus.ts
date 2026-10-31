import { CircleCheck, CircleSlash, CircleX, Loader } from 'lucide-react';
import type { StatusTone } from '../components/ui';

// Run statuses as the Control Room labels them, shared by Historical, Statistics and the
// last-run line in the bot list.

// Labels as the Control Room shows them in Activity > Historical.
export const OK = { tone: 'ok' as StatusTone, Icon: CircleCheck, color: '#1a7f37' };
const FAIL = { tone: 'fail' as StatusTone, Icon: CircleX, color: '#cf222e' };
const RUN = { tone: 'run' as StatusTone, Icon: Loader, color: '#0969da' };
const STOP = { tone: 'neutral' as StatusTone, Icon: CircleSlash, color: '#59636e' };

export const STATUS: Record<string, { label: string } & typeof OK> = {
  COMPLETED: { label: 'Completed', ...OK },
  FAILED: { label: 'Run failed', ...FAIL },
  ERROR: { label: 'Run failed', ...FAIL },
  RUN_FAILED: { label: 'Run failed', ...FAIL },
  DEPLOY_FAILED: { label: 'Deploy failed', ...FAIL },
  UPDATE: { label: 'In progress', ...RUN },
  RUNNING: { label: 'In progress', ...RUN },
  STOPPED: { label: 'Stopped', ...STOP },
  CANCELLED: { label: 'Cancelled', ...STOP },
  ABORTED: { label: 'Run aborted', ...STOP },
  RUN_ABORTED: { label: 'Run aborted', ...STOP },
};

export const statusOf = (status: string) => STATUS[status.toUpperCase()] ?? { label: status, ...STOP };

/** "Today, 08:52" / "Yesterday, 19:10" / "Oct 28, 14:03" for scanning a list. */
export const formatRelative = (dateString: string): string => {
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

/** Completed runs count as successes; failed and could-not-start runs as failures. */
export const isSuccess = (status: string) => status.toUpperCase() === 'COMPLETED';
export const isFailure = (status: string) => statusOf(status).tone === 'fail';

/** "8m 43s" style duration. */
export const formatDurationShort = (ms: number): string => {
  if (!Number.isFinite(ms) || ms < 0) return 'N/A';
  const s = Math.round(ms / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
};
