import React from 'react';
import { Power, Camera, RefreshCw } from 'lucide-react';
import { Modal } from './ui';

export type DeviceConfirmActionKind = 'reset' | 'shutdown' | 'screenshot';

interface DeviceActionConfirmModalProps {
  visible: boolean;
  kind: DeviceConfirmActionKind | null;
  userLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ACTION_ICONS = {
  reset: RefreshCw,
  shutdown: Power,
  screenshot: Camera,
} as const;

const CONFIG: Record<
  DeviceConfirmActionKind,
  {
    title: string;
    body: string;
    sub: string;
    confirm: string;
    confirmColor: string;
    iconBg: string;
    iconBorder: string;
  }
> = {
  reset: {
    title: 'Reset device',
    body: 'Reset will disconnect the device and may interrupt running bots.',
    sub: 'Applies to the runner linked to this account.',
    confirm: 'Reset',
    confirmColor: '#dc3545',
    iconBg: '#fdf2f2',
    iconBorder: '#f5c6cb',
  },
  shutdown: {
    title: 'Shut down PC',
    body: 'The bot "Shutdown Now" will run on the connected device for this account.',
    sub: 'The machine may power off if the bot completes successfully.',
    confirm: 'Shut down',
    confirmColor: '#c0392b',
    iconBg: '#fff5f5',
    iconBorder: '#f5d0d0',
  },
  screenshot: {
    title: 'Device screenshot',
    body: 'The bot "RPA019 - Main - Estado PC" will run on the connected device for this account.',
    sub: 'Use this to capture the current device state.',
    confirm: 'Run',
    confirmColor: '#007bff',
    iconBg: '#f0f7ff',
    iconBorder: '#cfe8fc',
  },
};

export const DeviceActionConfirmModal: React.FC<DeviceActionConfirmModalProps> = ({
  visible,
  kind,
  userLabel,
  onConfirm,
  onCancel,
}) => {
  if (!visible || !kind) {
    return null;
  }

  const c = CONFIG[kind];
  const IconComponent = ACTION_ICONS[kind];

  return (
    <Modal visible={visible} onRequestClose={onCancel}>
      <div className="rounded-3xl bg-white p-6 text-center shadow-2xl">
        <div
          className="mx-auto mb-4 flex size-20 items-center justify-center rounded-full border-2"
          style={{ backgroundColor: c.iconBg, borderColor: c.iconBorder }}
        >
          <IconComponent size={36} color={c.confirmColor} strokeWidth={2.25} />
        </div>
        <h2 className="mb-2 text-xl font-bold text-ink">{c.title}</h2>
        <p className="mb-2 text-ink-soft">
          <span className="font-bold text-ink">{userLabel}</span>
          {' — '}
          {c.body}
        </p>
        <p className="mb-6 text-sm text-muted">{c.sub}</p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl bg-surface py-3 font-semibold text-muted transition active:scale-95"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 font-semibold text-white shadow-lg transition active:scale-95"
            style={{ backgroundColor: c.confirmColor, boxShadow: `0 8px 20px -6px ${c.confirmColor}` }}
          >
            <IconComponent size={20} color="#ffffff" strokeWidth={2.25} />
            {c.confirm}
          </button>
        </div>
      </div>
    </Modal>
  );
};
