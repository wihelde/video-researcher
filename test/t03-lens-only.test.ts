import { expect, test } from "bun:test";
import { createApp, type PostExtractionResult, type PreflightResult } from "../src/app";
import type { LogEvent } from "../src/log";

const ready: PreflightResult = { ready: true, checks: [] };

test("researches and dates findings without Vision or platform requests", async () => {
  const extraction: PostExtractionResult = {
    ok: true,
    post: {
      url: "https://x.com/example/status/123",
      platform: "x",
      title: "Submitted video",
      publishedAt: "2026-08-10",
      thumbnailUrl: "https://preview.example/image.jpg",
    },
  };
  const app = createApp({
    preflight: async () => ready,
    extractPost: async () => extraction,
    searchLens: async () => ({
      ok: true,
      matches: [{
        url: "https://www.tiktok.com/@creator/video/123",
        title: "TikTok 4. Juli 2026",
        match: "full",
        source: "lens",
        lensPublishedAt: "2026-07-04",
      }],
    }),
  });

  const response = await app.fetch(new Request("http://localhost/api/research", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url: extraction.post.url }),
  }));
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(body.findings.find((finding: { url: string }) => finding.url.includes("tiktok"))).toMatchObject({
    publishedAt: "2026-07-04",
    dateSource: "lens",
  });
  expect(body).not.toHaveProperty("usage");
  expect(body).not.toHaveProperty("fallbackUsed");
});

test("exposes estimated dates and logs only their count", async () => {
  const events: LogEvent[] = [];
  const app = createApp({
    preflight: async () => ready,
    extractPost: async () => ({ ok: true, post: {
      url: "https://x.com/example/status/123", platform: "x", title: "Submitted", publishedAt: "2026-10-15", thumbnailUrl: "https://preview.example/image.jpg",
    } }),
    searchLens: async () => ({ ok: true, matches: [{
      url: "https://www.youtube.com/shorts/estimated", title: "YouTube · vor 2 Tagen", match: "full", source: "lens", lensPublishedAt: "2026-10-13", lensRelativeDate: "vor 2 Tagen",
    }] }),
    log: async (event) => { events.push(event); },
  });
  const response = await app.fetch(new Request("http://localhost/api/research", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url: "https://x.com/example/status/123" }),
  }));
  const body = await response.json();
  expect(body.earliestFinding).toMatchObject({ publishedAt: "2026-10-13", relativeDate: "vor 2 Tagen", reliability: "low" });
  expect(events[0]).toMatchObject({ event: "research_completed", lensMatches: 1, lensRelativeDates: 1 });
  expect(JSON.stringify(events)).not.toContain("youtube");
  expect(JSON.stringify(events)).not.toContain("vor 2 Tagen");
});
