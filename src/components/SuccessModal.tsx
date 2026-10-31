import React from 'react';
import { Modal } from './ui';

interface SuccessModalProps {
  visible: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
}

export const SuccessModal: React.FC<SuccessModalProps> = ({ visible, title, message, onConfirm }) => (
  <Modal visible={visible} onRequestClose={onConfirm}>
    <div className="rounded-3xl bg-white p-6 text-center shadow-2xl">
      <div className="mx-auto mb-4 flex size-20 items-center justify-center rounded-full bg-success/15">
        <span
          className="flex size-14 items-center justify-center rounded-full bg-success text-3xl font-bold text-white animate-pop-in"
          style={{ animationDelay: '200ms' }}
        >
          ✓
        </span>
      </div>
      <h2 className="mb-2 text-xl font-bold text-ink">{title}</h2>
      <p className="mb-6 whitespace-pre-line text-ink-soft">{message}</p>
      <button
        onClick={onConfirm}
        className="w-full rounded-xl bg-success py-3 font-semibold text-white shadow-lg shadow-success/30 transition active:scale-95"
      >
        Great!
      </button>
    </div>
  </Modal>
);
