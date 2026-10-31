import React, { useEffect, useState } from 'react';
import { CalendarClock, ChevronRight, Star } from 'lucide-react';
import { Bot, User } from '../types';
import { useDeviceStatus } from '../hooks/useDeviceStatus';
import { Lamp, Modal, Sheet, Switch, buttonStyles } from './ui';
import { ensureNotifications } from '../lib/runTracker';
import { isFavorite, toggleFavorite, useFavorites } from '../lib/launchHistory';

// Both switches are remembered between launches.
const NOTIFY_PREF_KEY = 'botmanager:notify-progress';
const BACKGROUND_PREF_KEY = 'botmanager:run-in-background';

const readPref = (key: string) => {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
};

const savePref = (key: string, on: boolean) => {
  try {
    localStorage.setItem(key, on ? '1' : '0');
  } catch {
    // Not remembered; the option still applies to this launch.
  }
};

interface UserSelectionModalProps {
  visible: boolean;
  selectedBot: Bot | null;
  users: User[];
  loading: boolean;
  onUserSelect: (userEmail: string, hideBotAgentUi: boolean, notifyProgress: boolean) => void;
  onClose: () => void;
  /** Preloads the switches (e.g. "Change options" on a recent launch). */
  initialOptions?: { hideBotAgentUi: boolean; notifyProgress: boolean } | null;
  /** Shown as "Schedule for later" when scheduling is available (Android). */
  onSchedule?: () => void;
}

export const UserSelectionModal: React.FC<UserSelectionModalProps> = ({
  visible,
  selectedBot,
  users,
  loading,
  onUserSelect,
  onClose,
  initialOptions = null,
  onSchedule,
}) => {
  const { usersWithDeviceStatus, checkDevicesStatus } = useDeviceStatus();
  const [hideBotAgentUi, setHideBotAgentUi] = useState(() => readPref(BACKGROUND_PREF_KEY));
  const [notifyProgress, setNotifyProgress] = useState(() => readPref(NOTIFY_PREF_KEY));
  const [notifyBlocked, setNotifyBlocked] = useState(false);
  const favorites = useFavorites();
  const favorite = !!selectedBot && isFavorite(favorites, selectedBot);

  useEffect(() => {
    if (visible) {
      setHideBotAgentUi(initialOptions?.hideBotAgentUi ?? readPref(BACKGROUND_PREF_KEY));
      if (initialOptions) setNotifyProgress(initialOptions.notifyProgress);
      setNotifyBlocked(false);
    }
    // Only when the sheet opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const changeNotify = async (on: boolean) => {
    // Ask for permission right when the option is turned on, so the prompt has context.
    const allowed = on ? await ensureNotifications().catch(() => false) : true;
    setNotifyBlocked(on && !allowed);
    const next = on && allowed;
    setNotifyProgress(next);
    savePref(NOTIFY_PREF_KEY, next);
  };

  const changeBackground = (on: boolean) => {
    setHideBotAgentUi(on);
    savePref(BACKGROUND_PREF_KEY, on);
  };

  useEffect(() => {
    if (visible && users.length > 0) {
      checkDevicesStatus(users, false);
    }
  }, [visible, users, checkDevicesStatus]);

  const list = usersWithDeviceStatus.length > 0 ? usersWithDeviceStatus : users;
  const readyCount = list.filter(u => u.deviceConnected).length;

  return (
    <Modal
      visible={visible && !!selectedBot}
      onRequestClose={() => !loading && onClose()}
      labelledBy="launch-title"
    >
      <Sheet>
        <div className="flex items-start gap-2 px-5 pb-4 pt-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-brand-strong">Run bot now</p>
            <h2 id="launch-title" className="mt-0.5 break-words text-xl font-semibold leading-tight text-ink">
              {selectedBot?.name}
            </h2>
            <p className="mt-1 text-muted">Pick the account whose device should run it.</p>
          </div>
          {selectedBot && (
            <button
              onClick={() => toggleFavorite(selectedBot)}
              aria-pressed={favorite}
              aria-label={favorite ? 'Remove from favorites' : 'Add to favorites'}
              className="-mr-2 flex size-11 shrink-0 items-center justify-center rounded-md active:bg-page"
            >
              <Star
                size={22}
                className={favorite ? 'text-warn' : 'text-muted'}
                fill={favorite ? 'currentColor' : 'none'}
              />
            </button>
          )}
        </div>

        <div className="mx-5 divide-y divide-line rounded-lg border border-line bg-page/50 px-4">
          <div className="py-2">
            <Switch value={hideBotAgentUi} onValueChange={changeBackground} hint="The bot runs without opening its window on the PC">
              Run in background
            </Switch>
          </div>
          <div className="py-2">
            <Switch
              value={notifyProgress}
              onValueChange={changeNotify}
              hint="Shows its progress in a notification and alerts you when it finishes"
            >
              Notify me while it runs
            </Switch>
            {notifyBlocked && (
              <p role="alert" className="mt-1 text-sm text-fail">
                Notifications are blocked for Bot Manager. Allow them in the phone's settings, then try again.
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 flex items-baseline justify-between px-5 pb-2">
          <h3 className="text-base font-semibold text-ink">Accounts</h3>
          <p className="text-sm text-muted">
            {readyCount} of {list.length} connected
          </p>
        </div>

        <ul className="mx-5 divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
          {list.length === 0 ? (
            <li className="px-4 py-6 text-center text-muted">No accounts configured</li>
          ) : (
            list.map(item => {
              const deviceConnected = item.deviceConnected ?? false;
              const isChecking = item.checkingDevice ?? false;
              const isDisabled = loading || !deviceConnected;
              const state = isChecking ? 'Checking' : deviceConnected ? 'Connected' : 'Disconnected';
              return (
                <li key={item.id}>
                  <button
                    onClick={() => onUserSelect(item.email, hideBotAgentUi, notifyProgress)}
                    disabled={isDisabled}
                    className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-page disabled:opacity-55"
                  >
                    <Lamp state={isChecking ? 'wait' : deviceConnected ? 'on' : 'off'} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-ink">{item.label}</span>
                      <span className="block truncate text-sm text-muted">{item.email}</span>
                    </span>
                    <span className="shrink-0 text-sm text-ink-soft">{state}</span>
                    {!isDisabled && <ChevronRight size={18} className="shrink-0 text-ink" />}
                  </button>
                </li>
              );
            })
          )}
        </ul>

        <div className="flex gap-3 p-5">
          <button onClick={onClose} disabled={loading} className={`${buttonStyles.secondary} flex-1`}>
            Cancel
          </button>
          {onSchedule && (
            <button onClick={onSchedule} disabled={loading} className={`${buttonStyles.secondary} flex-1`}>
              <CalendarClock size={16} />
              Schedule
            </button>
          )}
        </div>
      </Sheet>
    </Modal>
  );
};
