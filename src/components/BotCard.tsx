import React from 'react';
import { ChevronRight, Play } from 'lucide-react';
import { Bot } from '../types';
import { Spinner } from './ui';

interface BotCardProps {
  bot: Bot;
  isExecuting: boolean;
  isDisabled: boolean;
  onPress: () => void;
  onFolderPress?: (folder: Bot) => void;
}

export const BotCard: React.FC<BotCardProps> = ({ bot, isExecuting, isDisabled, onPress, onFolderPress }) => {
  const isFolder = bot.type === 'application/vnd.aa.directory';
  const isBot = bot.type === 'application/vnd.aa.taskbot';

  const content = (
    <>
      <span className="text-2xl">{isFolder ? '📁' : '🤖'}</span>
      <span className="min-w-0 flex-1 break-words text-left text-base font-medium text-ink">{bot.name}</span>
      {isFolder && <ChevronRight size={20} className="text-gray-400" />}
    </>
  );

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3.5 shadow-sm">
      {isFolder ? (
        <button
          className="flex min-w-0 flex-1 items-center gap-3 transition active:opacity-60"
          onClick={() => onFolderPress?.(bot)}
          disabled={isDisabled}
        >
          {content}
        </button>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3">{content}</div>
      )}
      {isBot && (
        <button
          onClick={onPress}
          disabled={isDisabled}
          aria-label={`Run ${bot.name}`}
          className={`flex size-11 shrink-0 items-center justify-center rounded-full text-white shadow-md transition active:scale-90 disabled:opacity-60 ${
            isExecuting ? 'bg-muted' : 'bg-success shadow-success/30'
          }`}
        >
          {isExecuting ? <Spinner className="size-5" color="#fff" /> : <Play size={18} fill="currentColor" />}
        </button>
      )}
    </div>
  );
};
