import React, { useCallback, useRef, useState } from 'react';
import { Power, Camera, RefreshCw } from 'lucide-react';
import { AVAILABLE_USERS, DEFAULT_PASSWORD } from '../constants/users';
import { DEVICE_SHUTDOWN_BOT_TASK, DEVICE_SCREENSHOT_BOT_TASK } from '../constants/deviceAutomationBots';
import { useDeviceStatus } from '../hooks/useDeviceStatus';
import { useBotExecution } from '../hooks/useBotExecution';
import {
  ScreenWrapper,
  DeviceActionConfirmModal,
  type DeviceConfirmActionKind,
  SuccessModal,
  ErrorModal,
  LoadingModal,
} from '../components';
import { ScreenTitle } from '../components/ScreenWrapper';
import { Lamp, Panel, RefreshButton, Spinner, StatusBadge, useListEntrance } from '../components/ui';
import { usePolling } from '../hooks/usePolling';
import { User } from '../types';
import { getToken, getDeviceInfo, resetDevice, invalidateCachedDevice } from '../Functions';
import { deviceAutomationBot } from '../utils/deviceAutomationBot';
import { StatusStrip } from './SummaryHeader';
import { describeError } from '../lib/errors';

interface DeviceStatusItemProps {
  user: User;
  onResetDevice: (user: User) => void;
  onShutdown: (user: User) => void;
  onScreenshot: (user: User) => void;
  isResetting: boolean;
  isShutdownRunning: boolean;
  isScreenshotRunning: boolean;
  automationBusy: boolean;
}

