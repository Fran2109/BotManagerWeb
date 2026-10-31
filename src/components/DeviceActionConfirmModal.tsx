import React from 'react';
import { Power, Camera, RefreshCw } from 'lucide-react';
import { Modal, Sheet, buttonStyles } from './ui';

export type DeviceConfirmActionKind = 'reset' | 'shutdown' | 'screenshot';

interface DeviceActionConfirmModalProps {
  visible: boolean;
  kind: DeviceConfirmActionKind | null;
  userLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const CONFIG: Record<
  DeviceConfirmActionKind,
  { Icon: typeof Power; title: string; body: string; confirm: string; destructive: boolean }
> = {
  reset: {
    Icon: RefreshCw,
    title: 'Reset the device?',
    body: 'The runner disconnects from the Control Room and any bot running on it stops.',
    confirm: 'Reset device',
    destructive: true,
  },
  shutdown: {
    Icon: Power,
    title: 'Shut down the PC?',
    body: 'Runs the "Shutdown Now" bot on this PC. It powers off when the bot finishes.',
    confirm: 'Shut down',
    destructive: true,
  },
  screenshot: {
    Icon: Camera,
    title: 'Take a screenshot?',
    body: 'Runs the "RPA019 - Main - Estado PC" bot to capture what the PC is showing.',
    confirm: 'Take screenshot',
    destructive: false,
  },
};

export const DeviceActionConfirmModal: React.FC<DeviceActionConfirmModalProps> = ({
  visible,
  kind,
  userLabel,
  onConfirm,
  onCancel,
}) => {
  const c = kind ? CONFIG[kind] : null;

  return (
    <Modal visible={visible && !!c} onRequestClose={onCancel} labelledBy="device-action-title">
      {c && (
        <Sheet>
          <div className="px-5 pb-5 pt-2">
            <c.Icon size={28} className={c.destructive ? 'text-fail' : 'text-ink'} />
            <h2 id="device-action-title" className="mt-3 text-xl font-semibold text-ink">
              {c.title}
            </h2>
            <p className="mt-0.5 font-medium text-ink-soft">{userLabel}</p>
            <p className="mt-2 text-muted">{c.body}</p>

            <div className="mt-6 flex gap-3">
              {/* Safe action first and focused, so a stray tap or Enter doesn't trigger it. */}
              <button onClick={onCancel} data-autofocus className={`${buttonStyles.secondary} flex-1`}>
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className={`${c.destructive ? buttonStyles.danger : buttonStyles.primary} flex-1`}
              >
                {c.confirm}
              </button>
            </div>
          </div>
        </Sheet>
      )}
    </Modal>
  );
};
