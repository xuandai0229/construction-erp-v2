import { describe, expect, it } from "vitest";
import {
  buildSafetyIdempotencyKey,
  isSafetyMutationReplay,
} from "../idempotency";

describe("idempotency mutation ATLĐ", () => {
  it("scope key theo actor và aggregate, không unique mutation toàn hệ thống", () => {
    const first = buildSafetyIdempotencyKey({
      actorId: "actor-a",
      aggregateType: "SESSION",
      aggregateId: "session-1",
      clientMutationId: "device-mutation-1",
    });
    const second = buildSafetyIdempotencyKey({
      actorId: "actor-b",
      aggregateType: "SESSION",
      aggregateId: "session-1",
      clientMutationId: "device-mutation-1",
    });
    expect(first).not.toBe(second);
  });

  it("retry cùng actor/aggregate/mutation được nhận diện là replay", () => {
    const mutation = {
      actorId: "actor-a",
      aggregateType: "FINDING" as const,
      aggregateId: "finding-1",
      clientMutationId: "mutation-1",
    };
    expect(isSafetyMutationReplay(mutation, mutation)).toBe(true);
  });
});
