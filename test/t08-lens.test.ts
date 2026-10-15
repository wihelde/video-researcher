import { expect, test } from "bun:test";
import {
  createApp,
  type PostExtractionResult,
  type PreflightResult,
} from "../src/app";
import { searchGoogleLens } from "../src/lens";

const ready: PreflightResult = { ready: true, checks: [] };

test("extracts supported source links from a rendered Lens page", async () => {
  const commands: string[][] = [];
  const result = await searchGoogleLens(
    "https://preview.example/image.jpg",
    async (args, stdin) => {
      commands.push(args);
      if (args[0] === "get") return "https://www.google.com/search?udm=26&vsint=full";
      if (args[0] === "eval") {
        if (stdin?.includes("lens-exact-clicked")) return "lens-exact-clicked";
        if (stdin?.includes("lens-exact-inactive")) return "lens-exact-active";
        if (stdin?.includes("lens-full-ready")) return "lens-full-ready:10:10:1:1";
        if (stdin?.includes("lens-cropped")) return "lens-full";
        expect(stdin).toContain("data-href");
        expect(stdin).toContain("outerHTML");
        expect(stdin).not.toContain(".slice(0, 100)");
        return JSON.stringify([
          {
            url: "https://www.instagram.com/reels/DbELBaJoIUo/",
            title: "Crazy Trick Shots – Instagram 4. Juli 2026",
          },
          { url: "https://www.instagram.com/reels/DbELBaJoIUo/&ved=tracking", title: "Google duplicate" },
          { url: "https://www.reddit.com/r/example/comments/abc123/post/", title: "Reddit" },
          { url: "https://v.redd.it/abc123", title: "Reddit video" },
          { url: "https://youtu.be/abc123", title: "YouTube short link" },
          { url: "https://www.google.com/search?q=ignored", title: "Google" },
          {
            url: "https://www.tiktok.com/@creator/video/123",
            title: "Comedy ka badshah – TikTok 9. Aug. 2026 · 720 × 1.280 TikTok",
          },
        ]);
      }
      return "";
    },
  );

  expect(result).toEqual({
    ok: true,
    matches: [
      {
        url: "https://www.instagram.com/reels/DbELBaJoIUo/",
        title: "Crazy Trick Shots – Instagram 4. Juli 2026",
        match: "full",
        source: "lens",
        lensPublishedAt: "2026-07-04",
      },
      { url: "https://www.reddit.com/r/example/comments/abc123/post/", title: "Reddit", match: "full", source: "lens" },
      { url: "https://v.redd.it/abc123", title: "Reddit video", match: "full", source: "lens" },
      { url: "https://youtu.be/abc123", title: "YouTube short link", match: "full", source: "lens" },
      {
        url: "https://www.tiktok.com/@creator/video/123",
        title: "Comedy ka badshah – TikTok 9. Aug. 2026 · 720 × 1.280 TikTok",
        match: "full",
        source: "lens",
        lensPublishedAt: "2026-08-09",
      },
    ],
  });
  expect(commands[0]?.[0]).toBe("open");
  expect(commands.at(-1)?.[0]).toBe("eval");
  expect(commands.some(([command]) => command === "eval")).toBe(true);
});

test("resolves Google's opaque Lens result links", async () => {
  const result = await searchGoogleLens(
    "https://preview.example/image.jpg",
    async (args, stdin) => {
      if (args[0] === "get") return "https://www.google.com/search?udm=48&vsint=full";
      if (args[0] !== "eval") return "";
      if (stdin?.includes("lens-exact-inactive")) return "lens-exact-active";
      if (stdin?.includes("lens-cropped")) return "lens-full";
      return JSON.stringify([{
        url: "https://www.google.com/goto?url=opaque",
        title: "Kühlschrank Mit Holz Verkleiden - TikTok 17. Aug. 2026",
      }]);
    },
    undefined,
    async () => new Response(null, {
      status: 302,
      headers: { location: "https://www.tiktok.com/@creator/video/123" },
    }),
  );

  expect(result).toEqual({
    ok: true,
    matches: [{
      url: "https://www.tiktok.com/@creator/video/123",
      title: "Kühlschrank Mit Holz Verkleiden - TikTok 17. Aug. 2026",
      match: "full",
      source: "lens",
      lensPublishedAt: "2026-08-17",
    }],
  });
});

