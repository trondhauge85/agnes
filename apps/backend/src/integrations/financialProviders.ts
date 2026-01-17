import type {
  FinancialImportResult,
  FinancialProvider
} from "../types";
import { normalizeSparebanken1Psd2Import } from "./sparebanken1Psd2";

type NormalizeOptions = {
  userId: string;
  now: string;
};

export type FinancialProviderAdapter = {
  provider: FinancialProvider;
  normalizeImport: (payload: unknown, options: NormalizeOptions) => FinancialImportResult;
};

const sparebanken1Adapter: FinancialProviderAdapter = {
  provider: "sparebanken1",
  normalizeImport: normalizeSparebanken1Psd2Import
};

const adapters = new Map<FinancialProvider, FinancialProviderAdapter>([
  ["sparebanken1", sparebanken1Adapter]
]);

export const getFinancialProviderAdapter = (
  provider: FinancialProvider
): FinancialProviderAdapter | null => adapters.get(provider) ?? null;

export const listFinancialProviders = (): FinancialProvider[] =>
  Array.from(adapters.keys());
