import { getSession } from "../../features/auth/services/authStorage";

type RequestOptions = Omit<RequestInit, "headers"> & {
  headers?: Record<string, string>;
};

export const apiRequest = async <T>(url: string, options: RequestOptions = {}): Promise<T> => {
  const session = getSession();
  const headers = new Headers(options.headers ?? {});

  if (session?.type === "token") {
    headers.set("Authorization", `Bearer ${session.value}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
};
