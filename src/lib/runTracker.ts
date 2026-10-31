import axios from 'axios';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { getDeployStatus, getToken } from '../Functions';
import { DEFAULT_PASSWORD } from '../constants/users';
import type { RouteName } from '../navigation/drawerContext';

/**
 * Follows launched bots and reports them through local notifications: one silent
 * notification per run, updated with its progress, and an alert when it finishes.
 *
 * Runs are polled from JavaScript, so tracking lives as long as the app process: Android
 * may throttle timers in the background (updates slow to about once a minute) and can kill
 * the app. Tracked runs are saved, so they resume (and their result is reported) the next
 * time the app opens.
 *
 * Failures are handled by kind (see classifyError):
 * - no connection: never counts as a failure; the notification says it's waiting and the
 *   run is checked again as soon as the connection is back;
 * - expired token: the axios interceptor in Functions.ts logs in again transparently;
 * - credentials rejected even after logging in again: stop after a few tries and say so;
 * - Control Room errors (5xx): keep retrying with growing pauses for up to 30 minutes.
 */

interface TrackedRun {
  deploymentId: string;
  userEmail: string;
  botName: string;
  startedAt: number;
  /** Consecutive unexpected errors. */
  errors: number;
  /** Consecutive "credentials rejected" errors. */
  authErrors?: number;
  /** When the Control Room started failing (5xx), for the outage limit and backoff. */
  serverDownSince?: number;
  serverErrors?: number;
  /** Last progress text shown, to avoid re-posting an identical notification. */
  lastBody?: string;
}

type ErrorKind = 'network' | 'auth' | 'server' | 'not-listed' | 'other';

const POLL_MS = 10_000;
const OFFLINE_RETRY_MS = 15_000;
const MAX_ERRORS = 6;
const MAX_AUTH_ERRORS = 3;
const MAX_SERVER_DOWN_MS = 30 * 60_000;
const MAX_BACKOFF_MS = 5 * 60_000;
const MAX_TRACK_MS = 24 * 3600_000;
/** The deployment can take a few seconds to show up in the activity list. */
const NOT_LISTED_GRACE_MS = 5 * 60_000;
const STORAGE_KEY = 'botmanager:tracked-runs';

const PROGRESS_CHANNEL = 'bot-progress';
const FINISHED_CHANNEL = 'bot-finished';

const FINAL: Record<string, { title: string; ok: boolean }> = {
  COMPLETED: { title: 'Bot completed', ok: true },
  RUN_FAILED: { title: 'Bot failed', ok: false },
  DEPLOY_FAILED: { title: "Bot couldn't start", ok: false },
  FAILED: { title: 'Bot failed', ok: false },
  ERROR: { title: 'Bot failed', ok: false },
  RUN_ABORTED: { title: 'Bot aborted', ok: false },
  ABORTED: { title: 'Bot aborted', ok: false },
  STOPPED: { title: 'Bot stopped', ok: false },
  CANCELLED: { title: 'Bot cancelled', ok: false },
};

const runs = new Map<string, TrackedRun>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();
let openHandler: ((route: RouteName) => void) | null = null;
let setupDone = false;

const isAndroid = () => Capacitor.getPlatform() === 'android';

/** Android notification ids are 32-bit ints; derive a stable one per deployment. */
const notificationId = (deploymentId: string, kind: 'progress' | 'done') => {
  let h = kind === 'done' ? 7 : 3;
  for (let i = 0; i < deploymentId.length; i++) h = (Math.imul(h, 31) + deploymentId.charCodeAt(i)) | 0;
  return Math.abs(h) % 2_000_000_000 || 1;
};

const save = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...runs.values()]));
  } catch {
    // Storage unavailable: tracking still works for this session.
  }
};

const formatDuration = (ms: number) => {
  const minutes = Math.round(ms / 60_000);
  if (minutes < 1) return 'less than a minute';
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
};

/**
 * Asks for notification permission and creates the Android channels. Call it from a user
 * action (e.g. turning the option on) so the permission prompt has context.
 * Returns false if notifications are blocked.
 */
