import { expect, test } from "bun:test";
import {
  createApp,
  type PostExtractionResult,
  type PreflightResult,
} from "../src/app";
import {
  extractThreadsPost,
  parseSupportedPost,
  parseYtDlpOutput,
} from "../src/social-post";

const ready: PreflightResult = {
  ready: true,
  checks: [
    { id: "yt-dlp", label: "yt-dlp", ok: true, detail: "Gefunden" },
    {
      id: "google-lens-browser",
      label: "agent-browser",
      ok: true,
      detail: "Gefunden",
    },
  ],
};

test("parses yt-dlp JSON even when local config noise precedes it", () => {
  const info = parseYtDlpOutput('null\nERROR: ignored\n{"title":"Beans with beats"}\n');
  expect(info?.title).toBe("Beans with beats");
});

test("accepts individual URLs on every supported platform", () => {
  const cases = [
    ["https://www.reddit.com/r/example/comments/abc123/example/", "reddit"],
    ["https://v.redd.it/abc123", "reddit"],
    ["https://x.com/example/status/123", "x"],
    ["https://www.instagram.com/reel/ABC123/", "instagram"],
    ["https://www.youtube.com/watch?v=ABC123", "youtube"],
    ["https://www.threads.com/@example/post/ABC123/", "threads"],
    ["https://www.tiktok.com/@example/video/123", "tiktok"],
    ["https://vt.tiktok.com/ABC123/", "tiktok"],
    ["https://www.snapchat.com/spotlight/ABC123", "snapchat"],
    ["https://www.facebook.com/reel/123", "facebook"],
  ] as const;

  for (const [url, platform] of cases) {
    expect(parseSupportedPost(url)).toMatchObject({ ok: true, platform });
  }
});

test("rejects a Reddit subreddit page instead of treating it as a post", () => {
  expect(parseSupportedPost("https://www.reddit.com/r/example/")).toEqual({
    ok: false,
    message: "Bitte eine URL zu genau einem öffentlichen Post oder Video eingeben.",
  });
});

test("rejects platform pages that are not individual posts", () => {
  for (const url of [
    "https://www.tiktok.com/discover/kuehlschrank",
    "https://www.instagram.com/example/",
    "https://www.youtube.com/results?search_query=example",
  ]) {
    expect(parseSupportedPost(url).ok).toBe(false);
  }
});

test("extracts a public Threads post from page metadata", async () => {
  const url = "https://www.threads.com/@example/post/ABC123/";
  const result = await extractThreadsPost(url, async () =>
    new Response(`
      <title>Threads title</title>
      <meta property="og:title" content="Threads video">
      <meta property="og:image" content="https://cdn.example/thumb.jpg">
      <meta property="og:video" content="https://cdn.example/video.mp4">
      <meta property="article:published_time" content="2026-08-01T12:00:00Z">
    `),
  );

  expect(result).toEqual({
    ok: true,
    post: {
      url,
      platform: "threads",
      title: "Threads video",
      publishedAt: "2026-08-01T12:00:00.000Z",
      thumbnailUrl: "https://cdn.example/thumb.jpg",
    },
  });
});

test("accepts a supported Reddit post and returns its metadata", async () => {
  const extraction: PostExtractionResult = {
    ok: true,
    post: {
      url: "https://www.reddit.com/r/example/comments/abc123/example/",
      platform: "reddit",
      title: "Ein Beispielvideo",
      publishedAt: "2026-08-19T08:00:00.000Z",
      thumbnailUrl: "https://preview.redd.it/example.jpg",
    },
  };

  const app = createApp({
    preflight: async () => ready,
    extractPost: async () => extraction,
  });
  const response = await app.fetch(
    new Request("http://localhost/api/research", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        url: "https://www.reddit.com/r/example/comments/abc123/example/",
      }),
    }),
  );

  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.ok).toBe(true);
  expect(body.post).toEqual(extraction.post);
});

test("rejects an unsupported URL before extraction", async () => {
  const app = createApp({
    preflight: async () => ready,
    extractPost: async () => {
      throw new Error("extractor must not run");
    },
  });
  const response = await app.fetch(
    new Request("http://localhost/api/research", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: "https://example.com/video" }),
    }),
  );

  expect(response.status).toBe(422);
  expect(await response.json()).toEqual({
    ok: false,
    error: { code: "invalid-url", message: "Die URL gehört nicht zu einer unterstützten Plattform." },
  });
});

test("enables the social post URL form after the preflight passes", async () => {
  const app = createApp({ preflight: async () => ready });
  const response = await app.fetch(new Request("http://localhost/"));
  const html = await response.text();

  expect(html).toContain("Recherche starten");
  expect(html).toContain("Öffentliche Social-Media-Post- oder Video-URL");
  expect(html).not.toContain("Recherche gesperrt");
});
