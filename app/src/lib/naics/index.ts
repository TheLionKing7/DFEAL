/**
 * NAICS 2022 reference data (U.S. Census Bureau, 6-digit national industries).
 * Source: https://www.census.gov/naics/ — "2-6 digit_2022_Codes.xlsx"
 */
import data from "./naics-2022.json";

const CODES = data.codes as Record<string, string>;
const SECTORS = data.sectors as Record<string, string>;

export interface NaicsEntry {
  code: string;
  title: string;
  sector: string;
}

export function isValidNaics(code: string): boolean {
  return /^\d{6}$/.test(code) && code in CODES;
}

export function naicsTitle(code: string): string | null {
  return CODES[code] ?? null;
}

export function naicsSector(code: string): string | null {
  return SECTORS[code.slice(0, 2)] ?? null;
}

export function getNaics(code: string): NaicsEntry | null {
  const title = naicsTitle(code);
  if (!title) return null;
  return { code, title, sector: naicsSector(code) ?? "" };
}

/** Search by code prefix or words in the title. */
export function searchNaics(query: string, limit = 25): NaicsEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const isCode = /^\d+$/.test(q);
  const words = q.split(/\s+/).filter(Boolean);
  const out: NaicsEntry[] = [];
  for (const [code, title] of Object.entries(CODES)) {
    const match = isCode
      ? code.startsWith(q)
      : words.every((w) => title.toLowerCase().includes(w));
    if (match) {
      out.push({ code, title, sector: SECTORS[code.slice(0, 2)] ?? "" });
      if (out.length >= limit) break;
    }
  }
  return out;
}

export function naicsCount(): number {
  return Object.keys(CODES).length;
}
