import { useState, useCallback } from 'react';
import { User } from '../types';
import { getToken, getDeviceStatus, getCachedPrimaryDevice } from '../Functions';
import { DEFAULT_PASSWORD } from '../constants/users';

export const useDeviceStatus = (initialUsers?: User[]) => {
  const [usersWithDeviceStatus, setUsersWithDeviceStatus] = useState<User[]>(
    () =>
      initialUsers?.map((user) => ({
        ...user,
        checkingDevice: true,
        deviceConnected: false,
      })) ?? [],
  );
  const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(null);

  const checkDevicesStatus = useCallback(async (users: User[], silent: boolean = false) => {
    // Initialize users with checking state only if not silent
    if (!silent) {
      const usersChecking = users.map(user => ({
        ...user,
        checkingDevice: true,
        deviceConnected: false
      }));
      setUsersWithDeviceStatus(usersChecking);
    }

    // Check each user's device status in parallel
    const deviceChecks = users.map(async (user) => {
      try {
        const token = await getToken(user.email, DEFAULT_PASSWORD);
        const deviceStatus = await getDeviceStatus(user.email, token);
        const cachedDevice = getCachedPrimaryDevice(user.email);
        return {
          ...user,
          deviceConnected: deviceStatus === 'CONNECTED',
          checkingDevice: false,
          primaryDeviceId: cachedDevice?.id,
        };
      } catch (error) {
        console.error(`Error checking device for ${user.email}:`, error);
        return {
          ...user,
          deviceConnected: false,
          checkingDevice: false
        };
      }
    });

    try {
      const results = await Promise.all(deviceChecks);
      setUsersWithDeviceStatus(results);
      setLastCheckedAt(Date.now());
    } catch (error) {
      console.error('Error checking device statuses:', error);
      // If there's an error and not silent, mark all as not checking and disconnected
      if (!silent) {
        const usersWithError = users.map(user => ({
          ...user,
          checkingDevice: false,
          deviceConnected: false
        }));
        setUsersWithDeviceStatus(usersWithError);
        setLastCheckedAt(Date.now());
      }
    }
  }, []);

  return {
    usersWithDeviceStatus,
    checkDevicesStatus,
    lastCheckedAt,
  };
};