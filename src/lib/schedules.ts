import { Capacitor } from '@capacitor/core';
import { BotManagerNative, NativeSchedule } from './nativePlugin';
import { Bot, BotInput } from '../types';
import { checkBotExists, getControlRoomUrl, getToken, getUserId } from '../Functions';
import { AVAILABLE_USERS, DEFAULT_PASSWORD } from '../constants/users';
import { CALLBACK_URL } from '@env';

/**
 * Bot schedules kept on the phone. Community Edition rejects Control Room schedules
 * ("You no longer have permission to schedule a bot"), so on Android the app launches the
 * bot itself at the scheduled time (ScheduleManager / ScheduleReceiver / RunTrackerService).
 * The phone must be on and online then; missed runs are reported, not launched late.
 */

export type ScheduleKind = 'once' | 'daily' | 'weekly';

export type Schedule = NativeSchedule;

export interface NewSchedule {
  bot: Bot;
  userEmail: string;
  kind: ScheduleKind;
  time: string;
  date?: string;
  days?: number[];
  hideBotAgentUi: boolean;
  notify: boolean;
  botInput?: BotInput;
}

const Native = BotManagerNative;

/** Scheduling needs the native alarms, so it's only available in the Android app. */
export const schedulesSupported = () => Capacitor.getPlatform() === 'android';

/**
 * Resolves the bot's file id and the user id in the chosen account now, so the scheduled
 * launch needs no lookups, then stores the schedule and sets its alarm.
 */
export const createSchedule = async (s: NewSchedule): Promise<Schedule> => {
  const account = AVAILABLE_USERS.find(u => u.email === s.userEmail);
  const found = await checkBotExists(s.bot.taskName, s.userEmail);
  if (!found.exists || !found.taskId) {
    throw new Error(`"${s.bot.name}" isn't in ${account?.label ?? s.userEmail}'s Control Room.`);
  }
  const token = await getToken(s.userEmail, DEFAULT_PASSWORD);
  const userId = await getUserId(token, s.userEmail);
  return Native.saveSchedule({
    schedule: {
      botName: s.bot.name,
      userEmail: s.userEmail,
      accountLabel: account?.label ?? s.userEmail,
      fileId: found.taskId,
      userId: String(userId),
      password: DEFAULT_PASSWORD,
      baseUrl: getControlRoomUrl(s.userEmail),
      callbackUrl: CALLBACK_URL,
      botInput: s.botInput ?? {},
      hideBotAgentUi: s.hideBotAgentUi,
      notify: s.notify,
      kind: s.kind,
      time: s.time,
      date: s.date,
      days: s.days,
      active: true,
    },
  });
};

export const listSchedules = async () => (await Native.listSchedules()).schedules;
export const setScheduleActive = (id: string, active: boolean) => Native.setScheduleActive({ id, active });
export const deleteSchedule = (id: string) => Native.deleteSchedule({ id });
export const exactAlarmsAllowed = async () => (await Native.exactAlarmStatus()).exact;
export const openExactAlarmSettings = () => Native.openExactAlarmSettings();

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const WEEK_DAYS = [2, 3, 4, 5, 6, 7, 1].map(d => ({ day: d, label: DAY_NAMES[d - 1] }));

/** "Every day at 08:00" / "Mon, Wed and Fri at 08:00" / "Once, Nov 5 at 08:00". */
export const describeRecurrence = (s: Pick<Schedule, 'kind' | 'time' | 'date' | 'days'>) => {
  if (s.kind === 'daily') return `Every day at ${s.time}`;
  if (s.kind === 'weekly') {
    const days = WEEK_DAYS.filter(d => s.days?.includes(d.day)).map(d => d.label);
    if (days.length === 7) return `Every day at ${s.time}`;
    const list = days.length > 1 ? `${days.slice(0, -1).join(', ')} and ${days[days.length - 1]}` : days[0] ?? '';
    return `${list} at ${s.time}`;
  }
  const date = s.date ? new Date(`${s.date}T00:00:00`) : null;
  const label = date ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
  return `Once, ${label} at ${s.time}`;
};

/** "Today, 08:00" / "Tomorrow, 08:00" / "Wed, Nov 5, 08:00". */
export const describeNextRun = (ms: number) => {
  if (!ms || ms < 0) return null;
  const d = new Date(ms);
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const day = (offset: number) => {
    const x = new Date();
    x.setDate(x.getDate() + offset);
    return x.toDateString();
  };
  if (d.toDateString() === day(0)) return `Today, ${time}`;
  if (d.toDateString() === day(1)) return `Tomorrow, ${time}`;
  return `${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}, ${time}`;
};
