import React, { useId, useRef, useState } from 'react';
import { ChevronDown, TriangleAlert } from 'lucide-react';
import { ScreenWrapper } from '../components';
import { ScreenTitle } from '../components/ScreenWrapper';
import {
  ErrorState,
  Panel,
  RefreshButton,
  SkeletonRows,
  StatusBadge,
  useListEntrance,
} from '../components/ui';
import { BotStats, useRunStats } from '../hooks/useRunStats';
import { formatDurationShort, formatRelative, statusOf } from '../lib/runStatus';

const PERIODS = [7, 30, 90] as const;

const percent = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);

/** Stacked bar: completed (green), failed (red), the rest (grey). */
const OutcomeBar: React.FC<{ s: BotStats }> = ({ s }) => (
  <div aria-hidden className="flex h-1.5 overflow-hidden rounded-full bg-line">
    <span className="bg-ok" style={{ width: `${percent(s.completed, s.runs)}%` }} />
    <span className="bg-fail" style={{ width: `${percent(s.failed, s.runs)}%` }} />
    <span className="bg-muted/40" style={{ width: `${percent(s.other, s.runs)}%` }} />
  </div>
);

const BotStatsRow: React.FC<{ s: BotStats }> = ({ s }) => {
  const [open, setOpen] = useState(false);
  const detailsId = useId();
  const last = statusOf(s.last.status);
  const rate = percent(s.completed, s.runs);

  return (
    <div data-row>
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls={detailsId}
        className="w-full px-4 py-3.5 text-left active:bg-page"
      >
        <span className="flex items-start gap-3">
          <span className="min-w-0 flex-1">
            <span className="block break-words font-semibold text-ink">{s.name}</span>
            <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
              <StatusBadge tone={last.tone} icon={<last.Icon size={13} />}>
                {last.label}
              </StatusBadge>
              {formatRelative(s.last.startDateTime)} on {s.last.account}
            </span>
          </span>
          <span className="shrink-0 text-right">
            <span className="block text-lg font-semibold leading-tight text-ink">{rate}%</span>
            <span className="block text-xs text-muted">
              of {s.runs} run{s.runs === 1 ? '' : 's'}
            </span>
          </span>
          <ChevronDown
            size={18}
            className={`mt-1 shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </span>
        <span className="mt-2.5 block">
          <OutcomeBar s={s} />
        </span>
      </button>

      {open && (
        <div id={detailsId} className="px-4 pb-4">
          <dl className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <dt className="text-muted">Completed</dt>
              <dd className="font-semibold text-ok">{s.completed}</dd>
            </div>
            <div>
              <dt className="text-muted">Failed</dt>
              <dd className="font-semibold text-fail">{s.failed}</dd>
            </div>
            <div>
              <dt className="text-muted">Avg. duration</dt>
              <dd className="font-semibold text-ink">
                {s.avgDurationMs === null ? 'N/A' : formatDurationShort(s.avgDurationMs)}
              </dd>
            </div>
          </dl>
          <table className="mt-3 w-full text-sm">
            <caption className="sr-only">Runs of {s.name} by account</caption>
            <thead>
              <tr className="text-left text-muted">
                <th className="py-1 font-medium">Account</th>
                <th className="py-1 text-right font-medium">Runs</th>
                <th className="py-1 text-right font-medium">Completed</th>
                <th className="py-1 text-right font-medium">Failed</th>
              </tr>
            </thead>
            <tbody>
              {s.byAccount.map(a => (
                <tr key={a.account} className="border-t border-line">
                  <td className="py-1.5 text-ink">{a.account}</td>
                  <td className="py-1.5 text-right text-ink">{a.runs}</td>
                  <td className="py-1.5 text-right text-ink">{a.completed}</td>
                  <td className="py-1.5 text-right text-ink">{a.failed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export const StatisticsScreen = () => {
  const [days, setDays] = useState<(typeof PERIODS)[number]>(30);
  const { stats, loading, error, refresh } = useRunStats(days);
  const listRef = useRef<HTMLDivElement>(null);
  useListEntrance(listRef, !!stats && !loading, days);

  let body: React.ReactNode;
  if (error && !stats) {
    body = <ErrorState title="Couldn't load the statistics" error={error} onRetry={refresh} />;
  } else if (!stats || (loading && stats.days !== days)) {
    body = <SkeletonRows label="Loading statistics" rows={5} />;
  } else if (stats.totalRuns === 0) {
    body = <p className="px-4 py-10 text-muted">No runs in the last {days} days.</p>;
  } else {
    const rate = percent(stats.completed, stats.totalRuns);
    body = (
      <div ref={listRef} className={`mx-3 mb-4 space-y-3 transition-opacity ${loading ? 'opacity-50' : ''}`}>
        <dl className="grid grid-cols-3 divide-x divide-line rounded-lg border border-line bg-surface">
          {[
            { label: 'Runs', value: String(stats.totalRuns), cls: 'text-ink' },
            { label: 'Success rate', value: `${rate}%`, cls: rate >= 80 ? 'text-ok' : rate >= 50 ? 'text-warn' : 'text-fail' },
            { label: 'Failed', value: String(stats.failed), cls: stats.failed ? 'text-fail' : 'text-ink' },
          ].map(item => (
            <div key={item.label} className="flex min-w-0 flex-col gap-1 px-3 py-2.5 land:flex-row-reverse land:items-baseline land:justify-end land:gap-2 land:py-1.5">
              <dt className="text-[0.8125rem] text-muted">{item.label}</dt>
              <dd className={`text-xl font-semibold leading-none land:text-base ${item.cls}`}>{item.value}</dd>
            </div>
          ))}
        </dl>

        {stats.failedAccounts.length > 0 && (
          <p role="alert" className="flex gap-2 rounded-lg border-l-4 border-warn bg-warn/10 px-3 py-2 text-sm text-ink">
            <TriangleAlert size={18} className="mt-0.5 shrink-0 text-warn" />
            <span>
              Not included: {stats.failedAccounts.map(a => a.account).join(', ')}.{' '}
              {stats.failedAccounts[0].error}
            </span>
          </p>
        )}

        <Panel header="By bot, most runs first. Tap one for details.">
          {stats.bots.map(s => (
            <BotStatsRow key={s.name} s={s} />
          ))}
        </Panel>
      </div>
    );
  }

  return (
    <ScreenWrapper>
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl safe-bottom">
          <ScreenTitle
            title="Statistics"
            subtitle={`All accounts, last ${days} days`}
            action={<RefreshButton onClick={refresh} busy={loading} busyLabel="Loading" />}
          />
          <div role="radiogroup" aria-label="Period" className="flex gap-2 px-4 pb-3">
            {PERIODS.map(p => (
              <button
                key={p}
                role="radio"
                aria-checked={p === days}
                onClick={() => setDays(p)}
                className={`min-h-11 rounded-full border px-4 text-sm font-medium transition-colors ${
                  p === days
                    ? 'border-brand-strong bg-brand-tint text-brand-strong'
                    : 'border-line bg-surface text-ink-soft active:bg-page'
                }`}
              >
                {p} days
              </button>
            ))}
          </div>
          {body}
        </div>
      </div>
    </ScreenWrapper>
  );
};
