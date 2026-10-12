export type LensMatch = {
  url: string;
  title: string;
  match: "full";
  source: "lens";
  lensPublishedAt?: string;
};

export type LensSearchResult =
  | { ok: true; matches: LensMatch[] }
  | { ok: false; error: { code: string; message: string } };

export type BrowserCommandRunner = (
  args: string[],
  stdin?: string,
  options?: { headed?: boolean; session?: string },
) => Promise<string>;

export type LensAttentionReporter = (required: boolean) => void;

const session = () =>
  process.env.VIDEO_RESEARCHER_LENS_SESSION?.trim() || "video-researcher-lens";
const visibleSession = () =>
  process.env.VIDEO_RESEARCHER_LENS_VISIBLE_SESSION?.trim() || "video-researcher-visible";

let useVisibleSession = false;

const runBrowserCommand: BrowserCommandRunner = async (args, stdin, options) => {
  const selectedSession = options?.session ?? session();
  const command = Bun.spawn(
    [
      "agent-browser",
      "--session",
      selectedSession,
      "--pin-tab",
      ...(options?.headed ? ["--headed"] : []),
      ...args,
    ],
    { stdin: "pipe", stdout: "pipe", stderr: "pipe" },
  );
  if (stdin) {
    command.stdin.write(stdin);
  }
  command.stdin.end();
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(command.stdout).text(),
    new Response(command.stderr).text(),
    command.exited,
  ]);
  if (exitCode !== 0) {
    throw new Error(stderr.trim() || `agent-browser beendet mit ${exitCode}`);
  }
  return stdout.trim();
};

const lensPlatforms = [
  "reddit.com",
  "redd.it",
  "instagram.com",
  "tiktok.com",
  "youtube.com",
  "youtu.be",
  "x.com",
  "twitter.com",
  "threads.com",
  "threads.net",
  "snapchat.com",
  "facebook.com",
  "fb.watch",
] as const;

const isLensPlatformUrl = (value: string) => {
  try {
    const host = new URL(value).hostname.toLowerCase();
    return lensPlatforms.some((platform) => host === platform || host.endsWith(`.${platform}`));
  } catch {
    return false;
  }
};

const isLensRedirectUrl = (value: string) => {
  try {
    const url = new URL(value);
    return (url.hostname === "google.com" || url.hostname.endsWith(".google.com")) &&
      url.pathname === "/goto";
  } catch {
    return false;
  }
};

const lensScript = String.raw`(async () => {
  const platforms = ${JSON.stringify(lensPlatforms)};
  const urlPattern = /https?:\/\/[^\s"'<>]+/g;
  const normalizeText = (value) => value.replace(/\s+/g, " ").trim().toLowerCase();
  const elementText = (element) => element.textContent || element.getAttribute("aria-label") || "";
  const isVisible = (element) => {
    if (element.closest("[hidden], [aria-hidden='true']")) return false;
    const style = getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden";
  };
  const main = [...document.querySelectorAll("main, [role='main']")].find(isVisible);
  const section = main || document.body;
  if (!section) return [];
  const decode = (value) => {
    try {
      const clean = value
        .replace(/&amp;/g, "&")
        .replace(/\\u003d/g, "=")
        .replace(/\\u0026/g, "&")
        .replace(/\\\//g, "/");
      const url = new URL(decodeURIComponent(clean), location.href);
      if (url.hostname.endsWith("google.com") && (url.pathname === "/url" || url.pathname === "/search")) {
        return url.searchParams.get("q") || url.searchParams.get("url") || value;
      }
      return url.toString();
    } catch {
      return value;
    }
  };
  const elements = [...section.querySelectorAll("a, [data-href], [data-url], [data-link]")].filter(isVisible);
  const values = elements
    .flatMap((element) => {
      const title = (element.textContent || element.getAttribute("aria-label") || "").trim();
      return ["href", "data-href", "data-url", "data-link"]
        .map((attribute) => element.getAttribute(attribute))
        .filter(Boolean)
        .flatMap((value) => value.match(urlPattern) || [value])
        .map((value) => ({ url: decode(value), title }));
    });
  const htmlValues = elements.flatMap((element) => element.outerHTML.match(urlPattern) || []);
  return [...values, ...htmlValues.map((url) => ({ url: decode(url), title: "" }))]
    .filter(({ url }) => {
      try {
        const host = new URL(url).hostname.toLowerCase();
        return platforms.some((platform) => host === platform || host.endsWith("." + platform)) ||
          ((host === "google.com" || host.endsWith(".google.com")) && new URL(url).pathname === "/goto");
      } catch {
        return false;
      }
    });
})()`;

