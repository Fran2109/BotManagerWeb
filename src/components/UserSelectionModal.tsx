import React, { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Bot, User } from '../types';
import { useDeviceStatus } from '../hooks/useDeviceStatus';
import { Modal, Spinner, Switch, initials } from './ui';

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

  if (!visible || !selectedBot) {
    return null;
  }

  const list = usersWithDeviceStatus.length > 0 ? usersWithDeviceStatus : users;

  return (
    <Modal visible={visible} onRequestClose={() => !loading && onClose()}>
      <div className="max-h-[85vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex flex-col items-center text-center">
          <div className="mb-3 flex size-16 items-center justify-center rounded-full bg-primary/10 text-3xl">🤖</div>
          <h2 className="text-xl font-bold text-ink">Launch Bot</h2>
          <p className="mt-1 break-words font-semibold text-primary">{selectedBot.name}</p>
          <p className="mt-1 text-sm text-muted">Choose an account to execute this bot</p>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-surface px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-ink">Hide Bot Agent UI</p>
            <p className="text-xs text-muted">Off shows the agent window</p>
          </div>
          <Switch value={hideBotAgentUi} onValueChange={setHideBotAgentUi} label="Hide Bot Agent UI" />
        </div>

        <div className="my-4 h-px bg-line" />

        <div className="mb-2 flex items-baseline justify-between">
          <p className="text-sm font-bold text-ink">Available Accounts</p>
          <p className="text-xs text-muted">
            {list.filter(u => u.deviceConnected).length} of {list.length} ready
          </p>
        </div>

        <div className="flex flex-col gap-2">
          {list.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">No accounts available</p>
          ) : (
            list.map((item, index) => {
              const deviceConnected = item.deviceConnected ?? false;
              const isDisabled = loading || !deviceConnected;
              const isChecking = item.checkingDevice ?? false;
              return (
                <button
                  key={item.id}
                  onClick={() => onUserSelect(item.email, hideBotAgentUi)}
                  disabled={isDisabled}
                  style={{ animationDelay: `${index * 60}ms` }}
                  className={`flex items-center gap-3 rounded-2xl border-2 p-3 text-left transition animate-slide-up active:scale-[0.98] ${
                    isDisabled ? 'border-line bg-surface opacity-60' : 'border-success/40 bg-white'
                  }`}
                >
                  <div className="relative">
                    <div
                      className={`flex size-11 items-center justify-center rounded-full font-bold text-ink-soft ${
                        isDisabled ? 'bg-line' : deviceConnected ? 'bg-success/20' : 'bg-danger/20'
                      }`}
                    >
                      {initials(item.label)}
                    </div>
                    {deviceConnected && !isChecking && (
                      <span className="absolute -bottom-0.5 -right-0.5 flex size-4.5 items-center justify-center rounded-full border-2 border-white bg-success text-[9px] font-bold text-white">
                        ✓
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink">{item.label}</p>
                    <p className="truncate text-xs text-muted">{item.email}</p>
                  </div>
                  {isChecking ? (
                    <span className="flex items-center gap-1.5 text-xs text-primary">
                      <Spinner className="size-4" />
                      Checking...
                    </span>
                  ) : (
                    <span
                      className={`flex items-center gap-1.5 text-xs font-semibold ${
                        deviceConnected ? 'text-success' : 'text-danger'
                      }`}
                    >
                      <span className={`size-2 rounded-full ${deviceConnected ? 'bg-success' : 'bg-danger'}`} />
                      {deviceConnected ? 'Ready' : 'Offline'}
                    </span>
                  )}
                  {!isDisabled && deviceConnected && <ChevronRight size={18} className="text-success" />}
                </button>
              );
            })
          )}
        </div>

        <button
          onClick={onClose}
          disabled={loading}
          className="mt-5 w-full rounded-xl bg-surface py-3 font-semibold text-muted transition active:scale-[0.98] disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </Modal>
  );
};
