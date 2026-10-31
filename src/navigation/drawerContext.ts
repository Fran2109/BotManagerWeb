import { createContext, useContext } from 'react';

// Kept apart from DrawerNavigator so Header can use it without an import cycle
// (DrawerNavigator -> screens -> Header -> DrawerNavigator).
interface DrawerContextValue {
  isDrawerOpen: boolean;
  toggleDrawer: () => void;
}

export const DrawerContext = createContext<DrawerContextValue>({ isDrawerOpen: false, toggleDrawer: () => {} });

export const useDrawer = () => useContext(DrawerContext);