const verifyExactMatches = String.raw`(() =>
  new URL(location.href).searchParams.get("udm") === "48"
    ? "lens-exact-active"
    : "lens-exact-inactive"
)()`;

const parseLinks = (output: string) => {
  const start = output.indexOf("[");
  const end = output.lastIndexOf("]");
  if (start < 0 || end < start) return [];
  try {
    const value: unknown = JSON.parse(output.slice(start, end + 1));
    if (!Array.isArray(value)) return [];
    return value.filter(
      (item): item is { url: string; title?: string } =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as { url?: unknown }).url === "string",
    ).filter(({ url }) => isLensPlatformUrl(url) || isLensRedirectUrl(url));
  } catch {
    return [];
  }
};

const lensDate = (value: string) => {
  const match = value.match(/\b(\d{1,2})\.\s*([A-Za-zÄÖÜäöüß]+)\.?\s+(\d{4})\b/);
  if (!match) return null;
  const months: Record<string, number> = {
    jan: 1, januar: 1, feb: 2, februar: 2, mär: 3, märz: 3, mrz: 3,
    apr: 4, april: 4, mai: 5, jun: 6, juni: 6, jul: 7, juli: 7,
    aug: 8, august: 8, sep: 9, sept: 9, september: 9, okt: 10,
    oktober: 10, nov: 11, november: 11, dez: 12, dezember: 12,
  };
  const day = Number(match[1]);
  const month = months[match[2].toLocaleLowerCase("de-DE")];
  const year = Number(match[3]);
  if (!month) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

const prepareFullImageCorner = (type: string) => String.raw`(async () => {
  const selector = "input[type='range'][data-corner-type='${type}']";
  const isVisible = (element) => {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.right > 0 && rect.top < innerHeight && rect.left < innerWidth;
  };
  let corner = document.querySelector(selector);
  if (!corner || !isVisible(corner)) {
    const edit = [...document.querySelectorAll("button, [role='button']")].find((element) =>
      /(visuelle suche bearbeiten|edit visual search)/i.test(element.getAttribute("aria-label") || element.textContent || ""),
    );
    if (edit && typeof edit.click === "function") {
      edit.click();
      await new Promise((resolve) => setTimeout(resolve, 500));
      corner = document.querySelector(selector);
    }
  }
  if (!corner || !isVisible(corner)) return "lens-full-unavailable";
  const image = [...document.images].find((element) => {
    const rect = element.getBoundingClientRect();
    return element.alt === "Visuell gesuchtes Bild" && rect.width > 100 && rect.height > 100 && rect.y >= 0;
  });
  if (!image) return "lens-full-unavailable";
  const handle = corner.getBoundingClientRect();
  const bounds = image.getBoundingClientRect();
  const targetX = "${type}" === "0" ? bounds.left + 2 : bounds.right - 2;
  const targetY = "${type}" === "0" ? bounds.top + 2 : bounds.bottom - 2;
  return [
    "lens-full-ready",
    Math.round(handle.left + handle.width / 2),
    Math.round(handle.top + handle.height / 2),
    Math.round(targetX),
    Math.round(targetY),
  ].join(":");
})()`;

const verifyFullImage = String.raw`(() => {
  const corners = new Map(
    [...document.querySelectorAll("input[type='range'][data-corner-type]")]
      .map((element) => [
        element.getAttribute("data-corner-type"),
        [...(element.getAttribute("aria-label") || "").matchAll(/\d+/g)].map((match) => Number(match[0])),
      ]),
  );
  const expected = new Map([
    ["0", [0, 0]],
    ["1", [100, 0]],
    ["3", [100, 100]],
    ["2", [0, 100]],
  ]);
  return [...expected].every(([type, values]) =>
    values.every((value, index) => corners.get(type)?.at(index) === value)
  )
    ? "lens-full"
    : "lens-cropped";
})()`;

const selectFullImage = async (
  run: BrowserCommandRunner,
  options?: Parameters<BrowserCommandRunner>[2],
) => {
  if ((await run(["eval", "--stdin"], verifyFullImage, options)).includes("lens-full")) {
    return true;
  }
  for (const type of ["0", "3"]) {
    const prepared = await run(
      ["eval", "--stdin"],
      prepareFullImageCorner(type),
      options,
    );
    const coordinates = prepared.match(/lens-full-ready:(\d+):(\d+):(\d+):(\d+)/)?.slice(1);
    if (!coordinates) return false;
    const [fromX, fromY, toX, toY] = coordinates;
    await run(["mouse", "move", fromX, fromY], undefined, options);
    await run(["mouse", "down"], undefined, options);
    await run(["mouse", "move", toX, toY], undefined, options);
    await run(["mouse", "up"], undefined, options);
    // ponytail: fixed wait keeps the worker simple; replace with Lens' crop update event if it becomes stable.
    await run(["wait", "1000"], undefined, options);
  }
  return (await run(["eval", "--stdin"], verifyFullImage, options)).includes("lens-full");
};

export const searchGoogleLens = async (
  imageUrl: string,
  run: BrowserCommandRunner = runBrowserCommand,
  reportAttention: LensAttentionReporter = () => {},
  fetcher: typeof fetch = fetch,
): Promise<LensSearchResult> => {
  if (!Bun.which("agent-browser") && run === runBrowserCommand) {
    return {
      ok: false,
      error: {
        code: "lens-browser-missing",
        message: "Google Lens ist nicht verfügbar: agent-browser wurde nicht gefunden.",
      },
    };
  }

  try {
    const browserOptions =
      useVisibleSession
        ? { headed: true, session: visibleSession() }
        : undefined;
    const target = `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(imageUrl)}`;
    await run(["open", target], undefined, browserOptions);
    await run(["wait", "--load", "domcontentloaded"], undefined, browserOptions);
    // ponytail: fixed wait keeps the worker simple; replace with a stable Lens result selector if Google exposes one.
    await run(["wait", "5000"], undefined, browserOptions);
    let currentUrl = await run(["get", "url"], undefined, browserOptions);
    const blocked = (value: string) =>
      /google\.com\/sorry|consent\.google\.com|recaptcha/i.test(value);

    if (blocked(currentUrl) && !useVisibleSession) {
      reportAttention(true);
      useVisibleSession = true;
      return searchGoogleLens(imageUrl, run, reportAttention, fetcher);
    }

    if (browserOptions?.headed && blocked(currentUrl)) {
      reportAttention(true);
      for (let attempt = 0; attempt < 18 && blocked(currentUrl); attempt += 1) {
        await run(["wait", "5000"], undefined, browserOptions);
        currentUrl = await run(["get", "url"], undefined, browserOptions);
      }
    }
    if (browserOptions?.headed && !blocked(currentUrl)) reportAttention(false);

    let exactUrl: URL;
    try {
      exactUrl = new URL(await run(["get", "url"], undefined, browserOptions));
      if (exactUrl.hostname !== "google.com" && !exactUrl.hostname.endsWith(".google.com")) {
        throw new Error("Unexpected Lens host");
      }
      exactUrl.searchParams.set("udm", "48");
    } catch {
      return {
        ok: false,
        error: {
          code: "lens-exact-matches-failed",
          message: "Google Lens konnte nicht auf „Genaue Übereinstimmungen“ umgestellt werden.",
        },
      };
    }
    await run(["open", exactUrl.toString()], undefined, browserOptions);
    await run(["wait", "1500"], undefined, browserOptions);
    if (!(await run(["eval", "--stdin"], verifyExactMatches, browserOptions)).includes("lens-exact-active")) {
      return {
        ok: false,
        error: {
          code: "lens-exact-matches-failed",
          message: "Google Lens konnte nicht auf „Genaue Übereinstimmungen“ umgestellt werden.",
        },
      };
    }
    const fullImageConfirmed = await selectFullImage(run, browserOptions);
    await run(["press", "Escape"], undefined, browserOptions);
    if (!fullImageConfirmed) {
      return {
        ok: false,
        error: {
          code: "lens-full-image-failed",
          message: "Google Lens konnte nicht auf die vollständige Bildfläche umgestellt werden.",
        },
      };
    }
    try {
      const fullImageUrl = new URL(await run(["get", "url"], undefined, browserOptions));
      const fullImageSelection = fullImageUrl.searchParams.get("vsint");
      fullImageUrl.searchParams.set("udm", "48");
      await run(["open", fullImageUrl.toString()], undefined, browserOptions);
      await run(["wait", "1500"], undefined, browserOptions);
      const confirmedUrl = new URL(await run(["get", "url"], undefined, browserOptions));
      if (fullImageSelection && confirmedUrl.searchParams.get("vsint") !== fullImageSelection) {
        throw new Error("Lens changed the full-image selection");
      }
    } catch {
      return {
        ok: false,
        error: {
          code: "lens-full-image-failed",
          message: "Google Lens hat die vollständige Bildauswahl nicht beibehalten.",
        },
      };
    }
    if (!(await run(["eval", "--stdin"], verifyExactMatches, browserOptions)).includes("lens-exact-active")) {
      return {
        ok: false,
        error: {
          code: "lens-exact-matches-failed",
          message: "Google Lens konnte nach der vollständigen Bildauswahl nicht auf „Genaue Übereinstimmungen“ umgestellt werden.",
        },
      };
    }

    const links = parseLinks(await run(["eval", "--stdin"], lensScript, browserOptions));
    const seen = new Set<string>();
    const matches: LensMatch[] = [];
    for (const link of links) {
      try {
        const resolvedUrl = isLensRedirectUrl(link.url)
          ? (await fetcher(link.url, { redirect: "manual" })).headers.get("location") ?? link.url
          : link.url;
        const cleanedUrl = resolvedUrl.replace(/&(ved|usg|sa|source)=.*/i, "");
        const url = new URL(cleanedUrl);
        url.hash = "";
        for (const key of ["ved", "usg", "sa", "source"]) {
          url.searchParams.delete(key);
        }
        const normalized = url.toString();
        if (!isLensPlatformUrl(normalized) || normalized === imageUrl || seen.has(normalized)) continue;
        seen.add(normalized);
        const publishedAt = lensDate(link.title ?? "");
        matches.push({
          url: normalized,
          title: link.title?.trim() || "Google-Lens-Fundstelle",
          match: "full",
          source: "lens",
          ...(publishedAt ? { lensPublishedAt: publishedAt } : {}),
        });
      } catch {
        // Ignore malformed links from the rendered result page.
      }
    }
    if (!matches.length) {
      if (blocked(currentUrl)) {
        return {
          ok: false,
          error: {
            code: "lens-captcha-required",
            message: "Google Lens ist blockiert. Bitte im geöffneten Browserfenster einmalig die Google-Bestätigung oder das CAPTCHA abschließen und die Recherche erneut starten.",
          },
        };
      }
      return {
        ok: false,
        error: {
          code: "lens-no-supported-links",
          message: "Google Lens lieferte keine direkten Links aus „Genau Übereinstimmungen“.",
        },
      };
    }
    return { ok: true, matches };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: "lens-search-failed",
        message: `Google Lens konnte nicht ausgelesen werden: ${error instanceof Error ? error.message : "unbekannter Fehler"}`,
      },
    };
  }
};
