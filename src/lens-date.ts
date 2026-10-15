type LensDate = { value: string; relativeText?: string };

const months: Record<string, number> = {
  jan: 1, januar: 1, feb: 2, februar: 2, mär: 3, märz: 3, mrz: 3,
  apr: 4, april: 4, mai: 5, jun: 6, juni: 6, jul: 7, juli: 7,
  aug: 8, august: 8, sep: 9, sept: 9, september: 9, okt: 10,
  oktober: 10, nov: 11, november: 11, dez: 12, dezember: 12,
};

/** Interpret German Lens dates against one observation time; relative dates stay estimates. */
export const parseLensDate = (text: string, observedAt: Date): LensDate | null => {
  const absolute = text.match(/\b(\d{1,2})\.\s*([A-Za-zÄÖÜäöüß]+)\.?\s+(\d{4})\b/);
  if (absolute) {
    const day = Number(absolute[1]);
    const month = months[absolute[2].toLocaleLowerCase("de-DE")];
    const year = Number(absolute[3]);
    if (!month) return null;
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
    return { value: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` };
  }

  const relative = text.match(/\bvor\s+(\d+|einem|einer)\s+(Sekunden?|Sek\.?|Minuten?|Min\.?|Stunden?|Std\.?|Tag(?:en|e)?|Wochen?|Monat(?:en|e)?|Jahr(?:en|e)?)(?=$|[\s·,;|)])/i);
  if (!relative) return null;
  const amount = /^\d+$/.test(relative[1]) ? Number(relative[1]) : 1;
  if (!Number.isSafeInteger(amount)) return null;
  const unit = relative[2].toLocaleLowerCase("de-DE");
  const date = new Date(observedAt);
  if (unit.startsWith("sek")) {
    date.setTime(date.getTime() - amount * 1_000);
  } else if (unit.startsWith("min")) {
    date.setTime(date.getTime() - amount * 60_000);
  } else if (unit.startsWith("st")) {
    date.setTime(date.getTime() - amount * 3_600_000);
  } else if (unit.startsWith("tag") || unit.startsWith("woche")) {
    // Calendar days retain the local date across daylight-saving changes.
    date.setDate(date.getDate() - amount * (unit.startsWith("woche") ? 7 : 1));
  } else {
    // Clamp month ends: March 31 minus one month is February 28/29, not March.
    const day = date.getDate();
    date.setDate(1);
    if (unit.startsWith("monat")) date.setMonth(date.getMonth() - amount);
    else date.setFullYear(date.getFullYear() - amount);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    date.setDate(Math.min(day, lastDay));
  }
  const year = date.getFullYear();
  if (!Number.isFinite(date.getTime()) || year < 1 || year > 9999) return null;
  return {
    value: `${String(year).padStart(4, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
    relativeText: relative[0].replace(/\s+/g, " "),
  };
};