test("expands Lens' selected region with native corner drags after selecting exact matches", async () => {
  const commands: string[][] = [];
  let fullImageChecks = 0;
  await searchGoogleLens(
    "https://preview.example/image.jpg",
    async (args, stdin) => {
      commands.push(args);
      if (args[0] === "get") return "https://www.google.com/search?udm=26&vsint=full";
      if (args[0] !== "eval") return "";
      if (stdin?.includes("lens-full-ready")) {
        expect(stdin).toContain("rect.bottom > 0");
        expect(stdin).toContain("rect.top < innerHeight");
        return "lens-full-ready:10:10:1:1";
      }
      if (stdin?.includes("lens-cropped")) {
        fullImageChecks += 1;
        return fullImageChecks === 1 ? "lens-cropped" : "lens-full";
      }
      if (stdin?.includes("lens-exact-clicked")) return "lens-exact-clicked";
      if (stdin?.includes("lens-exact-inactive")) return "lens-exact-active";
      return JSON.stringify([{ url: "https://www.instagram.com/p/example/", title: "Instagram" }]);
    },
  );

  expect(commands.filter(([command]) => command === "mouse")).toHaveLength(8);
  expect(commands.filter(([command]) => command === "focus")).toHaveLength(0);
  expect(commands.filter(([command]) => command === "drag")).toHaveLength(0);
  const openedUrls = commands
    .filter(([command]) => command === "open")
    .map(([, url]) => url);
  expect(openedUrls).toHaveLength(3);
  expect(openedUrls[1]).toContain("udm=48");
  expect(commands.findIndex(([command]) => command === "mouse")).toBeGreaterThan(
    commands.findIndex(([command, url]) => command === "open" && url?.includes("udm=48")),
  );
  expect(openedUrls[2]).toContain("udm=48");
});

test("keeps an already complete Lens selection unchanged", async () => {
  const commands: string[][] = [];
  const result = await searchGoogleLens(
    "https://preview.example/image.jpg",
    async (args, stdin) => {
      commands.push(args);
      if (args[0] === "get") return "https://www.google.com/search?udm=26&vsint=full";
      if (args[0] !== "eval") return "";
      if (stdin?.includes("lens-exact-inactive")) return "lens-exact-active";
      if (stdin?.includes("lens-cropped")) return "lens-full";
      if (stdin?.includes("lens-full-ready")) return "lens-full-ready:10:10:1:1";
      return JSON.stringify([{ url: "https://www.instagram.com/p/example/", title: "Instagram" }]);
    },
  );

  expect(result.ok).toBe(true);
  expect(commands.filter(([command]) => command === "mouse")).toHaveLength(0);
});

test("reports when Lens renders no supported source links", async () => {
  const result = await searchGoogleLens(
    "https://preview.example/image.jpg",
    async (args, stdin) => {
      if (args[0] === "get") return "https://www.google.com/search?udm=26&vsint=full";
      if (args[0] !== "eval") return "";
      if (stdin?.includes("lens-exact-clicked")) return "lens-exact-clicked";
      if (stdin?.includes("lens-exact-inactive")) return "lens-exact-active";
      if (stdin?.includes("lens-full-ready")) return "lens-full-ready:10:10:1:1";
      if (stdin?.includes("lens-cropped")) return "lens-full";
      return "[]";
    },
  );

  expect(result).toEqual({
    ok: false,
    error: {
      code: "lens-no-supported-links",
      message: "Google Lens lieferte keine direkten Links aus „Genau Übereinstimmungen“.",
    },
  });
});

test("rejects Lens results when the complete image cannot be confirmed", async () => {
  const result = await searchGoogleLens(
    "https://preview.example/image.jpg",
    async (args, stdin) => {
      if (args[0] === "get") return "https://www.google.com/search?udm=26&vsint=full";
      if (args[0] !== "eval") return "";
      if (stdin?.includes("lens-full-ready")) return "lens-full-unavailable";
      if (stdin?.includes("lens-exact-active")) return "lens-exact-active";
      if (stdin?.includes("lens-exact-clicked")) return "lens-exact-clicked";
      return "[]";
    },
  );

  expect(result).toEqual({
    ok: false,
    error: {
      code: "lens-full-image-failed",
      message: "Google Lens konnte nicht auf die vollständige Bildfläche umgestellt werden.",
    },
  });
});

test("rejects Lens results unless exact matches is confirmed", async () => {
  const result = await searchGoogleLens(
    "https://preview.example/image.jpg",
    async (args, stdin) => {
      if (args[0] === "get") return "https://www.google.com/search?udm=26&vsint=full";
      if (args[0] !== "eval") return "";
      if (stdin?.includes("lens-full-ready")) return "lens-full-ready:10:10:1:1";
      if (stdin?.includes("lens-cropped")) return "lens-full";
      if (stdin?.includes("lens-exact-clicked")) return "lens-exact-clicked";
      if (stdin?.includes("lens-exact-active")) return "lens-exact-inactive";
      return "[]";
    },
  );

  expect(result).toEqual({
    ok: false,
    error: {
      code: "lens-exact-matches-failed",
      message: "Google Lens konnte nicht auf „Genaue Übereinstimmungen“ umgestellt werden.",
    },
  });
});

