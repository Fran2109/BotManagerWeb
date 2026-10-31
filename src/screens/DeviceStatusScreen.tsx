import React, { useCallback, useEffect, useState } from 'react';
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
import { Spinner, initials } from '../components/ui';
import { User } from '../types';
import { getToken, getDeviceInfo, resetDevice, invalidateCachedDevice } from '../Functions';
import { deviceAutomationBot } from '../utils/deviceAutomationBot';
import { SummaryHeader } from './SummaryHeader';

interface DeviceStatusItemProps {
  user: User;
  index: number;
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
  index,
  onResetDevice,
  onShutdown,
  onScreenshot,
  isResetting,
  isShutdownRunning,
  isScreenshotRunning,
  automationBusy,
}) => {
  const statusColor = user.checkingDevice ? '#f0ad4e' : user.deviceConnected ? '#28a745' : '#dc3545';
  const statusLabel = user.checkingDevice ? 'Checking' : user.deviceConnected ? 'Connected' : 'Disconnected';
  const canUseDeviceActions = !!user.deviceConnected && !user.checkingDevice && !automationBusy;

  const actionButton = (
    label: string,
    onPress: () => void,
    running: boolean,
    color: string,
    tint: string,
    Icon: React.FC<{ size?: number; color?: string; strokeWidth?: number }>,
  ) => {
    const enabled = canUseDeviceActions && !running;
    return (
      <button
        onClick={onPress}
        disabled={!enabled}
        aria-label={label}
        title={label}
        className="flex size-12 items-center justify-center rounded-xl border transition active:scale-90"
        style={
          enabled
            ? { backgroundColor: tint, borderColor: `${color}55` }
            : { backgroundColor: '#f1f3f5', borderColor: '#e9ecef' }
        }
      >
        {running ? (
          <Spinner className="size-5" color={color} />
        ) : (
          <Icon size={22} color={canUseDeviceActions ? color : '#adb5bd'} strokeWidth={2.25} />
        )}
      </button>
    );
  };

  return (
    <div
      className="rounded-2xl border border-line bg-white p-4 shadow-sm animate-slide-in"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          <div
            className={`flex size-12 items-center justify-center rounded-full font-bold text-ink-soft ${
              user.deviceConnected ? 'bg-success/15' : 'bg-danger/10'
            }`}
          >
            {initials(user.label)}
          </div>
          {user.deviceConnected && !user.checkingDevice && (
            <span className="absolute -bottom-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full border-2 border-white bg-success text-[10px] font-bold text-white">
              ✓
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate font-bold text-ink">{user.label}</p>
            <span
              className="flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
              style={{ color: statusColor, backgroundColor: `${statusColor}1a` }}
            >
              {user.checkingDevice ? (
                <Spinner className="size-3" color={statusColor} />
              ) : (
                <span className="size-2 rounded-full" style={{ backgroundColor: statusColor }} />
              )}
              {statusLabel}
            </span>
          </div>
          <p className="truncate text-sm text-muted">{user.email}</p>
          {user.deviceConnected && !user.checkingDevice && user.primaryDeviceId ? (
            <p className="truncate font-mono text-xs text-gray-400">ID {user.primaryDeviceId}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex justify-end gap-2 border-t border-line pt-3">
        {actionButton('Shutdown device', () => onShutdown(user), isShutdownRunning, '#c0392b', '#fff5f5', Power)}
        {actionButton('Device screenshot', () => onScreenshot(user), isScreenshotRunning, '#007bff', '#f0f7ff', Camera)}
        {actionButton('Reset device', () => onResetDevice(user), isResetting, '#e74c3c', '#fdf2f2', RefreshCw)}
      </div>
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
      setErrorMessage(`Failed to reset device for ${user.label}: ${error.message}`);
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

  // Initial check, then refresh silently every 5 seconds while this screen is mounted.
  useEffect(() => {
    checkDevicesStatus(AVAILABLE_USERS, false);
    const interval = setInterval(() => {
      checkDevicesStatus(AVAILABLE_USERS, true);
    }, 5000);
    return () => clearInterval(interval);
  }, [checkDevicesStatus]);

  const lastUpdatedLabel =
    lastCheckedAt != null
      ? `Updated ${new Date(lastCheckedAt).toLocaleTimeString(undefined, {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })}`
      : null;

  const connectedCount = usersWithDeviceStatus.filter(user => user.deviceConnected).length;
  const totalCount = usersWithDeviceStatus.length;
  const checkingCount = usersWithDeviceStatus.filter(user => user.checkingDevice).length;

  return (
    <ScreenWrapper>
      <div className="flex min-h-0 flex-1 flex-col animate-fade-in">
        <SummaryHeader
          title="Device Connection Status"
          subtitle="Monitor all account device connections"
          items={[
            { value: connectedCount, label: 'Connected', color: '#28a745' },
            { value: totalCount - connectedCount - checkingCount, label: 'Disconnected', color: '#dc3545' },
            { value: checkingCount, label: 'Checking', color: '#ffc107' },
          ]}
        />

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl p-4 safe-bottom">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-ink">All Accounts</h3>
                {lastUpdatedLabel ? <p className="text-xs text-muted">{lastUpdatedLabel}</p> : null}
              </div>
              <button
                onClick={handleRefresh}
                disabled={checkingCount > 0}
                className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow transition active:scale-95 disabled:bg-primary/60"
              >
                <RefreshCw size={16} className={checkingCount > 0 ? 'animate-spin' : ''} />
                {checkingCount > 0 ? 'Checking...' : 'Refresh All'}
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {usersWithDeviceStatus.map((item, index) => {
                const shutdownId = deviceAutomationBot(item.id, DEVICE_SHUTDOWN_BOT_TASK, 'shutdown').id;
                const screenshotId = deviceAutomationBot(item.id, DEVICE_SCREENSHOT_BOT_TASK, 'screenshot').id;
                return (
                  <DeviceStatusItem
                    key={item.id}
                    user={item}
                    index={index}
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
            </div>
          </div>
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
        title="Success"
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
        title="Error"
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
