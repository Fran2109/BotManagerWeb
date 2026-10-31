import React from 'react';
import { Modal } from './ui';

interface BotExecutionErrorModalProps {
  visible: boolean;
  errorMessage: string;
  errorType?: 'execution' | 'device' | 'network';
  onConfirm: () => void;
}

const COPY = {
  device: {
    icon: '🔌',
    title: 'Device Not Connected',
    subtitle: 'The bot runner device is not connected',
  },
  network: {
    icon: '📶',
    title: 'Connection Error',
    subtitle: 'Unable to connect to the automation server',
  },
  execution: {
    icon: '🤖',
    title: 'Bot Execution Failed',
    subtitle: 'An error occurred while executing the bot',
  },
};

export const BotExecutionErrorModal: React.FC<BotExecutionErrorModalProps> = ({
  visible,
  errorMessage,
  errorType = 'execution',
  onConfirm,
}) => {
  const copy = COPY[errorType];

  return (
    <Modal visible={visible}>
      <div className="rounded-3xl bg-white p-6 text-center shadow-2xl">
        <div className="relative mx-auto mb-4 flex size-24 items-center justify-center rounded-full bg-danger/15">
          <span className="text-5xl animate-shake">{copy.icon}</span>
          <span className="absolute -right-1 -top-1 text-2xl">⚠️</span>
        </div>
        <h2 className="text-xl font-bold text-ink">{copy.title}</h2>
        <p className="mb-4 text-sm text-muted">{copy.subtitle}</p>

        <div className="mb-4 rounded-xl border border-danger/20 bg-danger/5 p-3 text-left">
          <p className="mb-1 text-xs font-semibold text-danger">Error Details:</p>
          <p className="max-h-32 overflow-y-auto break-words text-sm text-ink-soft">{errorMessage}</p>
        </div>

        {errorType === 'device' && (
          <div className="mb-4 rounded-xl bg-warning/15 p-3 text-left text-sm">
            <p className="mb-1 font-semibold text-ink">💡 Quick Fix:</p>
            <ul className="list-inside list-disc space-y-0.5 text-ink-soft">
              <li>Check device connection in "Device Status" section</li>
              <li>Try resetting the device if it's disconnected</li>
              <li>Ensure the bot runner is active</li>
            </ul>
          </div>
        )}

        <button
          onClick={onConfirm}
          className="w-full rounded-xl bg-danger py-3 font-semibold text-white shadow-lg shadow-danger/30 transition active:scale-95"
        >
          Got it
        </button>
      </div>
    </Modal>
  );
};
