import {
  clearSession,
  clearTokenSession,
  getSession,
  setSessionCookie,
  setTokenSession,
} from "../authStorage";

describe("authStorage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    document.cookie = "agnes_session=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
  });

  it("prefers localStorage tokens over session storage", () => {
    window.localStorage.setItem("agnes_auth_token", "local-token");
    window.sessionStorage.setItem("agnes_auth_token", "session-token");

    expect(getSession()).toEqual({ type: "token", value: "local-token" });
  });

  it("stores token sessions in the right storage and clears cookies", () => {
    document.cookie = "agnes_session=demo-cookie; path=/";

    setTokenSession("session-token", false);
    expect(window.sessionStorage.getItem("agnes_auth_token")).toBe("session-token");
    expect(window.localStorage.getItem("agnes_auth_token")).toBeNull();
    expect(document.cookie).not.toContain("agnes_session=demo-cookie");

    setTokenSession("persisted-token", true);
    expect(window.localStorage.getItem("agnes_auth_token")).toBe("persisted-token");
    expect(window.sessionStorage.getItem("agnes_auth_token")).toBeNull();
  });

  it("uses cookie sessions and clears token storage", () => {
    window.localStorage.setItem("agnes_auth_token", "token");

    setSessionCookie("cookie-token");

    expect(getSession()).toEqual({ type: "cookie", value: "cookie-token" });
    expect(window.localStorage.getItem("agnes_auth_token")).toBeNull();
    expect(window.sessionStorage.getItem("agnes_auth_token")).toBeNull();
  });

  it("clears all session data", () => {
    window.localStorage.setItem("agnes_auth_token", "token");
    document.cookie = "agnes_session=cookie-token; path=/";

    clearSession();

    expect(getSession()).toBeNull();
  });

  it("clears token sessions without removing cookies", () => {
    window.localStorage.setItem("agnes_auth_token", "token");
    document.cookie = "agnes_session=cookie-token; path=/";

    clearTokenSession();

    expect(window.localStorage.getItem("agnes_auth_token")).toBeNull();
    expect(document.cookie).toContain("agnes_session=cookie-token");
  });
});
