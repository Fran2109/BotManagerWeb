import React, { useRef } from 'react';
import { Cog } from 'lucide-react';
import { Modal } from './ui';
import { gsap, reducedMotion, useGSAP } from '../lib/motion';

interface LoadingModalProps {
  visible: boolean;
  message: string;
}

/** Blocking progress dialog while a bot is validated and deployed. */
export const LoadingModal: React.FC<LoadingModalProps> = ({ visible, message }) => {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!visible || reducedMotion()) return;
      gsap.to('[data-gear="a"]', { rotation: 360, duration: 3, repeat: -1, ease: 'none' });
      gsap.to('[data-gear="b"]', { rotation: -360, duration: 2, repeat: -1, ease: 'none' });
    },
    { scope, dependencies: [visible], revertOnUpdate: true },
  );

  return (
    <Modal visible={visible} dismissible={false} variant="center" labelledBy="loading-title">
      <div ref={scope} className="rounded-2xl bg-panel px-6 py-7 shadow-xl">
        <div aria-hidden className="relative mb-4 h-14 w-20 text-ink">
          <Cog data-gear="a" size={56} strokeWidth={1.6} className="absolute left-0 top-0" />
          <Cog data-gear="b" size={34} strokeWidth={1.8} className="absolute bottom-0 right-0 text-signal-deep" />
        </div>
        <h2 id="loading-title" className="font-display text-2xl font-bold text-ink">
          Launching bot
        </h2>
        {/* Announced to screen readers as each step changes. */}
        <p role="status" className="mt-1 min-h-6 text-steel">
          {message}
        </p>
      </div>
    </Modal>
  );
};
