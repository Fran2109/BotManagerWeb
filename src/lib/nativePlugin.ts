import { registerPlugin } from '@capacitor/core';
import type { BotInput } from '../types';

/**
 * The app-local Android plugin (RunTrackerPlugin.java), registered once: Capacitor warns
 * when a plugin name is registered twice. Used by lib/runTracker.ts and lib/schedules.ts.
 */

export interface NativeSchedule {
  id: string;
  botName: string;
  userEmail: string;
  accountLabel: string;
  kind: 'once' | 'daily' | 'weekly';
  time: string;
  date?: string;
  days?: number[];
  hideBotAgentUi: boolean;
  notify: boolean;
  botInput?: BotInput;
  active: boolean;
  nextAt: number;
  lastRunAt?: number;
  lastResult?: string;
}

export interface BotManagerNativePlugin {
  // Run tracking (RunTrackerService)
  track(options: {
    deploymentId: string;
    botName: string;
    userEmail: string;
    password: string;
    baseUrl: string;
    token: string;
  }): Promise<void>;
  getLaunchRoute(): Promise<{ route: string | null }>;
  addListener(event: 'openRoute', handler: (data: { route: string }) => void): Promise<{ remove: () => void }>;

  // Phone-side schedules (ScheduleManager)
  saveSchedule(options: { schedule: Record<string, unknown> }): Promise<NativeSchedule>;
  listSchedules(): Promise<{ schedules: NativeSchedule[] }>;
  setScheduleActive(options: { id: string; active: boolean }): Promise<NativeSchedule>;
  deleteSchedule(options: { id: string }): Promise<void>;
  exactAlarmStatus(): Promise<{ exact: boolean }>;
  openExactAlarmSettings(): Promise<void>;
}

export const BotManagerNative = registerPlugin<BotManagerNativePlugin>('RunTracker');
