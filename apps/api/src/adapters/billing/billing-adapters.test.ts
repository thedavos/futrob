import { NoopTransactionPort } from "@/adapters/persistence/pg-transaction.ts";
import { describe } from "vite-plus/test";
import { billingAdapterContract, planRequestAdapterContract } from "./billing-adapters.contract.ts";
import { InMemoryPlanRequestRepository } from "./plan-requests.ts";
import { InMemoryQuotaLedger } from "./quota-ledger.ts";
import {
  InMemoryPlanChangeAuditRepository,
  InMemorySubscriptionRepository,
} from "./subscriptions.ts";

const createAdapters = async () => ({
  transaction: new NoopTransactionPort(),
  ledger: new InMemoryQuotaLedger(),
  subscriptions: new InMemorySubscriptionRepository(),
  audit: new InMemoryPlanChangeAuditRepository(),
  requests: new InMemoryPlanRequestRepository(),
});

describe("in-memory billing adapters", () => {
  billingAdapterContract(createAdapters);
  planRequestAdapterContract(createAdapters);
});
