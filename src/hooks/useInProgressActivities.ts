import { useState, useCallback } from 'react';
import { User, UserWithActivity, ActivityItem } from '../types';
import { getToken, getRunningActivities } from '../Functions';
import { DEFAULT_PASSWORD } from '../constants/users';

export const useInProgressActivities = () => {
  const [usersWithActivities, setUsersWithActivities] = useState<UserWithActivity[]>([]);

  const checkActivitiesStatus = useCallback(async (users: User[], silent: boolean = false) => {
    // Initialize users with checking state only if not silent
    if (!silent) {
      const usersChecking = users.map(user => ({
        ...user,
        checkingActivity: true,
        activity: undefined
      }));
      setUsersWithActivities(usersChecking);
    }

    // Check each user's running activities in parallel
    const activityChecks = users.map(async (user) => {
      try {
        const token = await getToken(user.email, DEFAULT_PASSWORD);
        const activities = await getRunningActivities(user.email, token);
        
        return {
          ...user,
          activity: activities.length > 0 ? activities[0] : undefined,
          checkingActivity: false
        };
      } catch (error) {
        console.error(`Error checking activities for ${user.email}:`, error);
        return {
          ...user,
          activity: undefined,
          checkingActivity: false
        };
      }
    });

    try {
      const results = await Promise.all(activityChecks);
      setUsersWithActivities(results);
    } catch (error) {
      console.error('Error checking activities:', error);
      // If there's an error and not silent, mark all as not checking
      if (!silent) {
        const usersWithError = users.map(user => ({
          ...user,
          checkingActivity: false,
          activity: undefined
        }));
        setUsersWithActivities(usersWithError);
      }
    }
  }, []);

  const getUsersWithRunningBots = useCallback(() => {
    return usersWithActivities.filter(user => user.activity !== undefined);
  }, [usersWithActivities]);

  const getTotalRunningBots = useCallback(() => {
    return usersWithActivities.filter(user => user.activity !== undefined).length;
  }, [usersWithActivities]);

  return {
    usersWithActivities,
    checkActivitiesStatus,
    getUsersWithRunningBots,
    getTotalRunningBots,
  };
};