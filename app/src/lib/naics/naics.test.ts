import { describe, expect, it } from "vitest";
import { getNaics, isValidNaics, naicsCount, searchNaics } from "@/lib/naics";

describe("NAICS 2022 reference", () => {
  it("loads all 6-digit codes", () => {
    expect(naicsCount()).toBe(1012);
  });

  it("validates codes", () => {
    expect(isValidNaics("541611")).toBe(true);
    expect(isValidNaics("541612")).toBe(true);
    expect(isValidNaics("999999")).toBe(false);
    expect(isValidNaics("5416")).toBe(false);
    expect(isValidNaics("54161a")).toBe(false);
  });

  it("returns titles and sectors", () => {
    expect(getNaics("541512")).toEqual({
      code: "541512",
      title: "Computer Systems Design Services",
      sector: "Professional, Scientific, and Technical Services",
    });
  });

  it("searches by code prefix and by words", () => {
    expect(searchNaics("5415").every((n) => n.code.startsWith("5415"))).toBe(true);
    expect(searchNaics("janitorial").map((n) => n.code)).toContain("561720");
    expect(searchNaics("")).toEqual([]);
  });
});
