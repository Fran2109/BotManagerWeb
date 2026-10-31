import React from 'react';
import { CircleCheck } from 'lucide-react';
import { useDrawer } from '../navigation/drawerContext';
import { Modal, Sheet, buttonStyles } from './ui';

interface BotExecutionSuccessModalProps {
  visible: boolean;
  botName: string;
  deploymentId: string;
  /** The run is being followed with notifications (see lib/runTracker). */
  notifying?: boolean;
  onConfirm: () => void;
}

export const BotExecutionSuccessModal: React.FC<BotExecutionSuccessModalProps> = ({
  visible,
  botName,
  deploymentId,
  notifying = false,
  onConfirm,
}) => {
  const { navigate } = useDrawer();

  return (
    <Modal visible={visible} onRequestClose={onConfirm} labelledBy="launched-title">
      <Sheet>
        <div className="px-5 pb-5 pt-2">
          <CircleCheck size={28} className="text-ok" />
          <h2 id="launched-title" className="mt-3 text-xl font-semibold text-ink">
            {botName} is running
          </h2>
          <p className="mt-1 text-muted">
            {notifying
              ? "It now appears in Activity, under In progress. A notification will show its progress and tell you when it finishes."
              : 'It now appears in Activity, under In progress.'}
          </p>

          <dl className="mt-4 rounded-md border border-line bg-page px-4 py-3 text-sm">
            <dt className="text-muted">Deployment ID</dt>
            <dd className="mt-0.5 select-all break-all font-medium text-ink">{deploymentId}</dd>
          </dl>

          <div className="mt-6 flex gap-3">
            <button onClick={onConfirm} className={`${buttonStyles.secondary} flex-1`}>
              Close
            </button>
            <button
              onClick={() => {
                onConfirm();
                navigate('InProgress');
              }}
              data-autofocus
              className={`${buttonStyles.primary} flex-1`}
            >
              View in progress
            </button>
          </div>
        </div>
      </Sheet>
    </Modal>
  );
};
