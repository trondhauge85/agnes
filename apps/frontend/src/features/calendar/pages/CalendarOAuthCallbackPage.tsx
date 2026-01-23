import { useEffect } from "react";

const CALENDAR_OAUTH_MESSAGE = "agnes-calendar-oauth";

const getParam = (params: URLSearchParams, key: string): string | null => {
  const value = params.get(key);
  return value && value.trim() ? value.trim() : null;
};

export const CalendarOAuthCallbackPage = () => {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = getParam(params, "code");
    const state = getParam(params, "state");
    const error = getParam(params, "error");

    if (window.opener) {
      window.opener.postMessage(
        {
          type: CALENDAR_OAUTH_MESSAGE,
          code,
          state,
          error
        },
        window.location.origin
      );
      window.close();
    }
  }, []);

  return (
    <main style={{ padding: "2rem", fontFamily: "Inter, system-ui, sans-serif" }}>
      <h1 style={{ marginBottom: "0.5rem" }}>Finishing calendar connection…</h1>
      <p>You can close this window if it doesn’t close automatically.</p>
    </main>
  );
};
