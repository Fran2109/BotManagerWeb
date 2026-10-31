import React, { useEffect, useRef, useState } from 'react';
import { Bot, Activity, ChartColumn, History, MonitorSmartphone } from 'lucide-react';
import logo from '../assets/Logo.jpg';
import { BotManagerScreen, DeviceStatusScreen, InProgressScreen, HistoricalScreen, StatisticsScreen } from '../screens';
import { gsap, motionDuration, useGSAP } from '../lib/motion';
import { useBackHandler } from './backHandler';
import { DrawerContext, ROUTE_META, RouteName } from './drawerContext';
import { initRunTracker } from '../lib/runTracker';

// Replaces @react-navigation/drawer: one screen is mounted at a time, so leaving a
// screen unmounts it (equivalent to the old useFocusEffect cleanups). The drawer is
// styled after the Control Room's navigation pane, grouped the same way.
const SCREENS: Record<RouteName, { Icon: React.FC<{ size?: number }>; Screen: React.FC }> = {
  Bots: { Icon: Bot, Screen: BotManagerScreen },
  InProgress: { Icon: Activity, Screen: InProgressScreen },
  Historical: { Icon: History, Screen: HistoricalScreen },
  Statistics: { Icon: ChartColumn, Screen: StatisticsScreen },
  Devices: { Icon: MonitorSmartphone, Screen: DeviceStatusScreen },
};

const GROUPS: { title: string; routes: RouteName[] }[] = [
  { title: 'Automation', routes: ['Bots'] },
  { title: 'Activity', routes: ['InProgress', 'Historical', 'Statistics'] },
  { title: 'Manage', routes: ['Devices'] },
];

export const DrawerNavigator = () => {
  const [route, setRoute] = useState<RouteName>('Bots');
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
      const duration = firstRender.current ? 0 : motionDuration(0.28);
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
    },
    { dependencies: [isDrawerOpen] },
  );

  const navigate = (next: RouteName) => {
    setRoute(next);
    setIsDrawerOpen(false);
  };

  // Tapping a bot notification opens its screen; runs followed before the app was closed
  // are picked up again.
  useEffect(() => {
    void initRunTracker(next => {
      setRoute(next);
      setIsDrawerOpen(false);
    });
  }, []);

  const { Screen } = SCREENS[route];

  return (
    <DrawerContext.Provider
      value={{ route, navigate, isDrawerOpen, toggleDrawer: () => setIsDrawerOpen(o => !o) }}
    >
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
        className="fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-nav text-white safe-top"
        // At most 85% of the screen, so a sliver of the page stays visible with large text.
        style={{ paddingLeft: 'var(--inset-left)', width: 'min(calc(18rem + var(--inset-left)), 85vw)' }}
      >
        <div className="flex items-center gap-3 px-5 py-5 land:py-3">
          <img src={logo} alt="" className="size-9 rounded-md bg-white object-contain p-0.5" />
          <div>
            <p className="font-semibold leading-tight">Bot Manager</p>
            <p className="text-sm text-white/60">Automation Anywhere</p>
          </div>
        </div>
        <div className="brand-line h-0.5" />

        <div className="flex-1 overflow-y-auto py-3">
          {GROUPS.map(group => (
            <div key={group.title} className="mb-3">
              <p className="px-5 pb-1 pt-2 text-sm font-medium text-white/50">{group.title}</p>
              <ul>
                {group.routes.map(name => {
                  const { Icon } = SCREENS[name];
                  const active = name === route;
                  return (
                    <li key={name}>
                      <button
                        onClick={() => navigate(name)}
                        aria-current={active ? 'page' : undefined}
                        className={`relative flex min-h-12 w-full items-center gap-3 px-5 text-left text-[0.9375rem] transition-colors ${
                          active ? 'bg-nav-soft font-semibold text-white' : 'text-white/80 active:bg-white/10'
                        }`}
                      >
                        {active && <span aria-hidden className="brand-line absolute inset-y-0 left-0 w-1" />}
                        <Icon size={20} />
                        {ROUTE_META[name].label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </nav>
    </DrawerContext.Provider>
  );
};
