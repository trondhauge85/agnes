import type {
  FinancialAccount,
  FinancialImportResult,
  FinancialTransaction
} from "../types";

type ImportSummary = {
  accounts: { created: number; updated: number };
  transactions: { created: number; updated: number };
};

const financialAccounts = new Map<string, FinancialAccount[]>();
const financialTransactions = new Map<string, FinancialTransaction[]>();

const upsertItems = <T extends { id: string }>(
  existing: T[],
  incoming: T
): { items: T[]; created: boolean } => {
  const index = existing.findIndex((item) => item.id === incoming.id);
  if (index === -1) {
    return { items: [...existing, { ...incoming }], created: true };
  }

  const next = [...existing];
  next[index] = { ...incoming };
  return { items: next, created: false };
};

export const storeFinancialImport = (
  userId: string,
  payload: FinancialImportResult
): ImportSummary => {
  let accountStore = financialAccounts.get(userId) ?? [];
  let transactionStore = financialTransactions.get(userId) ?? [];
  let accountsCreated = 0;
  let accountsUpdated = 0;
  let transactionsCreated = 0;
  let transactionsUpdated = 0;

  payload.accounts.forEach((account) => {
    const result = upsertItems(accountStore, account);
    accountStore = result.items;
    if (result.created) {
      accountsCreated += 1;
    } else {
      accountsUpdated += 1;
    }
  });

  payload.transactions.forEach((transaction) => {
    const result = upsertItems(transactionStore, transaction);
    transactionStore = result.items;
    if (result.created) {
      transactionsCreated += 1;
    } else {
      transactionsUpdated += 1;
    }
  });

  financialAccounts.set(userId, accountStore);
  financialTransactions.set(userId, transactionStore);

  return {
    accounts: { created: accountsCreated, updated: accountsUpdated },
    transactions: { created: transactionsCreated, updated: transactionsUpdated }
  };
};

export const listFinancialAccounts = (userId: string): FinancialAccount[] =>
  financialAccounts.get(userId)?.map((account) => ({ ...account })) ?? [];

export const listFinancialTransactions = (
  userId: string,
  accountId?: string
): FinancialTransaction[] =>
  (financialTransactions.get(userId) ?? [])
    .filter((transaction) =>
      accountId ? transaction.accountId === accountId : true
    )
    .map((transaction) => ({ ...transaction }));

export const clearFinancialStorage = (): void => {
  financialAccounts.clear();
  financialTransactions.clear();
};

export type { ImportSummary };
