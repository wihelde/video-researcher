import { expect, test } from "bun:test";
import { createApp, type PreflightResult } from "../src/app";
import { buildFindings } from "../src/findings";

const post = {
  url: "https://x.com/example/status/123",
  platform: "x" as const,
  title: "Submitted video",
  publishedAt: "2026-08-10",
  thumbnailUrl: "https://preview.example/image.jpg",
};

test("sorts and dates findings using Lens data only", async () => {
  const summary = await buildFindings(post, [
    {
      url: "https://www.tiktok.com/@creator/video/123",
      title: "TikTok 9. Aug. 2026",
      match: "full",
      source: "lens",
      lensPublishedAt: "2026-08-09",
    },
    {
      url: "https://www.youtube.com/shorts/example",
      title: "YouTube without visible date",
      match: "full",
      source: "lens",
    },
  ]);

  expect(summary.findings.map((finding) => finding.url)).toEqual([
    "https://www.tiktok.com/@creator/video/123",
    post.url,
    "https://www.youtube.com/shorts/example",
  ]);
  expect(summary.findings[0]).toMatchObject({
    publishedAt: "2026-08-09",
    dateSource: "lens",
    reliability: "medium",
  });
  expect(summary.findings[2].publishedAt).toBeNull();
  expect(summary.repostHint).toBeTruthy();
});

test("keeps Google's first 30 individual results before sorting by date", async () => {
  const matches = [{
    url: "https://www.tiktok.com/discover/kuehlschrank",
    title: "Unrelated discovery page",
    match: "full" as const,
    source: "lens" as const,
  }, ...Array.from({ length: 31 }, (_, index) => ({
    url: `https://www.youtube.com/shorts/${index}`,
    title: `Result ${index}`,
    match: "full" as const,
    source: "lens" as const,
    ...(index === 0
      ? { lensPublishedAt: "2026-08-01" }
      : index === 30
        ? { lensPublishedAt: "2020-01-01" }
        : {}),
  }))];

  const summary = await buildFindings(post, matches);
  expect(summary.findings).toHaveLength(31);
  expect(summary.findings[0]?.url).toBe("https://www.youtube.com/shorts/0");
  expect(summary.findings.some(({ url }) => url.includes("discover"))).toBe(false);
  expect(summary.findings.some(({ url }) => url.endsWith("/30"))).toBe(false);
});

test("normalizes Instagram reel URLs without requesting Instagram", async () => {
  const summary = await buildFindings(post, [{
    url: "https://www.instagram.com/reel/DavPCL4RChO/",
    title: "Instagram Reel 4. Juli 2026",
    match: "full",
    source: "lens",
    lensPublishedAt: "2026-07-04",
  }]);

  const finding = summary.findings.find((item) => item.source === "lens");
  expect(finding?.url).toBe("https://www.instagram.com/p/DavPCL4RChO/");
  expect(finding?.originalUrl).toBe("https://www.instagram.com/reel/DavPCL4RChO/");
});

test("renders safe links, clipboard actions and Lens-only labels", async () => {
  const ready: PreflightResult = { ready: true, checks: [] };
  const app = createApp({ preflight: async () => ready });
  const response = await app.fetch(new Request("http://localhost/"));
  const html = await response.text();

  expect(html).toContain('target = "_blank"');
  expect(html).toContain('rel = "noopener noreferrer"');
  expect(html).toContain("URL kopieren");
  expect(html).toContain("Google Lens übertragen");
  expect(html).not.toContain("Cloud Vision");
});

test("uses estimated dates for chronology while keeping their uncertainty visible", async () => {
  const summary = await buildFindings(post, [
    { url: "https://www.youtube.com/shorts/dated", title: "YouTube · vor 2 Tagen", match: "full", source: "lens", lensPublishedAt: "2026-08-08", lensRelativeDate: "vor 2 Tagen" },
    { url: "https://www.youtube.com/shorts/undated", title: "YouTube", match: "full", source: "lens" },
  ]);
  expect(summary.findings.map(({ url }) => url)).toEqual([
    "https://www.youtube.com/shorts/dated", post.url, "https://www.youtube.com/shorts/undated",
  ]);
  expect(summary.earliestFinding).toMatchObject({
    publishedAt: "2026-08-08", publishedAtPrecision: "date", dateSource: "lens", reliability: "low", relativeDate: "vor 2 Tagen",
  });
  expect(summary.confidence.level).toBe("low");
  expect(summary.repostHint).toBeNull();
});

test("prefers an absolute date when normalized URLs identify the same finding", async () => {
  const summary = await buildFindings(post, [
    { url: "https://www.instagram.com/reel/example/", title: "Estimated", match: "full", source: "lens", lensPublishedAt: "2026-08-01", lensRelativeDate: "vor 1 Woche" },
    { url: "https://www.instagram.com/p/example/", title: "Absolute", match: "full", source: "lens", lensPublishedAt: "2026-08-09" },
  ]);
  expect(summary.findings).toHaveLength(2);
  expect(summary.earliestFinding).toMatchObject({ title: "Absolute", publishedAt: "2026-08-09", reliability: "medium" });
  expect(summary.earliestFinding).not.toHaveProperty("relativeDate");
});

test("does not overstate confidence in an estimated earliest finding when other dates are absolute", async () => {
  const summary = await buildFindings(post, [
    { url: "https://www.youtube.com/shorts/estimated", title: "Estimated", match: "full", source: "lens", lensPublishedAt: "2026-08-01", lensRelativeDate: "vor 1 Woche" },
    { url: "https://www.youtube.com/shorts/absolute", title: "Absolute", match: "full", source: "lens", lensPublishedAt: "2026-08-09" },
  ]);
  expect(summary.earliestFinding?.title).toBe("Estimated");
  expect(summary.confidence.level).toBe("low");
  expect(summary.repostHint).toBeTruthy();
});
