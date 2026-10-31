import { useSyncExternalStore } from 'react';
import { Bot, BotInput } from '../types';

/**
 * Favorites and recently launched bots, kept on this phone (localStorage). A recent launch
 * stores the account, the options and the inputs used, so it can be repeated as it was.
 * Bots are keyed by name: the same bot has a different file id in each account's
 * Control Room, but the same name.
 */

export interface RecentLaunch {
  bot: Bot;
  userEmail: string;
  hideBotAgentUi: boolean;
  notifyProgress: boolean;
  botInputs?: BotInput;
  at: number;
}

const FAVORITES_KEY = 'botmanager:favorites';
const RECENTS_KEY = 'botmanager:recents';
const MAX_RECENTS = 6;

const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());

const read = <T,>(key: string): T[] => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

const write = (key: string, value: unknown[]) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable (private mode, quota): the list just isn't remembered.
  }
  cache.delete(key);
  emit();
};

// useSyncExternalStore needs a stable snapshot between changes.
const cache = new Map<string, unknown[]>();
const snapshot = <T,>(key: string): T[] => {
  if (!cache.has(key)) cache.set(key, read<T>(key));
  return cache.get(key) as T[];
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Only the fields needed to launch the bot again. */
const slim = (bot: Bot): Bot => ({ id: bot.id, name: bot.name, taskName: bot.taskName, type: bot.type, path: bot.path });

export const useFavorites = () => useSyncExternalStore(subscribe, () => snapshot<Bot>(FAVORITES_KEY));

export const useRecents = () => useSyncExternalStore(subscribe, () => snapshot<RecentLaunch>(RECENTS_KEY));

export const isFavorite = (favorites: Bot[], bot: Bot) => favorites.some(f => f.name === bot.name);

export const toggleFavorite = (bot: Bot) => {
  const favorites = snapshot<Bot>(FAVORITES_KEY);
  write(
    FAVORITES_KEY,
    isFavorite(favorites, bot)
      ? favorites.filter(f => f.name !== bot.name)
      : [...favorites, slim(bot)].sort((a, b) => a.name.localeCompare(b.name)),
  );
};

/** Saves a successful launch at the top of the recents (one entry per bot). */
export const recordLaunch = (launch: Omit<RecentLaunch, 'at'>) => {
  const recents = snapshot<RecentLaunch>(RECENTS_KEY).filter(r => r.bot.name !== launch.bot.name);
  write(RECENTS_KEY, [{ ...launch, bot: slim(launch.bot), at: Date.now() }, ...recents].slice(0, MAX_RECENTS));
};

export const removeRecent = (botName: string) => {
  write(
    RECENTS_KEY,
    snapshot<RecentLaunch>(RECENTS_KEY).filter(r => r.bot.name !== botName),
  );
};
