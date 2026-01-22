import type {
  FinancialAccount,
  FinancialAccountType,
  FinancialImportResult,
  FinancialTransaction,
  FinancialTransactionStatus
} from "../types";
import { normalizeString } from "../utils/strings";

type Sparebanken1Psd2Account = {
  id: string;
  name?: string;
  product?: string;
  type?: string;
  currency: string;
  balances?: {
    available?: number | null;
    current?: number | null;
  };
};

type Sparebanken1Psd2Transaction = {
  id: string;
  accountId: string;
  amount: number;
  currency: string;
  bookingDate: string;
  valueDate?: string | null;
  text?: string | null;
  status?: string | null;
  category?: string | null;
};

type Sparebanken1Psd2Payload = {
  accounts?: Sparebanken1Psd2Account[];
  transactions?: Sparebanken1Psd2Transaction[];
};

type NormalizeOptions = {
  userId: string;
  now: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const normalizeAccountType = (value?: string): FinancialAccountType => {
  const candidate = normalizeString(value ?? "").toLowerCase();
  if (candidate.includes("save") || candidate.includes("deposit")) {
    return "savings";
  }
  if (candidate.includes("fund") || candidate.includes("investment")) {
    return "funds";
  }
  return "spending";
};

const normalizeTransactionStatus = (
  value?: string | null
): FinancialTransactionStatus => {
  const candidate = normalizeString(value ?? "").toLowerCase();
  if (candidate.includes("pending")) {
    return "pending";
  }
  return "booked";
};

const buildAccountId = (sourceId: string): string =>
  `sparebanken1:${sourceId}`;

const buildTransactionId = (sourceId: string): string =>
  `sparebanken1:${sourceId}`;

export const normalizeSparebanken1Psd2Import = (
  payload: unknown,
  { userId, now }: NormalizeOptions
): FinancialImportResult => {
  if (!isRecord(payload)) {
    return { accounts: [], transactions: [] };
  }

  const { accounts, transactions } = payload as Sparebanken1Psd2Payload;
  const normalizedAccounts: FinancialAccount[] = (accounts ?? []).flatMap(
    (account) => {
      if (!account?.id || !account.currency) {
        return [];
      }

      const sourceId = String(account.id);
      const name =
        normalizeString(account.name ?? "") ||
        normalizeString(account.product ?? "") ||
        "SpareBanken 1 account";
      const currentBalance = account.balances?.current ?? 0;
      const availableBalance = account.balances?.available ?? undefined;

      return [
        {
          id: buildAccountId(sourceId),
          userId,
          source: "sparebanken1",
          sourceId,
          name,
          type: normalizeAccountType(account.type ?? account.product),
          currency: account.currency,
          balance: currentBalance,
          availableBalance,
          updatedAt: now,
          createdAt: now
        }
      ];
    }
  );

  const normalizedTransactions: FinancialTransaction[] = (
    transactions ?? []
  ).flatMap((transaction) => {
    if (!transaction?.id || !transaction.accountId) {
      return [];
    }

    const sourceId = String(transaction.id);
    return [
      {
        id: buildTransactionId(sourceId),
        userId,
        accountId: buildAccountId(String(transaction.accountId)),
        source: "sparebanken1",
        sourceId,
        amount: transaction.amount,
        currency: transaction.currency,
        description: normalizeString(transaction.text ?? "") || undefined,
        bookingDate: transaction.bookingDate,
        valueDate: transaction.valueDate ?? undefined,
        status: normalizeTransactionStatus(transaction.status),
        category: normalizeString(transaction.category ?? "") || undefined,
        createdAt: now
      }
    ];
  });

  return {
    accounts: normalizedAccounts,
    transactions: normalizedTransactions
  };
};

export type { Sparebanken1Psd2Payload };
