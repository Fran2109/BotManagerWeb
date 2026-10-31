import React from 'react';
import { Modal } from './ui';

interface ErrorModalProps {
  visible: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
}

export const ErrorModal: React.FC<ErrorModalProps> = ({ visible, title, message, onConfirm }) => (
  <Modal visible={visible} onRequestClose={onConfirm}>
    <div className="rounded-3xl bg-white p-6 text-center shadow-2xl">
      <div className="mx-auto mb-4 flex size-20 items-center justify-center rounded-full bg-danger/15">
        <span className="flex size-14 items-center justify-center rounded-full bg-danger text-2xl font-bold text-white animate-shake">
          ✕
        </span>
      </div>
      <h2 className="mb-2 text-xl font-bold text-ink">{title}</h2>
      <p className="mb-6 whitespace-pre-line break-words text-ink-soft">{message}</p>
      <button
        onClick={onConfirm}
        className="w-full rounded-xl bg-danger py-3 font-semibold text-white shadow-lg shadow-danger/30 transition active:scale-95"
      >
        Got it
      </button>
    </div>
  </Modal>
);
