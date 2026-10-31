import { useEffect } from 'react';
import { DrawerNavigator } from './navigation/DrawerNavigator';
import { getToken, getUserId, getDeviceInfo } from './Functions';
import { AVAILABLE_USERS, DEFAULT_PASSWORD } from './constants/users';

const App = () => {
  // Warm up tokens, user IDs and devices for every account.
  useEffect(() => {
    Promise.allSettled(
      AVAILABLE_USERS.map(async u => {
        const token = await getToken(u.email, DEFAULT_PASSWORD);
        await Promise.allSettled([getUserId(token, u.email), getDeviceInfo(token, u.email)]);
      }),
    );
  }, []);

  return <DrawerNavigator />;
};

export default App;
