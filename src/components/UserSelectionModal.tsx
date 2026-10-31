import React, { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Bot, User } from '../types';
import { useDeviceStatus } from '../hooks/useDeviceStatus';
import { Lamp, Modal, Sheet, Switch, buttonStyles } from './ui';

interface UserSelectionModalProps {
  visible: boolean;
  selectedBot: Bot | null;
  users: User[];
  loading: boolean;
  onUserSelect: (userEmail: string, hideBotAgentUi: boolean) => void;
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

  useEffect(() => {
    if (visible) {
      setHideBotAgentUi(false);
    }
  }, [visible]);

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

        <div className="mx-5 rounded-lg border border-line bg-page/50 px-4 py-3">
          <Switch value={hideBotAgentUi} onValueChange={setHideBotAgentUi} hint="The bot runs without opening its window on the PC">
            Run in background
          </Switch>
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
                    onClick={() => onUserSelect(item.email, hideBotAgentUi)}
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
