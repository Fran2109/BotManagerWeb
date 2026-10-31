import axios from 'axios';

/**
 * Turns an API/axios error into a sentence a user can act on, instead of
 * "Request failed with status code 401". The technical detail is appended for support.
 */
export const describeError = (error: unknown, fallback = 'Something unexpected happened.'): string => {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return "Can't reach the Control Room. Check the phone's internet connection.";
    }
    const status = error.response.status;
    const apiMessage = (error.response.data as { message?: string } | undefined)?.message;
    const detail = apiMessage ? ` (${status}: ${apiMessage})` : ` (${status})`;
    if (status === 401 || status === 403) {
      return `The Control Room rejected the account's credentials.${detail}`;
    }
    if (status === 404) {
      return `The Control Room couldn't find what was requested.${detail}`;
    }
    if (status >= 500) {
      return `The Control Room is having problems right now. Try again in a minute.${detail}`;
    }
    return `The Control Room returned an error.${detail}`;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
};
