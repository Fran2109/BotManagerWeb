import React from 'react';
import { Modal } from './ui';

interface BotExecutionSuccessModalProps {
  visible: boolean;
  botName: string;
  deploymentId: string;
  onConfirm: () => void;
}

export const BotExecutionSuccessModal: React.FC<BotExecutionSuccessModalProps> = ({
  visible,
  botName,
  deploymentId,
  onConfirm,
}) => (
  <Modal visible={visible}>
    <div className="rounded-3xl bg-white p-6 text-center shadow-2xl">
      <div className="relative mx-auto mb-4 flex size-24 items-center justify-center rounded-full bg-success/15">
        <span className="text-5xl animate-pop-in" style={{ animationDelay: '200ms' }}>
          🤖
        </span>
        <span className="absolute -right-1 -top-1 text-2xl animate-fade-in" style={{ animationDelay: '400ms' }}>
          ✨
        </span>
      </div>
      <h2 className="mb-4 text-xl font-bold text-ink">Bot Launched Successfully!</h2>

      <div className="mb-3 rounded-xl bg-surface p-3 text-left">
        <p className="text-xs text-muted">Bot Name:</p>
        <p className="break-words font-semibold text-ink">{botName}</p>
      </div>
      <div className="mb-4 text-left">
        <p className="mb-1 text-xs text-muted">Deployment ID:</p>
        <p className="select-all break-all rounded-xl border border-success/30 bg-success/5 p-3 font-mono text-xs text-ink">
          {deploymentId}
        </p>
      </div>

      <p className="mb-6 text-sm text-muted">
        Your bot is now running and will execute the automated tasks. You can monitor its progress in the "In
        Progress" section.
      </p>
      <button
        onClick={onConfirm}
        className="w-full rounded-xl bg-success py-3 font-semibold text-white shadow-lg shadow-success/30 transition active:scale-95"
      >
        Awesome!
      </button>
    </div>
  </Modal>
);
