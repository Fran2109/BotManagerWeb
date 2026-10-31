import React from 'react';
import { CircleCheck } from 'lucide-react';
import { Modal, Sheet, buttonStyles } from './ui';

interface SuccessModalProps {
  visible: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
}

export const SuccessModal: React.FC<SuccessModalProps> = ({ visible, title, message, onConfirm }) => (
  <Modal visible={visible} onRequestClose={onConfirm} labelledBy="success-title">
    <Sheet>
      <div className="px-5 pb-5 pt-2">
        <CircleCheck size={30} className="text-ok" />
        <h2 id="success-title" className="mt-3 text-xl font-semibold text-ink">
          {title}
        </h2>
        <p className="mt-1 whitespace-pre-line text-muted">{message}</p>
        <button onClick={onConfirm} data-autofocus className={`${buttonStyles.primary} mt-6 w-full`}>
          OK
        </button>
      </div>
    </Sheet>
  </Modal>
);
