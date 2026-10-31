import { User } from '../types';
import { DEFAULT_PASSWORD as ENV_DEFAULT_PASSWORD, USER_FRANCISCO1, USER_FRANCISCO3, USER_FRANCISCO4 } from '@env';

export const AVAILABLE_USERS: User[] = [
  { id: 1, email: USER_FRANCISCO1, label: 'Francisco 1' },
  { id: 2, email: USER_FRANCISCO3, label: 'Francisco 3' },
  { id: 3, email: USER_FRANCISCO4, label: 'Francisco 4' },
];

export const DEFAULT_PASSWORD = ENV_DEFAULT_PASSWORD;