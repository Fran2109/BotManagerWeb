import React from 'react';
import { Dots, Modal } from './ui';

interface LoadingModalProps {
  visible: boolean;
  message: string;
}

export const LoadingModal: React.FC<LoadingModalProps> = ({ visible, message }) => {
  // No onRequestClose: like the RN version, it can't be dismissed while running.
  return (
    <Modal visible={visible}>
      <div className="relative overflow-hidden rounded-3xl bg-white px-6 py-8 text-center shadow-2xl">
        <div className="absolute -right-10 -top-10 size-32 rounded-full border-8 border-primary/10" />
        <div className="absolute -bottom-12 -left-12 size-36 rounded-full border-8 border-success/10" />

        <div className="relative mx-auto mb-5 flex size-24 items-center justify-center">
          <span className="absolute inset-0 animate-spin text-6xl leading-24" style={{ animationDuration: '3s' }}>
            ⚙️
          </span>
          <span className="relative flex size-12 items-center justify-center rounded-full bg-white text-3xl shadow">
            🤖
          </span>
        </div>

        <h2 className="relative text-xl font-bold text-ink">Executing Bot</h2>
        <p className="relative mt-1 min-h-6 text-primary">{message}</p>

        <div className="relative mt-5">
          <div className="h-2 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-gradient-to-r from-primary to-success animate-progress" />
          </div>
          <div className="mt-2 flex items-center justify-center gap-2 text-xs text-muted">
            Processing <Dots className="bg-muted" />
          </div>
        </div>

        <p className="relative mt-4 text-xs text-muted">Please wait while the request is being processed</p>
      </div>
    </Modal>
  );
};