export const ensureNotifications = async (): Promise<boolean> => {
  let { display } = await LocalNotifications.checkPermissions();
  if (display === 'prompt' || display === 'prompt-with-rationale') {
    ({ display } = await LocalNotifications.requestPermissions());
  }
  if (display !== 'granted') return false;

  if (!setupDone && isAndroid()) {
    // Progress updates are silent; the final result alerts like a normal notification.
    await LocalNotifications.createChannel({
      id: PROGRESS_CHANNEL,
      name: 'Bot progress',
      description: 'Progress of bots you launched',
      importance: 2,
      vibration: false,
    });
    await LocalNotifications.createChannel({
      id: FINISHED_CHANNEL,
      name: 'Bot finished',
      description: 'When a bot you launched finishes',
      importance: 4,
      vibration: true,
    });
  }
  setupDone = true;
  return true;
};

const notify = (options: {
  id: number;
  title: string;
  body: string;
  channelId: string;
  ongoing: boolean;
  route: RouteName;
}) =>
  LocalNotifications.schedule({
    notifications: [
      {
        id: options.id,
        title: options.title,
        body: options.body,
        largeBody: options.body,
        channelId: isAndroid() ? options.channelId : undefined,
        ongoing: options.ongoing,
        autoCancel: !options.ongoing,
        silent: options.ongoing,
        // Shown immediately; no alarm needed (and no exact-alarm permission prompt).
        isExactNotification: false,
        extra: { route: options.route },
      },
    ],
  }).catch(err => console.warn('Notification failed:', err));

const showProgress = (run: TrackedRun, body: string) =>
  notify({
    id: notificationId(run.deploymentId, 'progress'),
    title: `${run.botName} is running`,
    body,
    channelId: PROGRESS_CHANNEL,
    ongoing: true,
    route: 'InProgress',
  });

/** Shows progress only when the text changes, so updates don't flicker or re-post. */
const showProgressIfChanged = async (run: TrackedRun, body: string) => {
  if (run.lastBody === body) return;
  run.lastBody = body;
  await showProgress(run, body);
};

