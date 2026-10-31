import React from 'react';
import { Bot as BotIcon, ChevronRight, Folder, Play } from 'lucide-react';
import { Bot } from '../types';
import { Spinner } from './ui';

interface BotCardProps {
  bot: Bot;
  isExecuting: boolean;
  isDisabled: boolean;
  onPress: () => void;
  onFolderPress?: (folder: Bot) => void;
}

/** One row of the bot list: folders navigate, bots get the yellow run button. */
export const BotCard: React.FC<BotCardProps> = ({ bot, isExecuting, isDisabled, onPress, onFolderPress }) => {
  const isFolder = bot.type === 'application/vnd.aa.directory';
  const isBot = bot.type === 'application/vnd.aa.taskbot';

  if (isFolder) {
    return (
      <button
        data-row
        onClick={() => onFolderPress?.(bot)}
        disabled={isDisabled}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-enamel"
      >
        <Folder size={22} className="shrink-0 text-steel" fill="var(--color-line)" />
        <span className="min-w-0 flex-1 break-words font-medium text-ink">{bot.name}</span>
        <ChevronRight size={20} className="shrink-0 text-steel" />
      </button>
    );
  }

  return (
    <div data-row className="flex items-center gap-3 px-4 py-3">
      <BotIcon size={22} className="shrink-0 text-ink-soft" />
      <span className="min-w-0 flex-1 break-words font-medium text-ink">{bot.name}</span>
      {isBot && (
        <button
          onClick={onPress}
          disabled={isDisabled}
          aria-label={isExecuting ? `Launching ${bot.name}` : `Run ${bot.name}`}
          className="push-button size-11 shrink-0"
        >
          {isExecuting ? (
            <Spinner className="size-5" color="var(--color-ink)" />
          ) : (
            <Play size={18} fill="currentColor" className="translate-x-px" />
          )}
        </button>
      )}
    </div>
  );
};
