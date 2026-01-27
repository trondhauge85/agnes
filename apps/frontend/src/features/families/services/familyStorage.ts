export type StoredFamily = {
  id: string;
  name: string;
  pictureUrl?: string;
  preferredLanguage?: string;
};

const FAMILY_STORAGE_KEY = "agnes_families";
const SELECTED_FAMILY_KEY = "agnes_selected_family";

const readStorage = (): StoredFamily[] => {
  const raw = window.localStorage.getItem(FAMILY_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed as StoredFamily[];
    }
    return [];
  } catch {
    return [];
  }
};

const writeStorage = (families: StoredFamily[]) => {
  window.localStorage.setItem(FAMILY_STORAGE_KEY, JSON.stringify(families));
};

export const getStoredFamilies = (): StoredFamily[] => readStorage();

export const hasStoredFamily = (): boolean => readStorage().length > 0;

export const saveFamily = (family: StoredFamily): StoredFamily[] => {
  const current = readStorage();
  const exists = current.find((item) => item.id === family.id);
  const next = exists
    ? current.map((item) => (item.id === family.id ? { ...item, ...family } : item))
    : [...current, family];
  writeStorage(next);
  setSelectedFamilyId(family.id);
  return next;
};

export const getSelectedFamilyId = (): string | null =>
  window.localStorage.getItem(SELECTED_FAMILY_KEY);

export const setSelectedFamilyId = (familyId: string) => {
  window.localStorage.setItem(SELECTED_FAMILY_KEY, familyId);
};
