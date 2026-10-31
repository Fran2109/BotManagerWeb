import { useState } from 'react';
import { Bot, BotInput } from '../types';
import { getToken, getUserId, getDeviceStatus, deployBot, checkBotExists } from '../Functions';
import { getBotInput } from '../utils/botInputs';
import { DEFAULT_PASSWORD } from '../constants/users';
import { describeError } from '../lib/errors';

export type ExecuteBotOptions = {
  botInputs?: BotInput;
  hideBotAgentUi?: boolean;
};

export const useBotExecution = () => {
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [executingBots, setExecutingBots] = useState(new Set<string>());

  const executeBot = async (
    bot: Bot,
    userEmail: string,
    onSuccess: (botName: string, deploymentId: string) => void,
    onError: (errorMessage: string) => void,
    onDeviceError: () => void,
    onBotNotFound?: (botName: string, userEmail: string) => void,
    options?: ExecuteBotOptions
  ) => {
    const botId = bot.id;
    setExecutingBots(prev => new Set([...prev, botId]));
    setLoading(true);

    try {

      setLoadingMessage('Authenticating user...');
      const token = await getToken(userEmail, DEFAULT_PASSWORD);

      setLoadingMessage('Checking device status...');
      // Check device status with proper token
      const deviceStatus = await getDeviceStatus(userEmail, token);
      if (deviceStatus !== "CONNECTED") {
        onDeviceError();
        return;
      }

      setLoadingMessage('Verifying bot availability...');
      // Check if bot exists in the selected user's Control Room
      const botExists = await checkBotExists(bot.taskName, userEmail);
      if (!botExists.exists) {
        if (onBotNotFound) {
          onBotNotFound(bot.name, userEmail);
        } else {
          onError(`Bot "${bot.name}" not found in ${userEmail}'s Control Room`);
        }
        return;
      }

      setLoadingMessage('Getting user information...');
      const userId = await getUserId(token, userEmail);

      const botInput = options?.botInputs ?? getBotInput(bot.taskName, userEmail);
      const hideBotAgentUi = options?.hideBotAgentUi ?? false;

      setLoadingMessage('Deploying bot...');
      const deploymentId = await deployBot(
        botExists.taskId!,
        userId,
        token,
        botInput,
        userEmail,
        hideBotAgentUi
      );

      setLoadingMessage('Bot executed successfully!');

      setTimeout(() => {
        onSuccess(bot.name, deploymentId);
      }, 500);

    } catch (error: any) {
      console.error('Error executing bot:', error);
      onError(describeError(error));
    } finally {
      setLoading(false);
      setLoadingMessage('');
      setExecutingBots(prev => {
        const newSet = new Set(prev);
        newSet.delete(botId);
        return newSet;
      });
    }
  };

  return {
    loading,
    loadingMessage,
    executingBots,
    executeBot,
  };
};