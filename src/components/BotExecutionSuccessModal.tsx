import React from 'react';
import { CircleCheck } from 'lucide-react';
import { Modal, Sheet, buttonStyles } from './ui';

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
  <Modal visible={visible} onRequestClose={onConfirm} labelledBy="launched-title">
    <Sheet>
      <div className="px-5 pb-5 pt-2">
        <CircleCheck size={30} className="text-go" />
        <h2 id="launched-title" className="mt-3 font-display text-2xl font-bold text-ink">
          {botName} is running
        </h2>
        <p className="mt-1 text-steel">Follow its progress in Running now.</p>

        <dl className="mt-4 rounded-xl border border-line bg-enamel/50 px-4 py-3 text-sm">
          <dt className="text-steel">Deployment ID</dt>
          <dd className="mt-0.5 select-all break-all font-medium text-ink">{deploymentId}</dd>
        </dl>

        <button onClick={onConfirm} data-autofocus className={`${buttonStyles.primary} mt-6 w-full`}>
          OK
        </button>
      </div>
    </Sheet>
  </Modal>
);