const DeviceStatusItem: React.FC<DeviceStatusItemProps> = ({
  user,
  onResetDevice,
  onShutdown,
  onScreenshot,
  isResetting,
  isShutdownRunning,
  isScreenshotRunning,
  automationBusy,
}) => {
  const statusLabel = user.checkingDevice ? 'Checking' : user.deviceConnected ? 'Connected' : 'Disconnected';
  const canUseDeviceActions = !!user.deviceConnected && !user.checkingDevice && !automationBusy;

  const actionButton = (
    label: string,
    onPress: () => void,
    running: boolean,
    Icon: typeof Power,
    tone: 'stop' | 'ink',
  ) => {
    const enabled = canUseDeviceActions && !running;
    return (
      <button
        onClick={onPress}
        disabled={!enabled}
        className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-1 rounded-md border px-1 py-2 text-[0.8125rem] font-semibold leading-none transition-colors active:bg-page disabled:border-line disabled:text-muted/50 ${
          tone === 'stop' ? 'border-fail/40 text-fail' : 'border-line text-ink'
        }`}
      >
        {running ? <Spinner className="size-4" /> : <Icon size={17} strokeWidth={2.25} />}
        {label}
      </button>
    );
  };

  return (
    // Landscape: identity on the left, actions on the right, so a row is one line tall.
    <div data-row className="px-4 py-3.5 land:flex land:items-center land:gap-4 land:py-2.5">
      <div className="flex min-w-0 items-center gap-3 land:flex-1">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">{user.label}</p>
          <p className="truncate text-sm text-muted">{user.email}</p>
          {user.deviceConnected && !user.checkingDevice && user.primaryDeviceId ? (
            <p className="text-sm text-muted">Device ID {user.primaryDeviceId}</p>
          ) : null}
        </div>
        <StatusBadge
          tone={user.checkingDevice ? 'warn' : user.deviceConnected ? 'ok' : 'fail'}
          icon={<Lamp state={user.checkingDevice ? 'wait' : user.deviceConnected ? 'on' : 'off'} className="size-2" />}
        >
          {statusLabel}
        </StatusBadge>
      </div>

      <div className="mt-3 flex gap-2 land:mt-0 land:w-72 land:shrink-0">
        {actionButton('Screenshot', () => onScreenshot(user), isScreenshotRunning, Camera, 'ink')}
        {actionButton('Reset', () => onResetDevice(user), isResetting, RefreshCw, 'ink')}
        {actionButton('Shut down', () => onShutdown(user), isShutdownRunning, Power, 'stop')}
      </div>
      {!user.checkingDevice && !user.deviceConnected && (
        <p className="mt-2 text-sm text-muted land:sr-only">Actions are available when the device is connected.</p>
      )}
    </div>
  );
};


export const DeviceStatusScreen = () => {
  const { usersWithDeviceStatus, checkDevicesStatus, lastCheckedAt } = useDeviceStatus(AVAILABLE_USERS);
  const {
    executeBot,
    loading: automationLoading,
    loadingMessage: automationLoadingMessage,
    executingBots,
  } = useBotExecution();
  const [resettingUsers, setResettingUsers] = useState<Set<number>>(new Set());
  const [confirmKind, setConfirmKind] = useState<DeviceConfirmActionKind | null>(null);
  const [confirmUser, setConfirmUser] = useState<User | null>(null);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleRefresh = () => {
    setResettingUsers(new Set());
    setConfirmKind(null);
    setConfirmUser(null);
    setSuccessModalVisible(false);
    setErrorModalVisible(false);
    setSuccessMessage('');
    setErrorMessage('');
    checkDevicesStatus(AVAILABLE_USERS, false);
  };

  const openDeviceConfirm = (kind: DeviceConfirmActionKind, user: User) => {
    setConfirmKind(kind);
    setConfirmUser(user);
  };

  const closeDeviceConfirm = () => {
    setConfirmKind(null);
    setConfirmUser(null);
  };

  const executeResetForUser = useCallback(async (user: User) => {
    setResettingUsers(prev => new Set(prev).add(user.id));
    const clearResetting = () =>
      setResettingUsers(prev => {
        const next = new Set(prev);
        next.delete(user.id);
        return next;
      });
    try {
      const token = await getToken(user.email, DEFAULT_PASSWORD);
      const deviceInfo = await getDeviceInfo(token, user.email);
      await resetDevice(deviceInfo.id, token, user.email);
      invalidateCachedDevice(user.email);
      clearResetting();
      setSuccessMessage(`Device reset successfully for ${user.label}`);
      setSuccessModalVisible(true);
    } catch (error: any) {
      invalidateCachedDevice(user.email);
      clearResetting();
      setErrorMessage(`Couldn't reset ${user.label}'s device. ${describeError(error)}`);
      setErrorModalVisible(true);
    }
  }, []);

  const runDeviceAutomation = useCallback(
    (user: User, action: 'shutdown' | 'screenshot') => {
      const taskName = action === 'shutdown' ? DEVICE_SHUTDOWN_BOT_TASK : DEVICE_SCREENSHOT_BOT_TASK;
      const bot = deviceAutomationBot(user.id, taskName, action);
      executeBot(
        bot,
        user.email,
        () => {
          setSuccessMessage(
            action === 'shutdown' ? `Shutdown sent for ${user.label}` : `Screenshot bot started for ${user.label}`,
          );
          setSuccessModalVisible(true);
        },
        msg => {
          setErrorMessage(msg);
          setErrorModalVisible(true);
        },
        () => {
          setErrorMessage(`Device not connected for ${user.label}. Connect the runner before running this action.`);
          setErrorModalVisible(true);
        },
        (botName, userEmail) => {
          const u = AVAILABLE_USERS.find(x => x.email === userEmail);
          setErrorMessage(`Bot "${botName}" was not found in ${u?.label ?? userEmail}'s Control Room.`);
          setErrorModalVisible(true);
        },
        { hideBotAgentUi: true },
      );
    },
    [executeBot],
  );

  const handleConfirmDeviceAction = () => {
    if (!confirmUser || !confirmKind) {
      return;
    }
    const user = confirmUser;
    const kind = confirmKind;
    closeDeviceConfirm();
    if (kind === 'reset') {
      void executeResetForUser(user);
    } else {
      runDeviceAutomation(user, kind);
    }
  };

  // Every 5 seconds while the app is visible; paused in the background.
  usePolling(silent => checkDevicesStatus(AVAILABLE_USERS, silent), 5000);


  const lastUpdatedLabel =
    lastCheckedAt != null
      ? `Updated ${new Date(lastCheckedAt).toLocaleTimeString(undefined, {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })}, refreshes every 5 s`
      : 'Refreshes every 5 s';

  const connectedCount = usersWithDeviceStatus.filter(user => user.deviceConnected).length;
  const totalCount = usersWithDeviceStatus.length;
  const checkingCount = usersWithDeviceStatus.filter(user => user.checkingDevice).length;

  const listRef = useRef<HTMLDivElement>(null);
  useListEntrance(listRef, totalCount > 0);

  return (
    <ScreenWrapper>
      <div className="flex-1 overflow-y-auto">
        <div ref={listRef} className="mx-auto w-full max-w-3xl safe-bottom">
          <ScreenTitle
            title="Devices"
            subtitle={lastUpdatedLabel}
            action={
              <RefreshButton onClick={handleRefresh} busy={checkingCount > 0} label="Check all" busyLabel="Checking" />
            }
          />
          <StatusStrip
            items={[
              { value: connectedCount, label: 'Connected', lamp: 'on' },
              { value: totalCount - connectedCount - checkingCount, label: 'Disconnected', lamp: 'off' },
              { value: checkingCount, label: 'Checking', lamp: 'wait' },
            ]}
          />
          <Panel className="mx-3 mb-4" header="Accounts and their devices">
            {usersWithDeviceStatus.map(item => {
              const shutdownId = deviceAutomationBot(item.id, DEVICE_SHUTDOWN_BOT_TASK, 'shutdown').id;
              const screenshotId = deviceAutomationBot(item.id, DEVICE_SCREENSHOT_BOT_TASK, 'screenshot').id;
              return (
                <DeviceStatusItem
                  key={item.id}
                  user={item}
                  onResetDevice={u => openDeviceConfirm('reset', u)}
                  onShutdown={u => openDeviceConfirm('shutdown', u)}
                  onScreenshot={u => openDeviceConfirm('screenshot', u)}
                  isResetting={resettingUsers.has(item.id)}
                  isShutdownRunning={executingBots.has(shutdownId)}
                  isScreenshotRunning={executingBots.has(screenshotId)}
                  automationBusy={automationLoading}
                />
              );
            })}
          </Panel>
        </div>
      </div>


      <LoadingModal visible={automationLoading} message={automationLoadingMessage} />

      <DeviceActionConfirmModal
        visible={!!confirmKind && !!confirmUser}
        kind={confirmKind}
        userLabel={confirmUser?.label ?? ''}
        onConfirm={handleConfirmDeviceAction}
        onCancel={closeDeviceConfirm}
      />

      <SuccessModal
        visible={successModalVisible}
        title="Done"
        message={successMessage}
        onConfirm={() => {
          setSuccessModalVisible(false);
          setSuccessMessage('');
          // Small delay before refresh to ensure modal state is cleared
          setTimeout(() => {
            handleRefresh();
          }, 100);
        }}
      />

      <ErrorModal
        visible={errorModalVisible}
        title="That didn't work"
        message={errorMessage}
        onConfirm={() => {
          setErrorModalVisible(false);
          setErrorMessage('');
          setResettingUsers(new Set());
        }}
      />
    </ScreenWrapper>
  );
};
