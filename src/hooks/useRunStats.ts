import { useCallback, useEffect, useState } from 'react';
import { ActivityItem } from '../types';
import { getExecutionHistory, getToken } from '../Functions';
import { AVAILABLE_USERS, DEFAULT_PASSWORD } from '../constants/users';
import { describeError } from '../lib/errors';
import { isFailure, isSuccess } from '../lib/runStatus';

/**
 * Run statistics per bot, built from Activity > Historical of every account over the last
 * `days` days (Community Edition has no Bot Insight). Bots are grouped by name, since each
 * account's Control Room gives the same bot a different file id.
 */

export interface BotStats {
  name: string;
  runs: number;
  completed: number;
  failed: number;
  /** Aborted, stopped or still running. */
  other: number;
  /** Average duration of completed runs, in ms (null if none completed). */
  avgDurationMs: number | null;
  last: { status: string; startDateTime: string; account: string };
  byAccount: { account: string; runs: number; completed: number; failed: number }[];
}

export interface RunStats {
  days: number;
  totalRuns: number;
  completed: number;
  failed: number;
  bots: BotStats[];
  /** Accounts whose history couldn't be read (the stats exclude them). */
  failedAccounts: { account: string; error: string }[];
  loadedAt: number;
}

const PAGE = 200;
/** Per account; enough for 30 days of a personal Control Room. */
const MAX_RUNS = 2000;
const CACHE_MS = 60_000;

const cache = new Map<number, { at: number; promise: Promise<RunStats> }>();

const fetchAccountRuns = async (email: string, since: string): Promise<ActivityItem[]> => {
  const token = await getToken(email, DEFAULT_PASSWORD);
  const runs: ActivityItem[] = [];
  for (let offset = 0; offset < MAX_RUNS; offset += PAGE) {
    const page = await getExecutionHistory(email, token, offset, PAGE, { since });
    runs.push(...(page.list || []));
    const total = page.page.totalFilter ?? page.page.total ?? 0;
    if (offset + PAGE >= total || (page.list || []).length === 0) break;
  }
  return runs;
};

const compute = async (days: number): Promise<RunStats> => {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const results = await Promise.allSettled(AVAILABLE_USERS.map(u => fetchAccountRuns(u.email, since)));

  const byBot = new Map<string, BotStats & { durations: number[] }>();
  const failedAccounts: RunStats['failedAccounts'] = [];

  results.forEach((result, i) => {
    const account = AVAILABLE_USERS[i].label;
    if (result.status === 'rejected') {
      failedAccounts.push({ account, error: describeError(result.reason) });
      return;
    }
    for (const run of result.value) {
      const name = run.fileName || run.automationName || 'Unknown bot';
      let s = byBot.get(name);
      if (!s) {
        s = {
          name,
          runs: 0,
          completed: 0,
          failed: 0,
          other: 0,
          avgDurationMs: null,
          last: { status: run.status, startDateTime: run.startDateTime, account },
          byAccount: [],
          durations: [],
        };
        byBot.set(name, s);
      }
      s.runs++;
      let acc = s.byAccount.find(a => a.account === account);
      if (!acc) s.byAccount.push((acc = { account, runs: 0, completed: 0, failed: 0 }));
      acc.runs++;
      if (isSuccess(run.status)) {
        s.completed++;
        acc.completed++;
        const ms = Date.parse(run.endDateTime) - Date.parse(run.startDateTime);
        if (Number.isFinite(ms) && ms >= 0) s.durations.push(ms);
      } else if (isFailure(run.status)) {
        s.failed++;
        acc.failed++;
      } else {
        s.other++;
      }
      if (Date.parse(run.startDateTime) > Date.parse(s.last.startDateTime)) {
        s.last = { status: run.status, startDateTime: run.startDateTime, account };
      }
    }
  });

  const bots = [...byBot.values()]
    .map(({ durations, ...s }) => ({
      ...s,
      avgDurationMs: durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : null,
    }))
    .sort((a, b) => b.runs - a.runs || a.name.localeCompare(b.name));

  return {
    days,
    totalRuns: bots.reduce((n, b) => n + b.runs, 0),
    completed: bots.reduce((n, b) => n + b.completed, 0),
    failed: bots.reduce((n, b) => n + b.failed, 0),
    bots,
    failedAccounts,
    loadedAt: Date.now(),
  };
};

/** Shared, cached for a minute: the bot list and the Statistics screen reuse one fetch. */
const loadStats = (days: number, force = false) => {
  const hit = cache.get(days);
  if (!force && hit && Date.now() - hit.at < CACHE_MS) return hit.promise;
  const promise = compute(days);
  cache.set(days, { at: Date.now(), promise });
  promise.catch(() => cache.delete(days));
  return promise;
};

export const useRunStats = (days: number) => {
  const [stats, setStats] = useState<RunStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    (force = false) => {
      let cancelled = false;
      setLoading(true);
      setError(null);
      loadStats(days, force)
        .then(s => !cancelled && setStats(s))
        .catch(err => !cancelled && setError(describeError(err)))
        .finally(() => !cancelled && setLoading(false));
      return () => {
        cancelled = true;
      };
    },
    [days],
  );

  useEffect(() => load(), [load]);

  return { stats, loading, error, refresh: () => load(true) };
};
