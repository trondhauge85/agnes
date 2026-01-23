import type { OidcProfile } from "../types";

const oidcProfileStore = new Map<string, OidcProfile>();

export const saveOidcProfile = (sessionToken: string, profile: OidcProfile): void => {
  oidcProfileStore.set(sessionToken, profile);
};

export const getOidcProfile = (sessionToken: string): OidcProfile | null => {
  return oidcProfileStore.get(sessionToken) ?? null;
};
