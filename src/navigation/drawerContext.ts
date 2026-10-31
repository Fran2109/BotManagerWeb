import { createContext, useContext } from 'react';

// Kept apart from DrawerNavigator so Header and screens can use it without an import
// cycle (DrawerNavigator -> screens -> Header -> DrawerNavigator).
export type RouteName = 'Bots' | 'InProgress' | 'Historical' | 'Devices';

/** Sections and labels mirror the Automation Anywhere Control Room navigation. */
export const ROUTE_META: Record<RouteName, { group: string; label: string }> = {
  Bots: { group: 'Automation', label: 'Bots' },
  InProgress: { group: 'Activity', label: 'In progress' },
  Historical: { group: 'Activity', label: 'Historical' },
  Devices: { group: 'Manage', label: 'Devices' },
};

interface DrawerContextValue {
  route: RouteName;
  navigate: (route: RouteName) => void;
  isDrawerOpen: boolean;
  toggleDrawer: () => void;
}

export const DrawerContext = createContext<DrawerContextValue>({
  route: 'Bots',
  navigate: () => {},
  isDrawerOpen: false,
  toggleDrawer: () => {},
});

export const useDrawer = () => useContext(DrawerContext);
