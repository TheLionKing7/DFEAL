const DEFAULT_DOMAIN = "dfeal.com";

export function getAllowedEmailDomain(): string {
  return (
    process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN?.trim() ||
    process.env.ALLOWED_EMAIL_DOMAIN?.trim() ||
    DEFAULT_DOMAIN
  );
}

export function isAllowedTeamEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  const domain = getAllowedEmailDomain().toLowerCase();
  const at = normalized.lastIndexOf("@");
  if (at <= 0) return false;
  return normalized.slice(at + 1) === domain;
}
