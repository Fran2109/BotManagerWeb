import React from 'react';
import { HistoryFilter } from '../Functions';

// Filters for Activity > Historical, applied by the Control Room (see getExecutionHistory).
export const STATUS_OPTIONS = [
  { key: 'all', label: 'All', statuses: undefined },
  { key: 'completed', label: 'Completed', statuses: ['COMPLETED'] },
  { key: 'failed', label: 'Failed', statuses: ['RUN_FAILED', 'DEPLOY_FAILED'] },
  { key: 'aborted', label: 'Run aborted', statuses: ['RUN_ABORTED'] },
] as const;

export const PERIOD_OPTIONS = [
  { key: 'any', label: 'Any time', hours: undefined },
  { key: '24h', label: 'Last 24 hours', hours: 24 },
  { key: '7d', label: 'Last 7 days', hours: 24 * 7 },
  { key: '30d', label: 'Last 30 days', hours: 24 * 30 },
] as const;

export type StatusKey = (typeof STATUS_OPTIONS)[number]['key'];
export type PeriodKey = (typeof PERIOD_OPTIONS)[number]['key'];

/** Turns the chip selection into the API filter; the period counts back from now. */
export const toHistoryFilter = (status: StatusKey, period: PeriodKey): HistoryFilter => {
  const statuses = STATUS_OPTIONS.find(o => o.key === status)?.statuses;
  const hours = PERIOD_OPTIONS.find(o => o.key === period)?.hours;
  return {
    statuses: statuses ? [...statuses] : undefined,
    since: hours ? new Date(Date.now() - hours * 3600_000).toISOString() : undefined,
  };
};

interface ChipGroupProps<K extends string> {
  label: string;
  options: readonly { key: K; label: string }[];
  value: K;
  onChange: (key: K) => void;
  disabled?: boolean;
}

const ChipGroup = <K extends string>({ label, options, value, onChange, disabled }: ChipGroupProps<K>) => (
  <div role="radiogroup" aria-label={label} className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
    {options.map(option => {
      const selected = option.key === value;
      return (
        <button
          key={option.key}
          role="radio"
          aria-checked={selected}
          disabled={disabled}
          onClick={() => onChange(option.key)}
          className={`min-h-9 shrink-0 rounded-full border px-3.5 text-sm font-medium transition-colors disabled:opacity-60 ${
            selected
              ? 'border-brand-strong bg-brand-tint text-brand-strong'
              : 'border-line bg-surface text-ink-soft active:bg-page'
          }`}
        >
          {option.label}
        </button>
      );
    })}
  </div>
);

interface HistoryFiltersProps {
  status: StatusKey;
  period: PeriodKey;
  onChange: (status: StatusKey, period: PeriodKey) => void;
  disabled?: boolean;
}

export const HistoryFilters: React.FC<HistoryFiltersProps> = ({ status, period, onChange, disabled }) => (
  <div className="space-y-2 px-4 pb-3">
    <ChipGroup label="Status" options={STATUS_OPTIONS} value={status} onChange={s => onChange(s, period)} disabled={disabled} />
    <ChipGroup label="Started" options={PERIOD_OPTIONS} value={period} onChange={p => onChange(status, p)} disabled={disabled} />
  </div>
);
