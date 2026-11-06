import { describe, expect, it } from "vitest";
import { assertPublicHttpsUrl } from "@/lib/connectors/net";

describe("assertPublicHttpsUrl", () => {
  it.each([
    "http://example.com/hook",
    "https://localhost/hook",
    "https://127.0.0.1/hook",
    "https://10.0.0.5/x",
    "https://169.254.169.254/latest/meta-data",
    "https://[::1]/x",
    "https://user:pass@example.com/x",
  ])("rejects %s", async (url) => {
    await expect(assertPublicHttpsUrl(url)).rejects.toThrow();
  });

  it("accepts a public IP over https", async () => {
    await expect(assertPublicHttpsUrl("https://8.8.8.8/x")).resolves.toBeInstanceOf(URL);
  });
});
