const TOKEN_KEY = "agnes_auth_token";
const COOKIE_KEY = "agnes_session";

export type SessionInfo = {
  type: "token" | "cookie";
  value: string;
};

const getTokenStorage = () => {
  return window.localStorage;
};

export const getSession = (): SessionInfo | null => {
  const token = getTokenStorage().getItem(TOKEN_KEY) ?? window.sessionStorage.getItem(TOKEN_KEY);
  if (token) {
    return { type: "token", value: token };
  }

  const cookieMatch = document.cookie
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${COOKIE_KEY}=`));

  if (cookieMatch) {
    return { type: "cookie", value: cookieMatch.split("=")[1] ?? "" };
  }

  return null;
};

export const setTokenSession = (token: string, remember: boolean) => {
  if (remember) {
    window.localStorage.setItem(TOKEN_KEY, token);
    window.sessionStorage.removeItem(TOKEN_KEY);
  } else {
    window.sessionStorage.setItem(TOKEN_KEY, token);
    window.localStorage.removeItem(TOKEN_KEY);
  }
  clearSessionCookie();
};

export const setSessionCookie = (value: string) => {
  document.cookie = `${COOKIE_KEY}=${value}; path=/`;
  clearTokenSession();
};

export const clearTokenSession = () => {
  window.localStorage.removeItem(TOKEN_KEY);
  window.sessionStorage.removeItem(TOKEN_KEY);
};

export const clearSessionCookie = () => {
  document.cookie = `${COOKIE_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
};

export const clearSession = () => {
  clearTokenSession();
  clearSessionCookie();
};
