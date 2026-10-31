import React from 'react';
import { CircleX, PlugZap, WifiOff } from 'lucide-react';
import { Modal, Sheet, buttonStyles } from './ui';

interface BotExecutionErrorModalProps {
  visible: boolean;
  errorMessage: string;
  errorType?: 'execution' | 'device' | 'network';
  onConfirm: () => void;
}

const COPY = {
  device: { Icon: PlugZap, title: "The PC isn't connected" },
  network: { Icon: WifiOff, title: "Couldn't reach the Control Room" },
  execution: { Icon: CircleX, title: "The bot didn't start" },
};

export const BotExecutionErrorModal: React.FC<BotExecutionErrorModalProps> = ({
  visible,
  errorMessage,
  errorType = 'execution',
  onConfirm,
}) => {
  const { Icon, title } = COPY[errorType];

  return (
    <Modal visible={visible} onRequestClose={onConfirm} labelledBy="launch-error-title">
      <Sheet>
        <div role="alert" className="px-5 pb-5 pt-2">
          <Icon size={30} className="text-fail" />
          <h2 id="launch-error-title" className="mt-3 text-xl font-semibold text-ink">
            {title}
          </h2>
          <p className="mt-1 max-h-40 overflow-y-auto break-words text-muted">{errorMessage}</p>

          {errorType === 'device' && (
            <div className="mt-4 rounded-lg border-l-4 border-warn bg-warn/10 px-4 py-3 text-sm text-ink">
              <p className="font-semibold">To fix it</p>
              <ul className="mt-1 list-inside list-disc space-y-0.5 text-ink-soft">
                <li>Check the PC is on and the Bot Agent is running</li>
                <li>Open Devices and reset it if it stays offline</li>
              </ul>
            </div>
          )}

          <button onClick={onConfirm} data-autofocus className={`${buttonStyles.primary} mt-6 w-full`}>
            OK
          </button>
        </div>
      </Sheet>
    </Modal>
  );
};
