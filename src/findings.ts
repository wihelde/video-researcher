import type { LensMatch } from "./lens";
import { parseSupportedPost, type SocialPost } from "./social-post";

export type DateSource = "platform" | "lens";
export type Reliability = "high" | "medium" | "not-evaluable";
export type MatchKind = LensMatch["match"] | "submitted";
export type FindingSource = "submitted" | "lens";

export type Finding = {
  url: string;
  originalUrl: string | null;
  title: string;
  match: MatchKind;
  source: FindingSource;
  publishedAt: string | null;
  publishedAtPrecision: "instant" | "date" | null;
  dateSource: DateSource | null;
  reliability: Reliability;
};

export type ResearchSummary = {
  findings: Finding[];
  earliestFinding: Finding | null;
  confidence: { level: Reliability; reason: string };
  repostHint: string | null;
};

const parseDate = (value: string | null | undefined) => {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const timestamp = Date.parse(`${value}T00:00:00Z`);
    return Number.isNaN(timestamp)
      ? null
      : { value, precision: "date" as const, timestamp };
  }
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp)
    ? null
    : { value: new Date(timestamp).toISOString(), precision: "instant" as const, timestamp };
};

const canonicalUrl = (value: string) => {
  try {
    const url = new URL(value);
    if (url.pathname.endsWith("/&")) url.pathname = url.pathname.slice(0, -1);
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|fbclid$|gclid$|mc_cid$|mc_eid$)/i.test(key)) url.searchParams.delete(key);
    }
    url.hash = "";
    return url.toString();
  } catch {
    return value;
  }
};

const findingUrl = (value: string) => {
  const normalized = canonicalUrl(value);
  try {
    const url = new URL(normalized);
    if (!/^(www\.)?instagram\.com$/i.test(url.hostname)) return normalized;
    const shortcode = url.pathname.match(/^\/reels?\/([^/]+)\/?$/i)?.[1];
    if (!shortcode) return normalized;
    url.pathname = `/p/${shortcode}/`;
    return url.toString();
  } catch {
    return normalized;
  }
};

const comparable = (finding: Finding) =>
  finding.publishedAt ? Date.parse(finding.publishedAt) : Number.POSITIVE_INFINITY;

export const buildFindings = async (
  post: SocialPost,
  matches: LensMatch[],
): Promise<ResearchSummary> => {
  const submittedDate = parseDate(post.publishedAt);
  const submitted: Finding = {
    url: canonicalUrl(post.url),
    originalUrl: null,
    title: post.title,
    match: "submitted",
    source: "submitted",
    publishedAt: submittedDate?.value ?? null,
    publishedAtPrecision: submittedDate?.precision ?? null,
    dateSource: submittedDate ? "platform" : null,
    reliability: submittedDate ? "high" : "not-evaluable",
  };

  const externalByUrl = new Map<string, Finding>();
  for (const match of matches) {
    if (!parseSupportedPost(match.url).ok) continue;
    const date = parseDate(match.lensPublishedAt);
    const finding: Finding = {
      url: findingUrl(match.url),
      originalUrl: match.url,
      title: match.title,
      match: match.match,
      source: "lens",
      publishedAt: date?.value ?? null,
      publishedAtPrecision: date?.precision ?? null,
      dateSource: date ? "lens" : null,
      reliability: date ? "medium" : "not-evaluable",
    };
    const previous = externalByUrl.get(finding.url);
    if (!previous || (previous.publishedAt === null && finding.publishedAt !== null)) {
      externalByUrl.set(finding.url, finding);
    }
  }
  const external = [...externalByUrl.values()].slice(0, 30);

  const deduplicated = new Map<string, Finding>();
  for (const finding of [submitted, ...external]) {
    const previous = deduplicated.get(finding.url);
    if (!previous || (previous.publishedAt === null && finding.publishedAt !== null)) {
      deduplicated.set(finding.url, finding);
    }
  }

  const findings = [...deduplicated.values()].sort(
    (left, right) => comparable(left) - comparable(right),
  );
  const datedExternal = findings.filter(
    (finding) => finding.source === "lens" && finding.publishedAt,
  );
  const earliestFinding = findings.find((finding) => finding.publishedAt) ?? null;
  const confidence = datedExternal.length
    ? {
        level: "medium" as const,
        reason: "Mindestens eine vollständige Lens-Übereinstimmung enthält ein sichtbares Datum.",
      }
    : {
        level: "not-evaluable" as const,
        reason: "Keine Lens-Fundstelle enthält ein sichtbares Datum.",
      };
  const submittedTimestamp = submitted.publishedAt
    ? Date.parse(submitted.publishedAt)
    : Number.POSITIVE_INFINITY;
  const hasEarlier = datedExternal.some(
    (finding) => comparable(finding) < submittedTimestamp,
  );

  return {
    findings,
    earliestFinding,
    confidence,
    repostHint: hasEarlier
      ? "Eine datierte Lens-Fundstelle liegt vor dem eingereichten Post. Das ist ein Repost-Hinweis, kein Nachweis."
      : null,
  };
};
