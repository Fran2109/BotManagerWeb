import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlarmClock, CalendarClock, Trash2 } from 'lucide-react';
import { ScreenWrapper } from '../components';
import { ScreenTitle } from '../components/ScreenWrapper';
import { ErrorState, Modal, Panel, Sheet, SkeletonRows, Switch, buttonStyles, useListEntrance } from '../components/ui';
import {
  Schedule,
  deleteSchedule,
  describeNextRun,
  describeRecurrence,
  exactAlarmsAllowed,
  listSchedules,
  openExactAlarmSettings,
  schedulesSupported,
  setScheduleActive,
} from '../lib/schedules';
import { describeError } from '../lib/errors';
import { useDrawer } from '../navigation/drawerContext';

const ScheduleRow: React.FC<{
  s: Schedule;
  onToggle: (s: Schedule, active: boolean) => void;
  onDelete: (s: Schedule) => void;
}> = ({ s, onToggle, onDelete }) => {
  const next = s.active ? describeNextRun(s.nextAt) : null;
  // A one-time schedule whose time has passed has nothing left to pause or resume.
  const done = s.kind === 'once' && !s.active && (s.nextAt < 0 || !!s.lastRunAt);
  const state = done ? 'Already ran' : s.active ? (next ? `Next: ${next}` : 'Nothing left to run') : 'Paused';
  return (
    <div data-row className="px-4 py-3.5">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="break-words font-semibold text-ink">{s.botName}</p>
          <p className="text-sm text-ink-soft">{describeRecurrence(s)}</p>
          <p className="text-sm text-muted">
            On {s.accountLabel}
            {s.hideBotAgentUi ? ', in background' : ''}
            {s.notify ? ', with notifications' : ''}
          </p>
          <p className="mt-1 text-sm text-muted">
            {state}
            {s.lastResult ? `. Last: ${s.lastResult}` : ''}
          </p>
        </div>
        {!done && (
          <Switch
            value={s.active}
            onValueChange={active => onToggle(s, active)}
            label={`${s.active ? 'Pause' : 'Resume'} ${s.botName} schedule`}
          />
        )}
      </div>
      <button
        onClick={() => onDelete(s)}
        className={`${buttonStyles.ghost} -ml-2 mt-1 text-fail`}
        aria-label={`Delete ${s.botName} schedule`}
      >
        <Trash2 size={16} /> Delete
      </button>
    </div>
  );
};

export const ScheduledScreen = () => {
  const { navigate } = useDrawer();
  const [schedules, setSchedules] = useState<Schedule[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exact, setExact] = useState(true);
  const [toDelete, setToDelete] = useState<Schedule | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  useListEntrance(listRef, !!schedules);

  const load = useCallback(async () => {
    if (!schedulesSupported()) return;
    try {
      setError(null);
      setSchedules(await listSchedules());
      setExact(await exactAlarmsAllowed());
    } catch (err) {
      setError(describeError(err));
    }
  }, []);

  useEffect(() => {
    void load();
    // The permission screen and the alarms change outside the app: refresh on return.
    const onVisible = () => !document.hidden && void load();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [load]);

  const toggle = async (s: Schedule, active: boolean) => {
    const updated = await setScheduleActive(s.id, active);
    setSchedules(list => list?.map(x => (x.id === s.id ? updated : x)) ?? null);
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    await deleteSchedule(toDelete.id);
    setSchedules(list => list?.filter(x => x.id !== toDelete.id) ?? null);
    setToDelete(null);
  };

  let body: React.ReactNode;
  if (!schedulesSupported()) {
    body = (
      <p className="px-4 py-6 text-muted">
        Schedules run from the phone, so they're only available in the Android app.
      </p>
    );
  } else if (error) {
    body = <ErrorState title="Couldn't load the schedules" error={error} onRetry={load} />;
  } else if (!schedules) {
    body = <SkeletonRows label="Loading schedules" rows={3} />;
  } else if (schedules.length === 0) {
    body = (
      <div className="px-4 py-8">
        <CalendarClock size={28} className="text-muted" />
        <p className="mt-2 text-ink">No schedules yet.</p>
        <p className="mt-1 text-sm text-muted">Open a bot in Bots, then choose Schedule.</p>
        <button onClick={() => navigate('Bots')} className={`${buttonStyles.secondary} mt-4`}>
          Go to Bots
        </button>
      </div>
    );
  } else {
    body = (
      <div ref={listRef} className="mx-3 mb-4 space-y-3">
        {!exact && (
          <div className="flex gap-3 rounded-lg border-l-4 border-warn bg-warn/10 px-3 py-2.5 text-sm text-ink">
            <AlarmClock size={18} className="mt-0.5 shrink-0 text-warn" />
            <div>
              <p>
                Android may launch these a few minutes late until you allow{' '}
                <span className="font-semibold">Alarms &amp; reminders</span> for Bot Manager.
              </p>
              <button
                onClick={() => openExactAlarmSettings()}
                className="mt-1 min-h-11 font-semibold text-brand-strong underline-offset-2 active:underline"
              >
                Allow exact alarms
              </button>
            </div>
          </div>
        )}
        <Panel header="The phone launches each bot at its time. It must be on and online.">
          {schedules.map(s => (
            <ScheduleRow key={s.id} s={s} onToggle={toggle} onDelete={setToDelete} />
          ))}
        </Panel>
      </div>
    );
  }

  return (
    <ScreenWrapper>
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl safe-bottom">
          <ScreenTitle title="Scheduled" subtitle="Bots this phone launches on a schedule" />
          {body}
        </div>
      </div>

      <Modal visible={!!toDelete} onRequestClose={() => setToDelete(null)} labelledBy="delete-schedule-title">
        {toDelete && (
          <Sheet>
            <div className="px-5 pb-5 pt-2">
              <h2 id="delete-schedule-title" className="text-xl font-semibold text-ink">
                Delete this schedule?
              </h2>
              <p className="mt-1 text-muted">
                {toDelete.botName} ({describeRecurrence(toDelete)}). Runs already launched aren't affected.
              </p>
              <div className="mt-6 flex gap-3">
                <button onClick={() => setToDelete(null)} data-autofocus className={`${buttonStyles.secondary} flex-1`}>
                  Cancel
                </button>
                <button onClick={confirmDelete} className={`${buttonStyles.danger} flex-1`}>
                  Delete
                </button>
              </div>
            </div>
          </Sheet>
        )}
      </Modal>
    </ScreenWrapper>
  );
};
