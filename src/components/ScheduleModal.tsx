import React, { useEffect, useId, useState } from 'react';
import { AlarmClock, CalendarClock } from 'lucide-react';
import { Bot } from '../types';
import { AVAILABLE_USERS } from '../constants/users';
import { ScheduleKind, WEEK_DAYS, describeRecurrence, exactAlarmsAllowed, openExactAlarmSettings } from '../lib/schedules';
import { ensureNotifications } from '../lib/runTracker';
import { Modal, Sheet, Switch, buttonStyles } from './ui';

export interface ScheduleFormValues {
  userEmail: string;
  kind: ScheduleKind;
  time: string;
  date?: string;
  days?: number[];
  hideBotAgentUi: boolean;
  notify: boolean;
}

interface ScheduleModalProps {
  visible: boolean;
  bot: Bot | null;
  saving: boolean;
  error: string | null;
  onSave: (values: ScheduleFormValues) => void;
  onClose: () => void;
}

const pad = (n: number) => String(n).padStart(2, '0');
const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const nextHour = () => `${pad((new Date().getHours() + 1) % 24)}:00`;

const KINDS: { kind: ScheduleKind; label: string }[] = [
  { kind: 'once', label: 'Once' },
  { kind: 'daily', label: 'Every day' },
  { kind: 'weekly', label: 'Some days' },
];

const chip = (selected: boolean) =>
  `min-h-11 rounded-full border px-4 text-sm font-medium transition-colors ${
    selected ? 'border-brand-strong bg-brand-tint text-brand-strong' : 'border-line bg-surface text-ink-soft active:bg-page'
  }`;

const inputClass =
  'min-h-11 w-full rounded-md border border-line bg-surface px-3 text-[0.9375rem] text-ink outline-none focus:border-brand-strong focus:ring-2 focus:ring-brand/30';

