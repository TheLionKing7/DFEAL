"use client";

import { FirmForm } from "@/components/firm/FirmForm";
import { emptyFirmForm } from "@/lib/firms/form-values";

/** Platform-admin "create workspace directly" form (no invite). */
export function OnboardFirmForm() {
  return (
    <FirmForm
      mode="create"
      initial={{ ...emptyFirmForm() }}
      sections={["owner", "identity", "industry", "workspace", "eligibility", "rules", "narrative", "notifications"]}
      onSaved={() => setTimeout(() => window.location.assign("/explore"), 1200)}
    />
  );
}
