import React from 'react';
import { CircleX } from 'lucide-react';
import { Modal, Sheet, buttonStyles } from './ui';

interface ErrorModalProps {
  visible: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
}

export const ErrorModal: React.FC<ErrorModalProps> = ({ visible, title, message, onConfirm }) => (
  <Modal visible={visible} onRequestClose={onConfirm} labelledBy="error-title">
    <Sheet>
      <div role="alert" className="px-5 pb-5 pt-2">
        <CircleX size={30} className="text-fail" />
        <h2 id="error-title" className="mt-3 text-xl font-semibold text-ink">
          {title}
        </h2>
        <p className="mt-1 whitespace-pre-line break-words text-muted">{message}</p>
        <button onClick={onConfirm} data-autofocus className={`${buttonStyles.primary} mt-6 w-full`}>
          OK
        </button>
      </div>
    </Sheet>
  </Modal>
);
