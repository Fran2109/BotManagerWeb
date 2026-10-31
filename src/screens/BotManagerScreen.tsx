import React, { useEffect, useMemo, useState, useRef } from 'react';
import { History, Search } from 'lucide-react';
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
  RepeatLaunchModal,
} from '../components';
import { ErrorState, Panel, SkeletonRows, buttonStyles, useListEntrance } from '../components/ui';
import { describeError } from '../lib/errors';
import { trackRun } from '../lib/runTracker';
import { RecentLaunch, isFavorite, recordLaunch, useFavorites, useRecents } from '../lib/launchHistory';
import { useRunStats } from '../hooks/useRunStats';
import { formatRelative } from '../lib/runStatus';

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
  const launchNotifyRef = useRef(false);
  // The bot as listed (its id can be swapped for the target account's file id later).
  const launchBotRef = useRef<Bot | null>(null);

  const favorites = useFavorites();
  const recents = useRecents();
  const [repeatLaunch, setRepeatLaunch] = useState<RecentLaunch | null>(null);
  const [sheetOptions, setSheetOptions] = useState<{ hideBotAgentUi: boolean; notifyProgress: boolean } | null>(null);
  const [prefillInputs, setPrefillInputs] = useState<BotInput | undefined>(undefined);

  // Last result of each bot (any account, last 30 days) for the list; shared with Statistics.
  const { stats } = useRunStats(30);
  const lastRunByName = useMemo(() => new Map(stats?.bots.map(b => [b.name, b.last]) ?? []), [stats]);

  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [botNotFoundModalVisible, setBotNotFoundModalVisible] = useState(false);
  const [executionResult, setExecutionResult] = useState<{
    botName: string;
    deploymentId?: string;
    notifying?: boolean;
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
        if (launchNotifyRef.current) {
          void trackRun(deploymentId, userEmail, botName);
        }
        recordLaunch({
          bot: launchBotRef.current ?? bot,
          userEmail,
          hideBotAgentUi: options.hideBotAgentUi,
          notifyProgress: launchNotifyRef.current,
          botInputs: options.botInputs,
        });
        setExecutionResult({ botName, deploymentId, notifying: launchNotifyRef.current });
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

  const handleUserSelection = async (bot: Bot, userEmail: string, hideBotAgentUi: boolean, notifyProgress: boolean) => {
    launchHideBotAgentUiRef.current = hideBotAgentUi;
    launchNotifyRef.current = notifyProgress;
    launchBotRef.current = bot;
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
        setExecutionResult({ botName: bot.name, errorMessage: describeError(error), errorType: 'execution' });
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

  // Search filters the current folder as you type; it resets when the folder changes.
  const [query, setQuery] = useState('');
  useEffect(() => setQuery(''), [folderKey]);
  const normalize = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase();
  const visibleBots = query.trim() ? bots.filter(b => normalize(b.name).includes(normalize(query.trim()))) : bots;
  const folderCount = bots.filter(b => b.type === 'application/vnd.aa.directory').length;
  const botCount = bots.length - folderCount;
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
  const listSummary = query.trim()
    ? `${plural(visibleBots.length, 'result')} for "${query.trim()}"`
    : [folderCount && plural(folderCount, 'folder'), botCount && plural(botCount, 'bot')].filter(Boolean).join(', ');

  const openRunSheet = (bot: Bot) => {
    setSheetOptions(null);
    setPrefillInputs(undefined);
    setSelectedBot(bot);
    setModalVisible(true);
  };

  const runAgain = (launch: RecentLaunch) => {
    setRepeatLaunch(null);
    setPrefillInputs(launch.botInputs);
    void handleUserSelection(launch.bot, launch.userEmail, launch.hideBotAgentUi, launch.notifyProgress);
  };

  const changeOptions = (launch: RecentLaunch) => {
    setRepeatLaunch(null);
    setPrefillInputs(launch.botInputs);
    setSheetOptions({ hideBotAgentUi: launch.hideBotAgentUi, notifyProgress: launch.notifyProgress });
    setSelectedBot(launch.bot);
    setModalVisible(true);
  };

  // Favorites and recent launches, at the top of the root folder (hidden while searching).
  const showShortcuts = currentPath.length === 1 && !query.trim();
  const accountLabel = (email: string) => AVAILABLE_USERS.find(u => u.email === email)?.label ?? email;
  const shortcuts = showShortcuts && (favorites.length > 0 || recents.length > 0) && (
    <div className="mb-3 space-y-3">
      {favorites.length > 0 && (
        <Panel header="Favorites">
          {favorites.map(bot => (
            <BotCard
              key={bot.name}
              bot={bot}
              isExecuting={executingBots.has(bot.id)}
              isDisabled={executingBots.has(bot.id) || loading}
              onPress={() => openRunSheet(bot)}
              lastRun={lastRunByName.get(bot.name)}
              favorite
            />
          ))}
        </Panel>
      )}
      {recents.length > 0 && (
        <Panel header="Recent, tap to run again">
          {recents.map(r => (
            <button
              key={r.bot.name}
              data-row
              onClick={() => setRepeatLaunch(r)}
              disabled={loading}
              aria-label={`Run ${r.bot.name} again on ${accountLabel(r.userEmail)}`}
              className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left active:bg-page disabled:opacity-60"
            >
              <History size={20} className="shrink-0 text-muted" strokeWidth={1.75} />
              <span className="min-w-0 flex-1">
                <span className="block break-words text-[0.9375rem] text-ink">{r.bot.name}</span>
                <span className="block truncate text-[0.8125rem] text-muted">
                  On {accountLabel(r.userEmail)}, {formatRelative(new Date(r.at).toISOString())}
                </span>
              </span>
            </button>
          ))}
        </Panel>
      )}
    </div>
  );

  let content: React.ReactNode;
  if (botsLoading) {
    content = <SkeletonRows label="Loading bots" />;
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
        {currentPath.length > 1 && <Breadcrumb path={currentPath} onNavigate={navigateToBreadcrumb} />}
        <div className="flex-1 overflow-y-auto">
          <div ref={listRef} className="mx-auto w-full max-w-3xl p-3 safe-bottom">
            {bots.length > 0 && (
              <div className="relative mb-3">
                <Search
                  aria-hidden
                  size={18}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                />
                <input
                  type="search"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search this folder"
                  aria-label="Search bots and folders in this folder"
                  enterKeyHint="search"
                  autoComplete="off"
                  className="min-h-11 w-full rounded-md border border-line bg-surface pl-10 pr-3 text-[0.9375rem] text-ink outline-none placeholder:text-muted focus:border-brand-strong focus:ring-2 focus:ring-brand/30"
                />
              </div>
            )}
            {shortcuts}
            {bots.length === 0 ? (
              <p className="px-2 py-10 text-muted">This folder is empty.</p>
            ) : visibleBots.length === 0 ? (
              <div className="px-2 py-10">
                <p className="text-ink">Nothing in this folder matches "{query.trim()}".</p>
                <button onClick={() => setQuery('')} className={`${buttonStyles.ghost} -ml-2 mt-1 text-brand-strong`}>
                  Clear search
                </button>
              </div>
            ) : (
              <Panel header={<span aria-live="polite">{listSummary}</span>}>
                {visibleBots.map(item => (
                  <BotCard
                    key={item.id}
                    bot={item}
                    isExecuting={executingBots.has(item.id)}
                    isDisabled={executingBots.has(item.id) || loading}
                    onPress={() => openRunSheet(item)}
                    onFolderPress={navigateToFolder}
                    lastRun={lastRunByName.get(item.name)}
                    favorite={isFavorite(favorites, item)}
                  />
                ))}
              </Panel>
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
        onUserSelect={(userEmail, hideBotAgentUi, notifyProgress) =>
          selectedBot && handleUserSelection(selectedBot, userEmail, hideBotAgentUi, notifyProgress)
        }
        onClose={() => setModalVisible(false)}
        initialOptions={sheetOptions}
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
        initialInputs={prefillInputs}
      />

      <RepeatLaunchModal
        launch={repeatLaunch}
        onRunAgain={runAgain}
        onChangeOptions={changeOptions}
        onClose={() => setRepeatLaunch(null)}
      />

      <BotExecutionSuccessModal
        visible={successModalVisible}
        botName={executionResult?.botName || ''}
        deploymentId={executionResult?.deploymentId || ''}
        notifying={!!executionResult?.notifying}
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
