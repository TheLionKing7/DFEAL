"use client";

import { FirmForm, emptyFirmForm } from "@/components/firm/FirmForm";

/** Create-mode firm form that opens the new workspace once onboarding succeeds. */
export function OnboardFirmForm({ showOwnerEmail }: { showOwnerEmail: boolean }) {
  return (
    <FirmForm
      mode="create"
      initial={emptyFirmForm()}
      showOwnerEmail={showOwnerEmail}
      onSaved={() => {
        setTimeout(() => {
          window.location.assign("/explore");
        }, 1200);
      }}
    />
  );
}
