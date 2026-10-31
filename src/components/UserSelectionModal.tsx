import React, { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Bot, User } from '../types';
import { useDeviceStatus } from '../hooks/useDeviceStatus';
import { Lamp, Modal, Sheet, Switch, buttonStyles } from './ui';
import { ensureNotifications } from '../lib/runTracker';

const NOTIFY_PREF_KEY = 'botmanager:notify-progress';

const readNotifyPref = () => {
  try {
    return localStorage.getItem(NOTIFY_PREF_KEY) === '1';
  } catch {
    return false;
  }
};

interface UserSelectionModalProps {
  visible: boolean;
  selectedBot: Bot | null;
  users: User[];
  loading: boolean;
  onUserSelect: (userEmail: string, hideBotAgentUi: boolean, notifyProgress: boolean) => void;
  onClose: () => void;
}

export const UserSelectionModal: React.FC<UserSelectionModalProps> = ({
  visible,
  selectedBot,
  users,
  loading,
  onUserSelect,
  onClose,
}) => {
  const { usersWithDeviceStatus, checkDevicesStatus } = useDeviceStatus();
  const [hideBotAgentUi, setHideBotAgentUi] = useState(false);
  // Remembered between launches, unlike "Run in background".
  const [notifyProgress, setNotifyProgress] = useState(readNotifyPref);
  const [notifyBlocked, setNotifyBlocked] = useState(false);

  useEffect(() => {
    if (visible) {
      setHideBotAgentUi(false);
      setNotifyBlocked(false);
    }
  }, [visible]);

  const changeNotify = async (on: boolean) => {
    // Ask for permission right when the option is turned on, so the prompt has context.
    const allowed = on ? await ensureNotifications().catch(() => false) : true;
    setNotifyBlocked(on && !allowed);
    const next = on && allowed;
    setNotifyProgress(next);
    try {
      localStorage.setItem(NOTIFY_PREF_KEY, next ? '1' : '0');
    } catch {
      // Not remembered; the option still applies to this launch.
    }
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
        <div className="px-5 pb-4 pt-2">
          <p className="text-sm font-medium text-brand-strong">Run bot now</p>
          <h2 id="launch-title" className="mt-0.5 break-words text-xl font-semibold leading-tight text-ink">
            {selectedBot?.name}
          </h2>
          <p className="mt-1 text-muted">Pick the account whose device should run it.</p>
        </div>

        <div className="mx-5 divide-y divide-line rounded-lg border border-line bg-page/50 px-4">
          <div className="py-2">
            <Switch value={hideBotAgentUi} onValueChange={setHideBotAgentUi} hint="The bot runs without opening its window on the PC">
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

        <div className="p-5">
          <button onClick={onClose} disabled={loading} className={`${buttonStyles.secondary} w-full`}>
            Cancel
          </button>
        </div>
      </Sheet>
    </Modal>
  );
};
