export type UserProfile = {
  id: string;
  username: string;
};

const PROFILE_STORAGE_KEY = "agnes_profile";

const readStorage = (): UserProfile | null => {
  const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as UserProfile;
    if (parsed && typeof parsed.id === "string" && typeof parsed.username === "string") {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
};

export const createProfileId = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `user-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const getStoredProfile = (): UserProfile | null => readStorage();

export const hasStoredProfile = (): boolean => {
  const profile = readStorage();
  return Boolean(profile?.id && profile?.username);
};

export const saveProfile = (profile: UserProfile): void => {
  window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
};
