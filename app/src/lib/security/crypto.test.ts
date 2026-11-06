import { beforeAll, describe, expect, it } from "vitest";
import { decryptJson, encryptJson, signState, verifyState } from "@/lib/security/crypto";

beforeAll(() => {
  process.env.CONNECTOR_ENCRYPTION_KEY = "test-key-test-key-test-key-123456";
});

describe("connector secret encryption", () => {
  it("round-trips and is not plaintext", () => {
    const enc = encryptJson({ url: "https://hooks.slack.com/x" });
    expect(enc).not.toContain("hooks.slack.com");
    expect(decryptJson(enc)).toEqual({ url: "https://hooks.slack.com/x" });
  });

  it("rejects tampering", () => {
    const enc = encryptJson({ a: 1 });
    const parts = enc.split(".");
    parts[3] = parts[3].slice(0, -2) + (parts[3].endsWith("A") ? "BB" : "AA");
    expect(() => decryptJson(parts.join("."))).toThrow();
  });

  it("signs and verifies OAuth state", () => {
    const s = signState({ firmId: "f1" });
    expect(verifyState<{ firmId: string }>(s)?.firmId).toBe("f1");
    expect(verifyState(s.replace(/.$/, s.endsWith("a") ? "b" : "a"))).toBeNull();
    expect(verifyState(signState({ x: 1 }, -10))).toBeNull();
  });
});
