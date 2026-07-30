import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  assertSafetySameOrigin,
  parseSafetyJsonBody,
} from "../http-boundary";
import { SafetyApiError } from "../errors";

const schema = z.object({ value: z.string() });

describe("Safety HTTP boundary", () => {
  it("trả validation cho JSON sai cú pháp và body trống", async () => {
    for (const body of ["{", ""]) {
      const request = new Request("https://erp.example/api/safety", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
      });
      await expect(parseSafetyJsonBody(request, schema)).rejects.toMatchObject({
        code: "SAFETY_VALIDATION_FAILED",
        httpStatus: 400,
      });
    }
  });

  it("chặn content-type sai và payload vượt giới hạn", async () => {
    await expect(
      parseSafetyJsonBody(
        new Request("https://erp.example/api/safety", {
          method: "POST",
          headers: { "content-type": "text/plain" },
          body: "{}",
        }),
        schema,
      ),
    ).rejects.toMatchObject({ httpStatus: 415 });
    await expect(
      parseSafetyJsonBody(
        new Request("https://erp.example/api/safety", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ value: "123456" }),
        }),
        schema,
        8,
      ),
    ).rejects.toMatchObject({ httpStatus: 413 });
  });

  it("chặn cross-origin và cho same-origin", () => {
    const same = new Request("https://erp.example/api/safety", {
      method: "POST",
      headers: { host: "erp.example", origin: "https://erp.example" },
    });
    expect(() => assertSafetySameOrigin(same)).not.toThrow();

    const cross = new Request("https://erp.example/api/safety", {
      method: "POST",
      headers: { host: "erp.example", origin: "https://attacker.example" },
    });
    expect(() => assertSafetySameOrigin(cross)).toThrow(SafetyApiError);
  });
});
