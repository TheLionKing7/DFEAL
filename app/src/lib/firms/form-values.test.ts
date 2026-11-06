import { describe, expect, it } from "vitest";
import { firmToForm, formToPayload } from "@/lib/firms/form-values";
import { firmInputSchema } from "@/lib/firms/validation";
import { makeFirm } from "@/test/fixtures";

describe("firm form values", () => {
  it("round-trips a firm through the form and validation", () => {
    const firm = makeFirm({ workspace: { stateScope: "all", local: false, education: true, grants: false, briefingEmail: false } });
    const payload = formToPayload(firmToForm(firm));
    const parsed = firmInputSchema.parse(payload);
    expect(parsed.workspace).toEqual(firm.workspace);
    expect(parsed.naicsCodes).toEqual(firm.naicsCodes);
    expect(parsed.homeState).toBe("VA");
    expect(parsed.entityType).toBe("Government contractor");
  });
});
