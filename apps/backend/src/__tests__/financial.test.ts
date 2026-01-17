import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  listFinancialAccounts,
  listFinancialTransactions,
  storeFinancialImport,
  clearFinancialStorage
} from "../data/financial";
import { normalizeSparebanken1Psd2Import } from "../integrations/sparebanken1Psd2";

const samplePayload = {
  accounts: [
    {
      id: "acc-1",
      name: "Savings",
      type: "savings",
      currency: "NOK",
      balances: { current: 1000, available: 800 }
    }
  ],
  transactions: [
    {
      id: "tx-1",
      accountId: "acc-1",
      amount: -250,
      currency: "NOK",
      bookingDate: "2024-08-01",
      text: "Groceries",
      status: "booked",
      category: "food"
    }
  ]
};

const userId = "user-123";

beforeEach(() => {
  clearFinancialStorage();
});

describe("normalizeSparebanken1Psd2Import", () => {
  it("normalizes accounts and transactions", () => {
    const now = "2024-08-10T10:00:00.000Z";
    const result = normalizeSparebanken1Psd2Import(samplePayload, {
      userId,
      now
    });

    assert.equal(result.accounts.length, 1);
    assert.equal(result.transactions.length, 1);

    const account = result.accounts[0];
    assert.equal(account.id, "sparebanken1:acc-1");
    assert.equal(account.type, "savings");
    assert.equal(account.availableBalance, 800);
    assert.equal(account.updatedAt, now);

    const transaction = result.transactions[0];
    assert.equal(transaction.accountId, "sparebanken1:acc-1");
    assert.equal(transaction.status, "booked");
    assert.equal(transaction.description, "Groceries");
  });
});

describe("financial storage", () => {
  it("upserts imports and lists stored data", () => {
    const now = "2024-08-10T10:00:00.000Z";
    const normalized = normalizeSparebanken1Psd2Import(samplePayload, {
      userId,
      now
    });

    const firstSummary = storeFinancialImport(userId, normalized);
    assert.deepEqual(firstSummary.accounts, { created: 1, updated: 0 });
    assert.deepEqual(firstSummary.transactions, { created: 1, updated: 0 });

    const updatedPayload = {
      ...samplePayload,
      accounts: [
        {
          ...samplePayload.accounts[0],
          balances: { current: 1200, available: 900 }
        }
      ]
    };
    const updated = normalizeSparebanken1Psd2Import(updatedPayload, {
      userId,
      now: "2024-08-11T10:00:00.000Z"
    });

    const secondSummary = storeFinancialImport(userId, updated);
    assert.deepEqual(secondSummary.accounts, { created: 0, updated: 1 });
    assert.deepEqual(secondSummary.transactions, { created: 0, updated: 1 });

    const accounts = listFinancialAccounts(userId);
    const transactions = listFinancialTransactions(userId);

    assert.equal(accounts.length, 1);
    assert.equal(accounts[0].balance, 1200);
    assert.equal(transactions.length, 1);
  });
});