/** Form to schedule a bot from the phone (see lib/schedules.ts). */
export const ScheduleModal: React.FC<ScheduleModalProps> = ({ visible, bot, saving, error, onSave, onClose }) => {
  const ids = useId();
  const [userEmail, setUserEmail] = useState(AVAILABLE_USERS[0]?.email ?? '');
  const [kind, setKind] = useState<ScheduleKind>('daily');
  const [date, setDate] = useState(todayIso);
  const [time, setTime] = useState(nextHour);
  const [days, setDays] = useState<number[]>([2, 3, 4, 5, 6]);
  const [hideBotAgentUi, setHideBotAgentUi] = useState(true);
  const [notify, setNotify] = useState(false);
  const [notifyBlocked, setNotifyBlocked] = useState(false);
  const [exact, setExact] = useState(true);
  const [validation, setValidation] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setDate(todayIso());
    setTime(nextHour());
    setValidation(null);
    setNotifyBlocked(false);
    exactAlarmsAllowed().then(setExact).catch(() => setExact(true));
  }, [visible]);

  const changeNotify = async (on: boolean) => {
    const allowed = on ? await ensureNotifications().catch(() => false) : true;
    setNotifyBlocked(on && !allowed);
    setNotify(on && allowed);
  };

  const save = () => {
    if (kind === 'weekly' && days.length === 0) return setValidation('Pick at least one day.');
    if (kind === 'once' && new Date(`${date}T${time}:00`).getTime() <= Date.now()) {
      return setValidation('Pick a date and time in the future.');
    }
    setValidation(null);
    onSave({
      userEmail,
      kind,
      time,
      date: kind === 'once' ? date : undefined,
      days: kind === 'weekly' ? [...days].sort() : undefined,
      hideBotAgentUi,
      notify,
    });
  };

  const message = validation ?? error;

  return (
    <Modal visible={visible && !!bot} onRequestClose={() => !saving && onClose()} labelledBy={`${ids}-title`}>
      <Sheet>
        <div className="px-5 pb-5 pt-2">
          <p className="flex items-center gap-1.5 text-sm font-medium text-brand-strong">
            <CalendarClock size={16} /> Schedule
          </p>
          <h2 id={`${ids}-title`} className="mt-0.5 break-words text-xl font-semibold leading-tight text-ink">
            {bot?.name}
          </h2>
          <p className="mt-1 text-sm text-muted">
            The phone launches it at that time, so it needs to be on and online.
          </p>

          <fieldset className="mt-4">
            <legend className="mb-1.5 text-sm font-semibold text-ink">Account</legend>
            <div className="divide-y divide-line overflow-hidden rounded-lg border border-line">
              {AVAILABLE_USERS.map(u => (
                <label key={u.email} className="flex min-h-11 cursor-pointer items-center gap-3 bg-surface px-4 py-2">
                  <input
                    type="radio"
                    name={`${ids}-account`}
                    checked={userEmail === u.email}
                    onChange={() => setUserEmail(u.email)}
                    className="size-4 accent-[var(--color-brand-strong)]"
                  />
                  <span className="min-w-0">
                    <span className="block font-medium text-ink">{u.label}</span>
                    <span className="block truncate text-sm text-muted">{u.email}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-4">
            <legend className="mb-1.5 text-sm font-semibold text-ink">Repeat</legend>
            <div role="radiogroup" aria-label="Repeat" className="flex flex-wrap gap-2">
              {KINDS.map(k => (
                <button key={k.kind} role="radio" aria-checked={kind === k.kind} onClick={() => setKind(k.kind)} className={chip(kind === k.kind)}>
                  {k.label}
                </button>
              ))}
            </div>
            {kind === 'weekly' && (
              <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Days">
                {WEEK_DAYS.map(d => {
                  const on = days.includes(d.day);
                  return (
                    <button
                      key={d.day}
                      aria-pressed={on}
                      onClick={() => setDays(on ? days.filter(x => x !== d.day) : [...days, d.day])}
                      className={`${chip(on)} min-w-11 px-2`}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            )}
          </fieldset>

          <div className="mt-4 flex gap-3">
            {kind === 'once' && (
              <label className="flex-1">
                <span className="mb-1.5 block text-sm font-semibold text-ink">Date</span>
                <input type="date" value={date} min={todayIso()} onChange={e => setDate(e.target.value)} className={inputClass} />
              </label>
            )}
            <label className="flex-1">
              <span className="mb-1.5 block text-sm font-semibold text-ink">Time</span>
              <input type="time" value={time} onChange={e => setTime(e.target.value)} className={inputClass} />
            </label>
          </div>
          <p className="mt-2 text-sm text-muted">{describeRecurrence({ kind, time, date, days })}, phone time.</p>

          <div className="mt-4 divide-y divide-line rounded-lg border border-line bg-page/50 px-4">
            <div className="py-2">
              <Switch value={hideBotAgentUi} onValueChange={setHideBotAgentUi} hint="The bot runs without opening its window on the PC">
                Run in background
              </Switch>
            </div>
            <div className="py-2">
              <Switch value={notify} onValueChange={changeNotify} hint="Shows its progress and alerts you when it finishes">
                Notify me while it runs
              </Switch>
              {notifyBlocked && (
                <p role="alert" className="mt-1 text-sm text-fail">
                  Notifications are blocked for Bot Manager. Allow them in the phone's settings.
                </p>
              )}
            </div>
          </div>

          {!exact && (
            <div className="mt-4 flex gap-3 rounded-lg border-l-4 border-warn bg-warn/10 px-3 py-2.5 text-sm text-ink">
              <AlarmClock size={18} className="mt-0.5 shrink-0 text-warn" />
              <div>
                <p>
                  Without the <span className="font-semibold">Alarms &amp; reminders</span> permission Android may launch it a few minutes late.
                </p>
                <button
                  onClick={() => openExactAlarmSettings().then(() => setTimeout(() => exactAlarmsAllowed().then(setExact), 1500))}
                  className="mt-1 min-h-11 font-semibold text-brand-strong underline-offset-2 active:underline"
                >
                  Allow exact alarms
                </button>
              </div>
            </div>
          )}

          {message && (
            <p role="alert" className="mt-4 text-sm text-fail">
              {message}
            </p>
          )}

          <div className="mt-5 flex gap-3">
            <button onClick={onClose} disabled={saving} className={`${buttonStyles.secondary} flex-1`}>
              Cancel
            </button>
            <button onClick={save} disabled={saving} data-autofocus className={`${buttonStyles.primary} flex-1`}>
              {saving ? 'Saving…' : 'Save schedule'}
            </button>
          </div>
        </div>
      </Sheet>
    </Modal>
  );
};
