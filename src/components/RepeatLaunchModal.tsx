import React from 'react';
import { RotateCcw } from 'lucide-react';
import { AVAILABLE_USERS } from '../constants/users';
import { RecentLaunch, removeRecent } from '../lib/launchHistory';
import { formatRelative } from '../lib/runStatus';
import { Modal, Sheet, buttonStyles } from './ui';

interface RepeatLaunchModalProps {
  launch: RecentLaunch | null;
  onRunAgain: (launch: RecentLaunch) => void;
  onChangeOptions: (launch: RecentLaunch) => void;
  onClose: () => void;
}

/** Confirms repeating a recent launch exactly as it was (account, options and inputs). */
export const RepeatLaunchModal: React.FC<RepeatLaunchModalProps> = ({
  launch,
  onRunAgain,
  onChangeOptions,
  onClose,
}) => {
  const account = launch ? AVAILABLE_USERS.find(u => u.email === launch.userEmail)?.label ?? launch.userEmail : '';
  const inputCount = launch?.botInputs ? Object.keys(launch.botInputs).length : 0;

  return (
    <Modal visible={!!launch} onRequestClose={onClose} labelledBy="repeat-title">
      {launch && (
        <Sheet>
          <div className="px-5 pb-5 pt-2">
            <p className="text-sm font-medium text-brand-strong">Run again</p>
            <h2 id="repeat-title" className="mt-0.5 break-words text-xl font-semibold leading-tight text-ink">
              {launch.bot.name}
            </h2>
            <p className="mt-1 text-muted">Same as last time, {formatRelative(new Date(launch.at).toISOString())}:</p>

            <dl className="mt-3 divide-y divide-line rounded-lg border border-line bg-page/50 text-sm">
              {[
                ['Account', account],
                ['Run in background', launch.hideBotAgentUi ? 'Yes' : 'No'],
                ['Notify me while it runs', launch.notifyProgress ? 'Yes' : 'No'],
                ['Inputs', inputCount ? `${inputCount} value${inputCount === 1 ? '' : 's'} from last time, you can review them` : 'None'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3 px-4 py-2.5">
                  <dt className="text-muted">{label}</dt>
                  <dd className="text-right font-medium text-ink">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-6 flex gap-3">
              <button onClick={() => onChangeOptions(launch)} className={`${buttonStyles.secondary} flex-1`}>
                Change options
              </button>
              <button onClick={() => onRunAgain(launch)} data-autofocus className={`${buttonStyles.primary} flex-1`}>
                <RotateCcw size={16} />
                Run again
              </button>
            </div>
            <button
              onClick={() => {
                removeRecent(launch.bot.name);
                onClose();
              }}
              className={`${buttonStyles.ghost} mt-2 w-full text-muted`}
            >
              Remove from recent
            </button>
          </div>
        </Sheet>
      )}
    </Modal>
  );
};
