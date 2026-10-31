export type DictionaryValueSubtype = 'ANY' | 'STRING' | 'NUMBER' | 'BOOLEAN';

export interface BotDictionaryEntryValue {
  type: DictionaryValueSubtype;
  string?: string;
  number?: number;
  boolean?: boolean;
}

export interface BotDictionaryEntry {
  key: string;
  value: BotDictionaryEntryValue;
}

export interface BotInput {
  [key: string]: {
    type: string;
    boolean?: boolean;
    number?: number;
    string?: string;
    datetime?: string;
    dictionary?: BotDictionaryEntry[];
  };
}

export interface BotVariable {
  name: string;
  description: string;
  type: string;
  readOnly: boolean;
  input: boolean;
  output: boolean;
  properties?: Record<string, unknown>;
  defaultValue: {
    type: string;
    boolean?: boolean;
    string?: string;
    number?: number;
    datetime?: string;
    dictionary?: BotDictionaryEntry[];
    dictionarySubtype?: string;
  };
}

export interface BotContentResponse {
  triggers: any[];
  nodes: any[];
  variables: BotVariable[];
  packages: any[];
  workItemTemplateName: string | null;
  properties: any;
}

export interface Bot {
  id: string;
  name: string;
  taskName: string;
  path?: string;
  directory?: string;
  size?: number;
  lastModified?: string;
  lastModifiedBy?: string;
  type: string;
}

export interface User {
  id: number;
  email: string;
  label: string;
  deviceConnected?: boolean;
  checkingDevice?: boolean;
  primaryDeviceId?: string;
}

export type AlertType = 'success' | 'error';

export interface AlertState {
  show: boolean;
  type: AlertType;
  title: string;
  message: string;
}

export interface ActivityItem {
  id: string;
  automationName: string;
  fileName: string;
  filePath: string;
  type: string;
  startDateTime: string;
  endDateTime: string;
  command: string;
  status: string;
  progress: number;
  automationId: string;
  userId: string;
  deviceId: string;
  currentLine: number;
  totalLines: number;
  fileId: string;
  modifiedBy: string;
  createdBy: string;
  modifiedOn: string;
  createdOn: string;
  deploymentId: string;
  queueName: string;
  queueId: string;
  usingRdp: boolean;
  message: string;
  canManage: boolean;
  deviceName: string;
  userName: string;
  tenantUuid: string;
  automationPriority: string;
  callbackInfo: string;
  runElevated: boolean;
  botLabel: string;
  currentBotName: string;
  rolesWithAccess: string[];
  workspaceType: string;
  systemBot: boolean;
  initiationType: string;
  activityType: string;
}

export interface UserWithActivity extends User {
  activity?: ActivityItem;
  checkingActivity?: boolean;
}