/** Sorts a polling failure into what the tracker should do about it. */
export const classifyError = (err: unknown): ErrorKind => {
  if (err instanceof Error && err.message === 'Deployment information not found') return 'not-listed';
  if (axios.isAxiosError(err)) {
    // No response at all: offline, DNS failure, timeout.
    if (!err.response) return 'network';
    const status = err.response.status;
    // The retry interceptor already logged in again; reaching here means the login itself
    // (or the request with a fresh token) was rejected.
    if (status === 401 || status === 403) return 'auth';
    if (status >= 500) return 'server';
    return 'other';
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'network';
  return 'other';
};

const finish = async (run: TrackedRun, title: string, body: string) => {
  clearTimeout(timers.get(run.deploymentId));
  timers.delete(run.deploymentId);
  runs.delete(run.deploymentId);
  save();
  await LocalNotifications.cancel({ notifications: [{ id: notificationId(run.deploymentId, 'progress') }] }).catch(
    () => {},
  );
  await notify({
    id: notificationId(run.deploymentId, 'done'),
    title,
    body,
    channelId: FINISHED_CHANNEL,
    ongoing: false,
    route: 'Historical',
  });
};

const schedule = (deploymentId: string, delay: number) => {
  clearTimeout(timers.get(deploymentId));
  timers.set(deploymentId, setTimeout(() => poll(deploymentId), delay));
};

const poll = async (deploymentId: string) => {
  const run = runs.get(deploymentId);
  if (!run) return;
  let nextDelay = POLL_MS;

  try {
    const token = await getToken(run.userEmail, DEFAULT_PASSWORD);
    const status = await getDeployStatus(run.deploymentId, token, run.userEmail);
    run.errors = 0;
    run.authErrors = 0;
    run.serverErrors = 0;
    run.serverDownSince = undefined;

    const final = FINAL[status.status?.toUpperCase()];
    if (final) {
      // Use the run's own start/end from the Control Room: the result may be reported late
      // (e.g. when the app reopens or the connection comes back), and tracking starts a few
      // seconds after the launch.
      const times = status as { startDateTime?: string; endDateTime?: string };
      const start = Date.parse(times.startDateTime ?? '');
      const end = Date.parse(times.endDateTime ?? '');
      const elapsed = formatDuration(
        (Number.isNaN(end) ? Date.now() : end) - (Number.isNaN(start) ? run.startedAt : start),
      );
      const detail = final.ok
        ? `${run.botName} finished in ${elapsed}.`
        : `${run.botName} stopped at line ${status.currentLine} of ${status.totalLines} after ${elapsed}.`;
      await finish(run, `${final.title}: ${run.botName}`, detail);
      return;
    }

    const percent = status.totalLines
      ? Math.max(0, Math.min(100, Math.round(((status.currentLine - 1) / status.totalLines) * 100)))
      : 0;
    const step = status.currentBotName && status.currentBotName !== run.botName ? ` in ${status.currentBotName}` : '';
    await showProgressIfChanged(run, `${percent}%, line ${status.currentLine} of ${status.totalLines}${step}`);
  } catch (err) {
    const kind = classifyError(err);

    if (kind === 'network') {
      // Not a failure: keep the run and check again later; the 'online' listener also
      // triggers an immediate check when the connection is back.
      await showProgressIfChanged(run, 'Waiting for a connection to check its progress…');
      nextDelay = OFFLINE_RETRY_MS;
    } else if (kind === 'auth') {
      run.authErrors = (run.authErrors ?? 0) + 1;
      if (run.authErrors >= MAX_AUTH_ERRORS) {
        await finish(
          run,
          `Can't check ${run.botName}`,
          `The Control Room rejected the credentials of ${run.userEmail}. The bot may still be running: check the account, then look in Historical.`,
        );
        return;
      }
    } else if (kind === 'server') {
      run.serverDownSince ??= Date.now();
      run.serverErrors = (run.serverErrors ?? 0) + 1;
      if (Date.now() - run.serverDownSince > MAX_SERVER_DOWN_MS) {
        await finish(
          run,
          `Can't check ${run.botName}`,
          'The Control Room has not responded for 30 minutes. The bot may still be running: check it in Historical.',
        );
        return;
      }
      await showProgressIfChanged(run, 'The Control Room is not responding, retrying…');
      // 10 s, 20 s, 40 s… up to 5 min between tries.
      nextDelay = Math.min(POLL_MS * 2 ** (run.serverErrors - 1), MAX_BACKOFF_MS);
    } else if (kind === 'not-listed' && Date.now() - run.startedAt < NOT_LISTED_GRACE_MS) {
      // The deployment just hasn't appeared in the activity list yet.
    } else {
      run.errors += 1;
      if (run.errors >= MAX_ERRORS) {
        await finish(
          run,
          `Lost track of ${run.botName}`,
          'The Control Room keeps returning unexpected answers. Check the run in Historical.',
        );
        return;
      }
    }
  }

  if (Date.now() - run.startedAt > MAX_TRACK_MS) {
    await finish(run, `Stopped following ${run.botName}`, 'It ran for more than 24 hours. Check it in In progress.');
    return;
  }
  save();
  schedule(deploymentId, nextDelay);
};

/** Checks every tracked run right away (e.g. when the connection comes back). */
const pollAllNow = () => {
  for (const id of runs.keys()) schedule(id, 500);
};

/** Starts following a deployment and shows its progress notification. */
export const trackRun = async (deploymentId: string, userEmail: string, botName: string) => {
  if (runs.has(deploymentId)) return;
  const run: TrackedRun = { deploymentId, userEmail, botName, startedAt: Date.now(), errors: 0 };
  runs.set(deploymentId, run);
  save();
  await showProgressIfChanged(run, 'Starting…');
  schedule(deploymentId, 3000);
};

/**
 * Call once at startup: resumes runs saved by a previous session and routes taps on our
 * notifications to the right screen.
 */
export const initRunTracker = async (onOpen: (route: RouteName) => void) => {
  openHandler = onOpen;
  // Back online: report what happened while offline without waiting for the next retry.
  window.addEventListener('online', pollAllNow);
  LocalNotifications.addListener('localNotificationActionPerformed', action => {
    const route = action.notification.extra?.route as RouteName | undefined;
    if (route) openHandler?.(route);
  }).catch(() => {});

  let saved: TrackedRun[] = [];
  try {
    saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    saved = [];
  }
  if (saved.length === 0) return;

  const { display } = await LocalNotifications.checkPermissions().catch(() => ({ display: 'denied' as const }));
  if (display !== 'granted') return;
  await ensureNotifications();
  for (const run of saved) {
    if (runs.has(run.deploymentId)) continue;
    runs.set(run.deploymentId, {
      ...run,
      errors: 0,
      authErrors: 0,
      serverErrors: 0,
      serverDownSince: undefined,
      lastBody: undefined,
    });
    schedule(run.deploymentId, 1000);
  }
};
