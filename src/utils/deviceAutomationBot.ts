import { Bot } from '../types';

export type DeviceAutomationAction = 'shutdown' | 'screenshot';

export const deviceAutomationBot = (
  userNumericId: number,
  taskName: string,
  action: DeviceAutomationAction,
): Bot => ({
  id: `device-auto:${userNumericId}:${action}`,
  name: taskName,
  taskName,
  type: 'application/vnd.aa.taskbot',
});
