import { useCallback, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { DEFAULT_PASSWORD } from '../constants/users';
import { getControlRoomUrl } from '../Functions';
import { BotManagerNative } from './nativePlugin';
import { ensureNotifications } from './runTracker';
import type { User } from '../types';

/**
 * PC disconnection alerts: the phone checks each watched account's device about every
 * 15 minutes (DeviceWatcher.java) and notifies when it disconnects or comes back, even
 * with the app closed. Android only.
 */
export const deviceAlertsSupported = () => Capacitor.getPlatform() === 'android';

/** Emails of the accounts with alerts on, and a setter that asks for notification permission. */
export const useDeviceAlerts = () => {
  const [watched, setWatched] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!deviceAlertsSupported()) return;
    const { accounts } = await BotManagerNative.getDeviceAlerts();
    setWatched(new Set(accounts.filter(a => a.enabled).map(a => a.email)));
  }, []);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  /** Returns false when notifications are blocked (the alert stays off). */
  const setAlert = useCallback(async (user: User, enabled: boolean) => {
    if (enabled && !(await ensureNotifications().catch(() => false))) return false;
    await BotManagerNative.setDeviceAlert({
      email: user.email,
      label: user.label,
      password: DEFAULT_PASSWORD,
      baseUrl: getControlRoomUrl(user.email),
      enabled,
    });
    setWatched(prev => {
      const next = new Set(prev);
      if (enabled) next.add(user.email);
      else next.delete(user.email);
      return next;
    });
    return true;
  }, []);

  return { watched, setAlert };
};
