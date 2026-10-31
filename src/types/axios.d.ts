import 'axios';

declare module 'axios' {
  export interface AxiosRequestConfig {
    _userEmail?: string;
    _retry?: boolean;
  }
}
