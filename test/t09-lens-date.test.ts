import { expect, test } from "bun:test";
import { parseLensDate } from "../src/lens-date";

const observedAt = new Date(2026, 9, 15, 12);

test.each([
  ["vor 2 Tagen", "2026-10-13"],
  ["vor 1 Tag", "2026-10-14"],
  ["vor einem Tag", "2026-10-14"],
  ["vor 1 Woche", "2026-10-08"],
  ["vor einer Woche", "2026-10-08"],
  ["vor 2 Wochen", "2026-10-01"],
  ["vor 1 Monat", "2026-09-15"],
  ["vor 2 Monaten", "2026-08-15"],
  ["vor 1 Jahr", "2025-10-15"],
  ["vor 3 Jahren", "2023-10-15"],
  ["vor 0 Sekunden", "2026-10-15"],
  ["vor 2 Min.", "2026-10-15"],
  ["vor 13 Std.", "2026-10-14"],
])("dates the Lens label %s against its observation time", (label, value) => {
  expect(parseLensDate("Reddit · " + label + " · Video", observedAt)).toEqual({
    value, relativeText: label,
  });
});

test("keeps calendar dates correct at month ends, leap years and DST boundaries", () => {
  expect(parseLensDate("vor 1 Monat", new Date(2026, 2, 31, 12))?.value).toBe("2026-02-28");
  expect(parseLensDate("vor 1 Monat", new Date(2024, 2, 31, 12))?.value).toBe("2024-02-29");
  expect(parseLensDate("vor 1 Jahr", new Date(2024, 1, 29, 12))?.value).toBe("2023-02-28");
  expect(parseLensDate("vor 1 Tag", new Date(2026, 2, 30, 0, 30))?.value).toBe("2026-03-29");
  expect(parseLensDate("vor 1 Stunde", new Date(2026, 9, 15, 0, 30))?.value).toBe("2026-10-14");
});

test("prefers an absolute Lens date and preserves the reference clock", () => {
  const before = observedAt.getTime();
  expect(parseLensDate("Instagram · vor 2 Tagen · 4. Juli 2026", observedAt)).toEqual({ value: "2026-07-04" });
  expect(parseLensDate("vor\u00a02\u00a0Tagen", observedAt)).toEqual({ value: "2026-10-13", relativeText: "vor 2 Tagen" });
  expect(observedAt.getTime()).toBe(before);
});

test.each(["Datum fehlt", "vor einiger Zeit", "vor 2 Videos", "in 2 Tagen", "vor -2 Tagen", "vor 1,5 Tagen", "vor 999999999999999999 Jahren", "31. Feb. 2026"])(
  "leaves unsupported or invalid date text undated: %s", (text) => {
    expect(parseLensDate(text, observedAt)).toBeNull();
  },
);
