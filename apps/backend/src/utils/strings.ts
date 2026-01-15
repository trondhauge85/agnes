export const isEmail = (value: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export const normalizeString = (value: string): string => value.trim();

export const normalizeStringArray = (values: string[] | undefined): string[] =>
  (values ?? []).map((value) => normalizeString(value)).filter(Boolean);
