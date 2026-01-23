import { apiRequest } from "../../../shared/api/client";

export type OidcProfile = {
  displayName?: string;
  givenName?: string;
  familyName?: string;
  email?: string;
  phoneNumber?: string;
  pictureUrl?: string;
};

type OidcProfileResponse = {
  profile: OidcProfile;
};

const OIDC_PROFILE_KEY = "agnes_oidc_profile";

export const getOidcProfile = (): OidcProfile | null => {
  const stored = window.localStorage.getItem(OIDC_PROFILE_KEY);
  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored) as OidcProfile;
  } catch {
    return null;
  }
};

export const saveOidcProfile = (profile: OidcProfile): void => {
  window.localStorage.setItem(OIDC_PROFILE_KEY, JSON.stringify(profile));
};

export const clearOidcProfile = (): void => {
  window.localStorage.removeItem(OIDC_PROFILE_KEY);
};

export const fetchOidcProfile = async (): Promise<OidcProfile | null> => {
  try {
    const response = await apiRequest<OidcProfileResponse>("/auth/oidc/profile");
    saveOidcProfile(response.profile);
    return response.profile;
  } catch {
    return null;
  }
};

export const getPreferredDisplayName = (profile: OidcProfile): string => {
  if (profile.displayName) {
    return profile.displayName;
  }

  const pieces = [profile.givenName, profile.familyName].filter(Boolean);
  if (pieces.length > 0) {
    return pieces.join(" ");
  }

  return "";
};
