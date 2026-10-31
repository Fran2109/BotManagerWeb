import React, { useState } from 'react';
import { Bot, Activity, History, MonitorSmartphone } from 'lucide-react';
import logo from '../assets/Logo.jpg';
import { BotManagerScreen, DeviceStatusScreen, InProgressScreen, HistoricalScreen } from '../screens';
import { useBackHandler } from './backHandler';
import { DrawerContext } from './drawerContext';

// Replaces @react-navigation/drawer: one screen is mounted at a time, so leaving a
// screen unmounts it (equivalent to the old useFocusEffect cleanups).
type RouteName = 'BotManager' | 'InProgress' | 'Historical' | 'DeviceStatus';

const ROUTES: { name: RouteName; label: string; Icon: React.FC<{ size?: number }>; Screen: React.FC }[] = [
  { name: 'BotManager', label: 'Bot Manager', Icon: Bot, Screen: BotManagerScreen },
  { name: 'InProgress', label: 'In Progress', Icon: Activity, Screen: InProgressScreen },
  { name: 'Historical', label: 'History', Icon: History, Screen: HistoricalScreen },
  { name: 'DeviceStatus', label: 'Device Status', Icon: MonitorSmartphone, Screen: DeviceStatusScreen },
];

export const DrawerNavigator = () => {
  const [route, setRoute] = useState<RouteName>('BotManager');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useBackHandler(() => {
    setIsDrawerOpen(false);
    return true;
  }, isDrawerOpen);

  const { Screen } = ROUTES.find(r => r.name === route)!;

  return (
    <DrawerContext.Provider value={{ isDrawerOpen, toggleDrawer: () => setIsDrawerOpen(o => !o) }}>
      <div className="flex h-full flex-col">
        <Screen key={route} />
      </div>

      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity ${
          isDrawerOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => setIsDrawerOpen(false)}
      />
      <nav
        className={`fixed inset-y-0 left-0 z-40 flex w-70 flex-col bg-white transition-transform duration-300 safe-top ${
          isDrawerOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
        aria-hidden={!isDrawerOpen}
      >
        <div className="flex flex-col items-center border-b border-line px-5 pb-6 pt-8">
          <img src={logo} alt="" className="mb-3 size-16 rounded-2xl object-contain" />
          <p className="text-lg font-bold text-ink">Bot Manager</p>
          <p className="text-sm text-muted">Automation Anywhere</p>
        </div>
        <ul className="flex flex-col gap-1 p-3">
          {ROUTES.map(({ name, label, Icon }) => {
            const active = name === route;
            return (
              <li key={name}>
                <button
                  onClick={() => {
                    setRoute(name);
                    setIsDrawerOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-base font-medium transition ${
                    active ? 'bg-primary/10 text-primary' : 'text-muted hover:bg-surface'
                  }`}
                >
                  <Icon size={20} />
                  {label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </DrawerContext.Provider>
  );
};
