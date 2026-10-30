import { NoopTransactionPort } from "@/adapters/persistence/pg-transaction.ts";
import { describe } from "vite-plus/test";
import { billingAdapterContract } from "./billing-adapters.contract.ts";
import { InMemoryQuotaLedger } from "./quota-ledger.ts";
import {
  InMemoryPlanChangeAuditRepository,
  InMemorySubscriptionRepository,
} from "./subscriptions.ts";

describe("in-memory billing adapters", () => {
  billingAdapterContract(async () => ({
    transaction: new NoopTransactionPort(),
    ledger: new InMemoryQuotaLedger(),
    subscriptions: new InMemorySubscriptionRepository(),
    audit: new InMemoryPlanChangeAuditRepository(),
  }));
});
