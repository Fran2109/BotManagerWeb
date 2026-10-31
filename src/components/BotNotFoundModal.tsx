import React from 'react';
import { Modal } from './ui';

interface BotNotFoundModalProps {
  visible: boolean;
  botName: string;
  userLabel: string;
  onClose: () => void;
}

export const BotNotFoundModal: React.FC<BotNotFoundModalProps> = ({ visible, botName, userLabel, onClose }) => (
  <Modal visible={visible} onRequestClose={onClose}>
    <div className="rounded-3xl bg-white p-6 text-center shadow-2xl animate-shake">
      <div className="mx-auto mb-4 flex size-20 items-center justify-center rounded-full bg-warning/20 animate-pulse">
        <span className="text-4xl">🚫</span>
      </div>
      <h2 className="mb-3 text-xl font-bold text-ink">Bot Not Available</h2>
      <p className="mb-4 text-ink-soft">
        The bot <span className="font-bold text-ink">"{botName}"</span> is not available in{' '}
        <span className="font-bold text-primary">{userLabel}</span>'s Control Room.
      </p>
      <div className="mb-6 flex gap-3 rounded-xl bg-primary/5 p-3 text-left">
        <span className="text-xl">💡</span>
        <p className="text-sm text-ink-soft">
          This bot may only exist in the original account's repository. Please try selecting a different account or
          contact your administrator.
        </p>
      </div>
      <button
        onClick={onClose}
        className="w-full rounded-xl bg-primary py-3 font-semibold text-white shadow-lg shadow-primary/30 transition active:scale-95"
      >
        Got It
      </button>
    </div>
  </Modal>
);
