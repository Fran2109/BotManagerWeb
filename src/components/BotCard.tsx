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

/**
 * One row of the bot list. Folders navigate; for bots the whole row opens "Run bot now"
 * (the sheet still asks for the account, so a stray tap can't launch anything).
 */
export const BotCard: React.FC<BotCardProps> = ({ bot, isExecuting, isDisabled, onPress, onFolderPress }) => {
  const isFolder = bot.type === 'application/vnd.aa.directory';
  const isBot = bot.type === 'application/vnd.aa.taskbot';

  if (isFolder) {
    return (
      <button
        data-row
        onClick={() => onFolderPress?.(bot)}
        disabled={isDisabled}
        className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left active:bg-page"
      >
        <Folder size={20} className="shrink-0 text-warn" fill="#f9d58b" strokeWidth={1.75} />
        <span className="min-w-0 flex-1 break-words text-[15px] text-ink">{bot.name}</span>
        <ChevronRight size={18} className="shrink-0 text-muted" />
      </button>
    );
  }

  return (
    <button
      data-row
      onClick={isBot ? onPress : undefined}
      disabled={isDisabled || !isBot}
      aria-label={isExecuting ? `Launching ${bot.name}` : `Run ${bot.name}`}
      className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left active:bg-page disabled:opacity-60"
    >
      <BotIcon size={20} className="shrink-0 text-brand-strong" strokeWidth={1.75} />
      <span className="min-w-0 flex-1 break-words text-[15px] text-ink">{bot.name}</span>
      {isBot && (
        <span
          aria-hidden
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-tint text-brand-strong"
        >
          {isExecuting ? (
            <Spinner className="size-4" color="var(--color-brand-strong)" />
          ) : (
            <Play size={16} fill="currentColor" className="translate-x-px" />
          )}
        </span>
      )}
    </button>
  );
};
