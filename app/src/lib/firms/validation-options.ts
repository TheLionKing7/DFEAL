/** Option lists shared by the firm forms (client-safe, no zod / NAICS data). */
export const ENTITY_TYPES = [
  "Government contractor",
  "Consulting agency",
  "Professional services firm",
  "Product / supplier",
  "Nonprofit",
  "Other",
] as const;

export const EMPLOYEE_RANGES = ["1-10", "11-50", "51-200", "201-500", "500+"] as const;