test("switches to the visible browser runner after a Lens CAPTCHA block", async () => {
  let visible = false;
  const captchaStates: boolean[] = [];
  const result = await searchGoogleLens(
    "https://preview.example/image.jpg",
    async (args, _stdin, options) => {
      visible ||= Boolean(options?.headed);
      if (args[0] === "get") {
        return options?.headed
          ? "https://www.google.com/search?udm=26"
          : "https://www.google.com/sorry/index";
      }
      if (args[0] === "eval") {
        if (_stdin?.includes("lens-exact-clicked")) return "lens-exact-clicked";
        if (_stdin?.includes("lens-exact-inactive")) return "lens-exact-active";
        if (_stdin?.includes("lens-full-ready")) return "lens-full-ready:10:10:1:1";
        if (_stdin?.includes("lens-cropped")) return "lens-full";
        return JSON.stringify([
          { url: "https://www.instagram.com/reels/DbELBaJoIUo/", title: "Instagram Reel" },
        ]);
      }
      return "";
    },
    (required) => captchaStates.push(required),
  );

  expect(visible).toBe(true);
  expect(captchaStates).toEqual([true, false]);
  expect(result).toEqual({
    ok: true,
    matches: [
      { url: "https://www.instagram.com/reels/DbELBaJoIUo/", title: "Instagram Reel", match: "full", source: "lens" },
    ],
  });
});

test("merges Lens matches into the normal finding list", async () => {
  const extraction: PostExtractionResult = {
    ok: true,
    post: {
      url: "https://www.reddit.com/r/example/comments/abc123/example/",
      platform: "reddit",
      title: "Beispiel",
      publishedAt: "2026-08-19T08:00:00.000Z",
      thumbnailUrl: "https://preview.example/image.jpg",
    },
  };
  const app = createApp({
    preflight: async () => ready,
    extractPost: async () => extraction,
    searchLens: async () => ({
      ok: true,
      matches: [{ url: "https://www.instagram.com/reels/DbELBaJoIUo/", title: "Instagram Reel", match: "full", source: "lens" }],
    }),
  });

  const response = await app.fetch(
    new Request("http://localhost/api/research", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: extraction.ok ? extraction.post.url : "" }),
    }),
  );
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(body.findings.some((finding: { url: string }) => finding.url === "https://www.instagram.com/p/DbELBaJoIUo/")).toBe(true);
  expect(body.findings.find((finding: { title: string }) => finding.title === "Instagram Reel").source).toBe("lens");
  expect(body.lensMessage).toBeNull();
});

test("dates relative Lens findings once at observation, before redirects can cross midnight", async () => {
  let clock = new Date(2026, 9, 15, 23, 59);
  const result = await searchGoogleLens(
    "https://preview.example/image.jpg",
    async (args, stdin) => {
      if (args[0] === "get") return "https://www.google.com/search?udm=48&vsint=full";
      if (args[0] !== "eval") return "";
      if (stdin?.includes("lens-exact-inactive")) return "lens-exact-active";
      if (stdin?.includes("lens-cropped")) return "lens-full";
      return JSON.stringify([
        { url: "https://www.google.com/goto?url=first", title: "Instagram · vor 2 Tagen" },
        { url: "https://www.youtube.com/shorts/example", title: "YouTube · vor 1 Tag" },
      ]);
    },
    undefined,
    async () => {
      clock = new Date(2026, 9, 16, 0, 1);
      return new Response(null, { status: 302, headers: { location: "https://www.instagram.com/p/example/" } });
    },
    () => clock,
  );
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.error.message);
  expect(result.matches).toMatchObject([
    { lensPublishedAt: "2026-10-13", lensRelativeDate: "vor 2 Tagen" },
    { lensPublishedAt: "2026-10-14", lensRelativeDate: "vor 1 Tag" },
  ]);
});

test("prefers absolute dates on duplicate Lens links without changing Google ranking", async () => {
  const result = await searchGoogleLens(
    "https://preview.example/image.jpg",
    async (args, stdin) => {
      if (args[0] === "get") return "https://www.google.com/search?udm=48&vsint=full";
      if (args[0] !== "eval") return "";
      if (stdin?.includes("lens-exact-inactive")) return "lens-exact-active";
      if (stdin?.includes("lens-cropped")) return "lens-full";
      return JSON.stringify([
        { url: "https://www.instagram.com/p/example/", title: "Instagram · vor 2 Tagen" },
        { url: "https://www.youtube.com/shorts/example", title: "YouTube · vor 1 Tag" },
        { url: "https://www.instagram.com/p/example/", title: "Instagram · 12. Okt. 2026" },
      ]);
    },
    undefined, undefined, () => new Date(2026, 9, 15, 12),
  );
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.error.message);
  expect(result.matches.map(({ url }) => url)).toEqual([
    "https://www.instagram.com/p/example/", "https://www.youtube.com/shorts/example",
  ]);
  expect(result.matches[0]).toMatchObject({ lensPublishedAt: "2026-10-12" });
  expect(result.matches[0]).not.toHaveProperty("lensRelativeDate");
});
