import React, { useState, useRef } from 'react';
import { Bot, BotInput } from '../types';
import { AVAILABLE_USERS, DEFAULT_PASSWORD } from '../constants/users';
import { useBotExecution } from '../hooks/useBotExecution';
import { useBotsList } from '../hooks/useBotsList';
import { getBotContent, getToken, checkBotExists } from '../Functions';
import { useBackHandler } from '../navigation/backHandler';
import {
  BotCard,
  UserSelectionModal,
  LoadingModal,
  Breadcrumb,
  ScreenWrapper,
  BotExecutionSuccessModal,
  BotExecutionErrorModal,
  BotVariablesModal,
  BotNotFoundModal,
} from '../components';
import { ErrorState, LoadingState, useListEntrance } from '../components/ui';

const DEVICE_NOT_CONNECTED_MESSAGE =
  "The PC for this account is offline, so the bot can't start. Check it in Devices.";

export const BotManagerScreen = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedBot, setSelectedBot] = useState<Bot | null>(null);
  const [selectedUserEmail, setSelectedUserEmail] = useState<string>('');
  const [variablesModalVisible, setVariablesModalVisible] = useState(false);
  const [preExecutionLoading, setPreExecutionLoading] = useState(false);
  const [preExecutionMessage, setPreExecutionMessage] = useState('');
  const launchHideBotAgentUiRef = useRef(false);

  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [botNotFoundModalVisible, setBotNotFoundModalVisible] = useState(false);
  const [executionResult, setExecutionResult] = useState<{
    botName: string;
    deploymentId?: string;
    errorMessage?: string;
    errorType?: 'execution' | 'device' | 'network';
    userLabel?: string;
  } | null>(null);
  const { loading, loadingMessage, executingBots, executeBot } = useBotExecution();
  const {
    bots,
    loading: botsLoading,
    error: botsError,
    currentPath,
    navigateToFolder,
    navigateToBreadcrumb,
    refetch,
  } = useBotsList();

  const goToParentFolder = () => {
    const parentIndex = currentPath.length - 2;
    navigateToBreadcrumb(currentPath[parentIndex], parentIndex);
  };

  // Android back button: go up one folder; at root, fall through to "press again to exit".
  useBackHandler(() => {
    goToParentFolder();
    return true;
  }, currentPath.length > 1);

  const showBotNotFound = (botName: string, userEmail: string) => {
    const user = AVAILABLE_USERS.find(u => u.email === userEmail);
    setExecutionResult({
      botName,
      userLabel: user?.label || userEmail,
      errorType: 'execution',
    });
    setBotNotFoundModalVisible(true);
  };

  const runBot = (bot: Bot, userEmail: string, options: { botInputs?: BotInput; hideBotAgentUi: boolean }) => {
    executeBot(
      bot,
      userEmail,
      (botName: string, deploymentId: string) => {
        setExecutionResult({ botName, deploymentId });
        setSuccessModalVisible(true);
      },
      (errorMessage: string) => {
        setExecutionResult({ botName: bot.name, errorMessage, errorType: 'execution' });
        setErrorModalVisible(true);
      },
      () => {
        setExecutionResult({ botName: bot.name, errorMessage: DEVICE_NOT_CONNECTED_MESSAGE, errorType: 'device' });
        setErrorModalVisible(true);
      },
      showBotNotFound,
      options,
    );
  };

  const handleUserSelection = async (bot: Bot, userEmail: string, hideBotAgentUi: boolean) => {
    launchHideBotAgentUiRef.current = hideBotAgentUi;
    setModalVisible(false);
    setSelectedBot(bot);
    setSelectedUserEmail(userEmail);
    setPreExecutionLoading(true);
    setPreExecutionMessage('Validating bot in selected account...');

    try {
      const user = AVAILABLE_USERS.find(u => u.email === userEmail);
      if (!user) {
        throw new Error('User not found');
      }

      // STEP 1: Check if bot exists in the target user's Control Room
      const botExists = await checkBotExists(bot.taskName, userEmail);

      if (!botExists.exists) {
        showBotNotFound(bot.name, userEmail);
        return;
      }

      // STEP 2: Bot exists, now check if it has input variables
      setPreExecutionMessage('Loading bot variables...');
      const token = await getToken(user.email, DEFAULT_PASSWORD);
      const botContent = await getBotContent(botExists.taskId!, token, user.email);

      const inputVariables = botContent.variables.filter(
        variable => variable.input && variable.type?.toUpperCase() !== 'WINDOW',
      );

      if (inputVariables.length > 0) {
        setSelectedBot({ ...bot, id: botExists.taskId! });
        setVariablesModalVisible(true);
      } else {
        setPreExecutionLoading(false);
        setPreExecutionMessage('');
        runBot(bot, userEmail, { hideBotAgentUi });
      }
    } catch (error: any) {
      console.error('Error in handleUserSelection:', error);

      // Check if this is a 404 error (bot not found)
      if (error.response?.status === 404 || error.message?.includes('not found') || error.message?.includes('404')) {
        showBotNotFound(bot.name, userEmail);
      } else {
        setExecutionResult({ botName: bot.name, errorMessage: error.message || 'Unknown error', errorType: 'execution' });
        setErrorModalVisible(true);
      }
    } finally {
      setPreExecutionLoading(false);
      setPreExecutionMessage('');
    }
  };

  const handleVariablesConfirm = (botInputs: BotInput) => {
    setVariablesModalVisible(false);

    if (!selectedBot || !selectedUserEmail) return;

    runBot(selectedBot, selectedUserEmail, { botInputs, hideBotAgentUi: launchHideBotAgentUiRef.current });
  };

  const listRef = useRef<HTMLDivElement>(null);
  const folderKey = currentPath[currentPath.length - 1]?.id;
  useListEntrance(listRef, !botsLoading && !botsError, folderKey);

  let content: React.ReactNode;
  if (botsLoading) {
    content = <LoadingState title="Loading bots" />;
  } else if (botsError) {
    content = (
      <ErrorState
        title="Couldn't load bots"
        error={botsError}
        onRetry={refetch}
        help="Check that the phone has internet and the Control Room is up."
      />
    );
  } else {
    content = (
      <>
        <Breadcrumb path={currentPath} onNavigate={navigateToBreadcrumb} />
        <div className="flex-1 overflow-y-auto">
          <div ref={listRef} className="mx-auto w-full max-w-3xl p-3 safe-bottom">
            {bots.length === 0 ? (
              <p className="px-2 py-10 text-steel">This folder is empty.</p>
            ) : (
              <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-panel">
                {bots.map(item => (
                  <BotCard
                    key={item.id}
                    bot={item}
                    isExecuting={executingBots.has(item.id)}
                    isDisabled={executingBots.has(item.id) || loading}
                    onPress={() => {
                      setSelectedBot(item);
                      setModalVisible(true);
                    }}
                    onFolderPress={navigateToFolder}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  return (
    <ScreenWrapper currentPath={currentPath} onBackPress={goToParentFolder}>
      {content}

      <UserSelectionModal
        visible={modalVisible}
        selectedBot={selectedBot}
        users={AVAILABLE_USERS}
        loading={loading || preExecutionLoading}
        onUserSelect={(userEmail, hideBotAgentUi) =>
          selectedBot && handleUserSelection(selectedBot, userEmail, hideBotAgentUi)
        }
        onClose={() => setModalVisible(false)}
      />

      <LoadingModal
        visible={loading || preExecutionLoading}
        message={preExecutionLoading ? preExecutionMessage : loadingMessage}
      />

      <BotVariablesModal
        visible={variablesModalVisible}
        bot={selectedBot}
        userEmail={selectedUserEmail}
        onClose={() => {
          setVariablesModalVisible(false);
          setSelectedBot(null);
          setSelectedUserEmail('');
        }}
        onConfirm={handleVariablesConfirm}
      />

      <BotExecutionSuccessModal
        visible={successModalVisible}
        botName={executionResult?.botName || ''}
        deploymentId={executionResult?.deploymentId || ''}
        onConfirm={() => {
          setSuccessModalVisible(false);
          setExecutionResult(null);
        }}
      />

      <BotExecutionErrorModal
        visible={errorModalVisible}
        errorMessage={executionResult?.errorMessage || ''}
        errorType={executionResult?.errorType}
        onConfirm={() => {
          setErrorModalVisible(false);
          setExecutionResult(null);
        }}
      />

      <BotNotFoundModal
        visible={botNotFoundModalVisible}
        botName={executionResult?.botName || ''}
        userLabel={executionResult?.userLabel || ''}
        onClose={() => {
          setBotNotFoundModalVisible(false);
          setExecutionResult(null);
        }}
      />
    </ScreenWrapper>
  );
};
