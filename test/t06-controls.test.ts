import { expect, test } from "bun:test";
import { createApp, type PostExtractionResult, type PreflightResult } from "../src/app";
import type { LogEvent } from "../src/log";

const ready: PreflightResult = { ready: true, checks: [] };
const extracted = (): PostExtractionResult => ({
  ok: true,
  post: {
    url: "https://x.com/example/status/123",
    platform: "x",
    title: "Submitted video",
    publishedAt: null,
    thumbnailUrl: "https://preview.example/image.jpg",
  },
});

test("cancels an active research", async () => {
  let started!: () => void;
  let release!: () => void;
  const startedPromise = new Promise<void>((resolve) => { started = resolve; });
  const extractionPromise = new Promise<PostExtractionResult>((resolve) => {
    release = () => resolve(extracted());
  });
  const app = createApp({
    preflight: async () => ready,
    extractPost: async () => {
      started();
      return extractionPromise;
    },
  });

  const research = app.fetch(new Request("http://localhost/api/research", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url: "https://x.com/example/status/123" }),
  }));
  await startedPromise;
  expect(await (await app.fetch(new Request("http://localhost/api/research/status"))).json())
    .toEqual({ active: true, phase: "video" });
  expect((await app.fetch(new Request("http://localhost/api/research/cancel", { method: "POST" }))).status)
    .toBe(202);
  release();
  expect((await research).status).toBe(499);
});

test("shows Lens status and logs a successful run", async () => {
  const events: LogEvent[] = [];
  const app = createApp({
    preflight: async () => ready,
    extractPost: async () => extracted(),
    searchLens: async () => ({ ok: true, matches: [] }),
    log: async (event) => events.push(event),
  });

  const html = await (await app.fetch(new Request("http://localhost/"))).text();
  expect(html).toContain("Recherche abbrechen");
  expect(html).toContain("Erneut versuchen");
  expect(html).toContain("Video erkennen");
  expect(html).toContain("Google Lens durchsuchen");
  expect(html).not.toContain("Bild suchen");
  expect(html).not.toContain("Treffer datieren");

  const response = await app.fetch(new Request("http://localhost/api/research", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url: "https://x.com/example/status/123" }),
  }));
  expect(response.status).toBe(200);
  expect(events).toHaveLength(1);
  expect(events[0]).toMatchObject({ event: "research_completed", lensMatches: 0 });
  expect(JSON.stringify(events[0])).not.toContain("vision");
});

test("reports a required Google confirmation while Lens is waiting", async () => {
  let lensStarted!: () => void;
  let releaseLens!: () => void;
  const started = new Promise<void>((resolve) => { lensStarted = resolve; });
  const waiting = new Promise<void>((resolve) => { releaseLens = resolve; });
  const app = createApp({
    preflight: async () => ready,
    extractPost: async () => extracted(),
    searchLens: async (_imageUrl, reportAttention) => {
      reportAttention(true);
      lensStarted();
      await waiting;
      reportAttention(false);
      return { ok: true, matches: [] };
    },
  });

  const research = app.fetch(new Request("http://localhost/api/research", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url: "https://x.com/example/status/123" }),
  }));
  await started;
  expect(await (await app.fetch(new Request("http://localhost/api/research/status"))).json())
    .toEqual({ active: true, phase: "lens", attention: "captcha" });
  releaseLens();
  expect((await research).status).toBe(200);
});

test("renders a syntactically valid browser script", async () => {
  const app = createApp({ preflight: async () => ready });
  const html = await (await app.fetch(new Request("http://localhost/"))).text();
  const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];

  expect(script).toBeTruthy();
  expect(() => new Function(script!)).not.toThrow();
});
