import React from 'react';
import { SearchX } from 'lucide-react';
import { Modal, Sheet, buttonStyles } from './ui';

interface BotNotFoundModalProps {
  visible: boolean;
  botName: string;
  userLabel: string;
  onClose: () => void;
}

export const BotNotFoundModal: React.FC<BotNotFoundModalProps> = ({ visible, botName, userLabel, onClose }) => (
  <Modal visible={visible} onRequestClose={onClose} labelledBy="not-found-title">
    <Sheet>
      <div role="alert" className="px-5 pb-5 pt-2">
        <SearchX size={30} className="text-amber" />
        <h2 id="not-found-title" className="mt-3 font-display text-2xl font-bold text-ink">
          {userLabel} doesn't have this bot
        </h2>
        <p className="mt-1 text-steel">
          "{botName}" isn't in {userLabel}'s Control Room. Pick another account, or import the bot into this one
          first.
        </p>
        <button onClick={onClose} data-autofocus className={`${buttonStyles.primary} mt-6 w-full`}>
          OK
        </button>
      </div>
    </Sheet>
  </Modal>
);
