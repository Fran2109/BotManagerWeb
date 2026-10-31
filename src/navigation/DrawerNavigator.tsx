import React, { useRef, useState } from 'react';
import { Bot, Activity, History, MonitorSmartphone } from 'lucide-react';
import logo from '../assets/Logo.jpg';
import { BotManagerScreen, DeviceStatusScreen, InProgressScreen, HistoricalScreen } from '../screens';
import { gsap, motionDuration, useGSAP } from '../lib/motion';
import { useBackHandler } from './backHandler';
import { DrawerContext } from './drawerContext';

// Replaces @react-navigation/drawer: one screen is mounted at a time, so leaving a
// screen unmounts it (equivalent to the old useFocusEffect cleanups).
type RouteName = 'BotManager' | 'InProgress' | 'Historical' | 'DeviceStatus';

const ROUTES: { name: RouteName; label: string; Icon: React.FC<{ size?: number }>; Screen: React.FC }[] = [
  { name: 'BotManager', label: 'Bots', Icon: Bot, Screen: BotManagerScreen },
  { name: 'InProgress', label: 'Running now', Icon: Activity, Screen: InProgressScreen },
  { name: 'Historical', label: 'History', Icon: History, Screen: HistoricalScreen },
  { name: 'DeviceStatus', label: 'Devices', Icon: MonitorSmartphone, Screen: DeviceStatusScreen },
];

export const DrawerNavigator = () => {
  const [route, setRoute] = useState<RouteName>('BotManager');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  useBackHandler(() => {
    setIsDrawerOpen(false);
    return true;
  }, isDrawerOpen);

  useGSAP(
    () => {
      const duration = firstRender.current ? 0 : motionDuration(0.32);
      firstRender.current = false;
      gsap.to(navRef.current, {
        xPercent: isDrawerOpen ? 0 : -100,
        duration,
        ease: isDrawerOpen ? 'power3.out' : 'power2.in',
      });
      gsap.to(scrimRef.current, {
        autoAlpha: isDrawerOpen ? 1 : 0,
        duration: duration ? 0.25 : 0,
      });
      if (isDrawerOpen) {
        gsap.from(navRef.current!.querySelectorAll('[data-nav-item]'), {
          x: motionDuration(-16),
          opacity: 0,
          duration: motionDuration(0.3),
          stagger: motionDuration(0.04),
          delay: motionDuration(0.08),
          ease: 'power2.out',
        });
      }
    },
    { dependencies: [isDrawerOpen] },
  );

  const { Screen } = ROUTES.find(r => r.name === route)!;

  return (
    <DrawerContext.Provider value={{ isDrawerOpen, toggleDrawer: () => setIsDrawerOpen(o => !o) }}>
      <div className="flex h-full flex-col">
        <Screen key={route} />
      </div>

      <div
        ref={scrimRef}
        className="invisible fixed inset-0 z-40 bg-ink/50 opacity-0"
        onClick={() => setIsDrawerOpen(false)}
      />
      <nav
        ref={navRef}
        aria-label="Main"
        inert={!isDrawerOpen}
        // Positioned by GSAP (xPercent); a Tailwind translate class would stack with it.
        className="fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-ink text-panel safe-top"
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-6">
          <img src={logo} alt="" className="size-11 rounded-lg bg-white object-contain p-1" />
          <div>
            <p className="font-display text-xl font-bold leading-tight">Bot Manager</p>
            <p className="text-sm text-panel/60">Automation Anywhere</p>
          </div>
        </div>
        <ul className="flex flex-col gap-1 p-3">
          {ROUTES.map(({ name, label, Icon }) => {
            const active = name === route;
            return (
              <li key={name} data-nav-item>
                <button
                  onClick={() => {
                    setRoute(name);
                    setIsDrawerOpen(false);
                  }}
                  aria-current={active ? 'page' : undefined}
                  className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-[17px] font-medium transition-colors ${
                    active ? 'bg-signal text-ink' : 'text-panel/80 active:bg-white/10'
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
