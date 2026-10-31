import { useState, useEffect } from 'react';
import { Bot } from '../types';
import { getBotsList, getFolderContents, getToken } from '../Functions';
import { DEFAULT_PASSWORD } from '../constants/users';
import { BreadcrumbItem } from '../components/Breadcrumb';
import { USER_FRANCISCO1 } from '@env';
import { describeError } from '../lib/errors';

interface BotFromAPI {
  id: string;
  parent: string;
  name: string;
  permission: object;
  lastModified: string;
  lastModifiedBy: string;
  path: string;
  directory: string;
  size: number;
  locked: string;
  productionVersion: string;
  lockedBy: string;
  latestVersion: string;
  fileLastModified: string;
  type: string;
}

const transformBotFromAPI = (apiBot: BotFromAPI): Bot => ({
  id: apiBot.id,
  name: apiBot.name,
  taskName: apiBot.name,
  path: apiBot.path,
  directory: apiBot.directory,
  size: apiBot.size,
  lastModified: apiBot.lastModified,
  lastModifiedBy: apiBot.lastModifiedBy,
  type: apiBot.type,
});

export const useBotsList = () => {
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState<BreadcrumbItem[]>([
    { id: 'root', name: 'Bots' }
  ]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  const fetchBots = async (folderId?: string) => {
    try {
      setLoading(true);
      setError(null);

      const token = await getToken(USER_FRANCISCO1, DEFAULT_PASSWORD);
      let botsFromAPI: any[];

      if (folderId) {
        botsFromAPI = await getFolderContents(token, folderId, USER_FRANCISCO1);
      } else {
        botsFromAPI = await getBotsList(token, USER_FRANCISCO1);
      }

      const transformedBots = botsFromAPI.map(transformBotFromAPI);

      // Filter out unwanted folders only at root level
      const filteredBots = folderId ? transformedBots : transformedBots.filter(bot =>
        bot.name !== 'Document Workspace Processes' &&
        bot.name !== 'Sample bots'
      );

      // Sort items: folders first (alphabetically), then bots (alphabetically)
      const sortedBots = filteredBots.sort((a, b) => {
        const aIsFolder = a.type === 'application/vnd.aa.directory';
        const bIsFolder = b.type === 'application/vnd.aa.directory';

        // If one is folder and other is bot, folder comes first
        if (aIsFolder && !bIsFolder) return -1;
        if (!aIsFolder && bIsFolder) return 1;

        // If both are same type, sort alphabetically by name
        return a.name.localeCompare(b.name);
      });

      setBots(sortedBots);
    } catch (err: any) {
      console.error('Error fetching bots:', err);
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBots(currentFolderId || undefined);
  }, [currentFolderId]);

  const navigateToFolder = (folder: Bot) => {
    const newPathItem: BreadcrumbItem = {
      id: folder.id,
      name: folder.name
    };

    setCurrentPath(prev => [...prev, newPathItem]);
    setCurrentFolderId(folder.id);
  };

  const navigateToBreadcrumb = (item: BreadcrumbItem, index: number) => {
    const newPath = currentPath.slice(0, index + 1);
    setCurrentPath(newPath);

    if (item.id === 'root') {
      setCurrentFolderId(null);
    } else {
      setCurrentFolderId(item.id);
    }
  };

  const refetch = () => {
    fetchBots(currentFolderId || undefined);
  };

  return {
    bots,
    loading,
    error,
    currentPath,
    navigateToFolder,
    navigateToBreadcrumb,
    refetch,
  };
};