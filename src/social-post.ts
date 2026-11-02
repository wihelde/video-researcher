export type SourcePlatform =
  | "reddit"
  | "x"
  | "instagram"
  | "youtube"
  | "threads"
  | "tiktok"
  | "snapchat"
  | "facebook";

export type SocialPost = {
  url: string;
  platform: SourcePlatform;
  title: string;
  publishedAt: string | null;
  thumbnailUrl: string;
};

export type PostExtractionResult =
  | { ok: true; post: SocialPost }
  | { ok: false; error: { code: string; message: string } };

type YtDlpInfo = {
  _type?: string;
  title?: string;
  thumbnail?: string;
  thumbnails?: Array<{ url?: string }>;
  timestamp?: number;
  upload_date?: string;
  duration?: number;
  url?: string;
  filesize?: number;
  filesize_approx?: number;
  vcodec?: string;
  webpage_url?: string;
  formats?: Array<{ vcodec?: string }>;
  entries?: unknown[];
};

const supportedHosts = new Map<string, SourcePlatform>([
  ["reddit.com", "reddit"],
  ["www.reddit.com", "reddit"],
  ["old.reddit.com", "reddit"],
  ["redd.it", "reddit"],
  ["v.redd.it", "reddit"],
  ["x.com", "x"],
  ["www.x.com", "x"],
  ["twitter.com", "x"],
  ["www.twitter.com", "x"],
  ["instagram.com", "instagram"],
  ["www.instagram.com", "instagram"],
  ["youtube.com", "youtube"],
  ["www.youtube.com", "youtube"],
  ["m.youtube.com", "youtube"],
  ["youtu.be", "youtube"],
  ["threads.com", "threads"],
  ["www.threads.com", "threads"],
  ["threads.net", "threads"],
  ["www.threads.net", "threads"],
  ["tiktok.com", "tiktok"],
  ["www.tiktok.com", "tiktok"],
  ["vm.tiktok.com", "tiktok"],
  ["vt.tiktok.com", "tiktok"],
  ["snapchat.com", "snapchat"],
  ["www.snapchat.com", "snapchat"],
  ["facebook.com", "facebook"],
  ["www.facebook.com", "facebook"],
  ["m.facebook.com", "facebook"],
  ["fb.watch", "facebook"],
]);

export const sourcePlatformLabel = (platform: SourcePlatform) =>
  ({
    reddit: "Reddit",
    x: "X",
    instagram: "Instagram",
    youtube: "YouTube",
    threads: "Threads",
    tiktok: "TikTok",
    snapchat: "Snapchat",
    facebook: "Facebook",
  })[platform];

const platformForHost = (host: string) => supportedHosts.get(host.toLowerCase());

export const parseSupportedPost = (value: string) => {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return { ok: false as const, message: "Die URL ist ungültig." };
  }

  if (!/^https?:$/.test(url.protocol)) {
    return { ok: false as const, message: "Nur HTTP- und HTTPS-URLs sind erlaubt." };
  }

  const host = url.hostname.toLowerCase();
  const platform = platformForHost(host);
  if (!platform) {
    return {
      ok: false as const,
      message: "Die URL gehört nicht zu einer unterstützten Plattform.",
    };
  }

  const segments = url.pathname.split("/").filter(Boolean);
  const isRedditShortLink =
    platform === "reddit" && ["redd.it", "v.redd.it"].includes(host) && segments.length === 1;
  const commentsIndex = segments.indexOf("comments");
  const isRedditPost =
    platform === "reddit" &&
    (isRedditShortLink || (commentsIndex >= 0 && Boolean(segments[commentsIndex + 1])));
  const isIndividualPost =
    isRedditPost ||
    (platform === "x" && segments[1] === "status" && Boolean(segments[2])) ||
    (platform === "instagram" && ["p", "reel", "reels", "tv"].includes(segments[0] ?? "") && Boolean(segments[1])) ||
    (platform === "youtube" && (
      (host === "youtu.be" && Boolean(segments[0])) ||
      url.searchParams.has("v") ||
      (["shorts", "live", "embed"].includes(segments[0] ?? "") && Boolean(segments[1]))
    )) ||
    (platform === "threads" && segments[0]?.startsWith("@") && segments[1] === "post" && Boolean(segments[2])) ||
    (platform === "tiktok" && (
      (["vm.tiktok.com", "vt.tiktok.com"].includes(host) && Boolean(segments[0])) ||
      (segments[0]?.startsWith("@") && ["video", "photo"].includes(segments[1] ?? "") && Boolean(segments[2]))
    )) ||
    (platform === "snapchat" && segments[0] === "spotlight" && Boolean(segments[1])) ||
    (platform === "facebook" && (
      (host === "fb.watch" && Boolean(segments[0])) ||
      (segments[0] === "reel" && Boolean(segments[1])) ||
      (segments[0] === "watch" && url.searchParams.has("v")) ||
      (segments.includes("videos") && Boolean(segments[segments.indexOf("videos") + 1])) ||
      (segments[0] === "share" && ["r", "v"].includes(segments[1] ?? "") && Boolean(segments[2]))
    ));
  if (!isIndividualPost) {
    return {
      ok: false as const,
      message: "Bitte eine URL zu genau einem öffentlichen Post oder Video eingeben.",
    };
  }

  url.hash = "";
  return { ok: true as const, url, platform };
};

const publishedAtFrom = (info: YtDlpInfo) => {
  if (typeof info.timestamp === "number") {
    return new Date(info.timestamp * 1000).toISOString();
  }

  if (info.upload_date && /^\d{8}$/.test(info.upload_date)) {
    const date = info.upload_date;
    return `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;
  }

  return null;
};

const hasVideo = (info: YtDlpInfo) =>
  info.vcodec !== "none" &&
  (Boolean(info.vcodec) ||
    (Array.isArray(info.formats) &&
      info.formats.some((format) => format.vcodec && format.vcodec !== "none")) ||
    typeof info.duration === "number");

export const parseYtDlpOutput = (stdout: string): YtDlpInfo | null => {
  const start = stdout.indexOf("{");
  const end = stdout.lastIndexOf("}");
  if (start < 0 || end <= start) return null;

  try {
    return JSON.parse(stdout.slice(start, end + 1)) as YtDlpInfo;
  } catch {
    return null;
  }
};

const htmlAttribute = (tag: string, name: string) =>
  tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, "i"))?.[1]?.trim() ?? null;

const decodeMarkup = (value: string) =>
  value
    .replace(/&amp;/gi, "&")
    .replace(/&#x2F;/gi, "/")
    .replace(/\\u0026/gi, "&")
    .replace(/\\\//g, "/")
    .replace(/\\"/g, '"');

const metaValue = (html: string, key: string) => {
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = match[0];
    if (
      htmlAttribute(tag, "property")?.toLowerCase() === key.toLowerCase() ||
      htmlAttribute(tag, "name")?.toLowerCase() === key.toLowerCase()
    ) {
      const content = htmlAttribute(tag, "content");
      if (content) return decodeMarkup(content);
    }
  }
  return null;
};

const embeddedValue = (html: string, keys: string[]) => {
  for (const key of keys) {
    const escapedKey = key.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&");
    const direct = html.match(
      new RegExp(`["']${escapedKey}["']\\s*:\\s*["']([^"']+)["']`, "i"),
    )?.[1];
    if (direct) return decodeMarkup(direct);

    const nested = html.match(
      new RegExp(
        `["']${escapedKey}["']\\s*:\\s*\\[\\s*\\{[^}]*?["']url["']\\s*:\\s*["']([^"']+)["']`,
        "i",
      ),
    )?.[1];
    if (nested) return decodeMarkup(nested);
  }
  return null;
};

const titleFromHtml = (html: string) =>
  decodeMarkup(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? "");

const publishedAtFromValue = (value: string | null) => {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : new Date(timestamp).toISOString();
};

const runYtDlp = async (url: string, browser?: string) => {
  const process = Bun.spawn(
    [
      "yt-dlp",
      "--ignore-config",
      "--dump-single-json",
      "--no-download",
      "--no-playlist",
      "--no-warnings",
      ...(browser ? ["--cookies-from-browser", browser] : []),
      url,
    ],
    { stdout: "pipe", stderr: "pipe" },
  );
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
    process.exited,
  ]);
  return { info: parseYtDlpOutput(stdout), stderr, exitCode };
};

type ThreadsFetcher = (url: string) => Promise<Response>;

export const extractThreadsPost = async (
  value: string,
  fetcher: ThreadsFetcher = (url) =>
    fetch(url, {
      redirect: "follow",
      headers: { "user-agent": "VideoResearcher/0.1" },
      signal: AbortSignal.timeout(8_000),
    }),
): Promise<PostExtractionResult> => {
  const parsed = parseSupportedPost(value);
  if (!parsed.ok || parsed.platform !== "threads") {
    return {
      ok: false,
      error: { code: "invalid-url", message: parsed.ok ? "Die URL gehört nicht zu Threads." : parsed.message },
    };
  }

  try {
    const response = await fetcher(parsed.url.toString());
    if (!response.ok) {
      return {
        ok: false,
        error: {
          code: response.status === 401 || response.status === 403 ? "access-denied" : "extractor-error",
          message:
            response.status === 401 || response.status === 403
              ? "Dieser Threads-Post ist nicht öffentlich erreichbar."
              : "Der Threads-Post konnte nicht ausgelesen werden.",
        },
      };
    }

    if (response.url) {
      const finalHost = new URL(response.url).hostname;
      if (platformForHost(finalHost) !== "threads") {
        return {
          ok: false,
          error: { code: "access-denied", message: "Dieser Threads-Post ist nicht öffentlich erreichbar." },
        };
      }
    }

    const html = await response.text();
    const thumbnailUrl =
      metaValue(html, "og:image") ??
      metaValue(html, "twitter:image") ??
      embeddedValue(html, ["image_url", "thumbnail_url", "display_url"]);
    const videoUrl =
      metaValue(html, "og:video:secure_url") ??
      metaValue(html, "og:video") ??
      metaValue(html, "og:video:url") ??
      metaValue(html, "twitter:player:stream") ??
      embeddedValue(html, ["video_url", "videoUrl", "playback_url", "video_versions"]);
    if (!thumbnailUrl || !videoUrl) {
      return {
        ok: false,
        error: {
          code: "no-video",
          message: "Der Threads-Post enthält kein öffentlich auslesbares Einzelvideo.",
        },
      };
    }

    return {
      ok: true,
      post: {
        url: parsed.url.toString(),
        platform: "threads",
        title:
          (metaValue(html, "og:title") ?? metaValue(html, "twitter:title") ?? titleFromHtml(html)) ||
          "Threads-Post",
        publishedAt: publishedAtFromValue(metaValue(html, "article:published_time") ?? metaValue(html, "date")),
        thumbnailUrl,
      },
    };
  } catch {
    return {
      ok: false,
      error: { code: "extractor-error", message: "Der Threads-Post konnte nicht ausgelesen werden." },
    };
  }
};

type ParsedPost = { url: URL; platform: SourcePlatform };

const extractWithYtDlp = async (parsed: ParsedPost, run = runYtDlp): Promise<PostExtractionResult> => {
  const browser = parsed.platform === "reddit"
    ? process.env.VIDEO_RESEARCHER_REDDIT_BROWSER?.trim() || undefined
    : undefined;
  const { info, stderr, exitCode } = await run(parsed.url.toString(), browser);

  if (exitCode !== 0) {
    if (browser && /cookies database|failed to decrypt|could not copy.*cookie|keyring|keychain/i.test(stderr)) {
      return {
        ok: false,
        error: {
          code: "browser-session-unavailable",
          message: "Die eingerichtete Browsersitzung für Reddit konnte nicht gelesen werden. Prüfe Browserprofil und Zugriffsrechte und versuche es erneut.",
        },
      };
    }
    const accessRequired = /login|sign in|authenticat|private|age.?restrict|HTTP Error (401|403)|unable to access the Reddit API/i.test(stderr);
    if (parsed.platform === "reddit" && accessRequired) {
      return {
        ok: false,
        error: {
          code: "access-denied",
          message: browser
            ? "Reddit blockiert den automatischen Abruf weiterhin. Öffne den Post im eingerichteten Browser, prüfe dort deine Anmeldung oder eine Sicherheitsabfrage und versuche es erneut."
            : "Reddit blockiert den automatischen Abruf. Richte eine Browsersitzung für Reddit ein und versuche es erneut.",
        },
      };
    }
    const label = sourcePlatformLabel(parsed.platform);
    return {
      ok: false,
      error: {
        code: accessRequired ? "access-denied" : "extractor-error",
        message: accessRequired
          ? `Dieser ${label}-Post erfordert Anmeldung oder Altersfreigabe.`
          : `Der ${label}-Post konnte nicht ausgelesen werden.`,
      },
    };
  }

  if (!info) {
    return {
      ok: false,
      error: {
        code: "extractor-error",
        message: `${sourcePlatformLabel(parsed.platform)} hat keine verwertbaren Post-Metadaten geliefert.`,
      },
    };
  }

  if (info._type === "playlist" || (info.entries && info.entries.length > 0)) {
    return {
      ok: false,
      error: {
        code: "unsupported-post",
        message: "Galerien, Playlists und Posts mit mehreren Medien werden noch nicht unterstützt.",
      },
    };
  }

  const thumbnailUrl = info.thumbnail ?? info.thumbnails?.at(-1)?.url;
  if (!thumbnailUrl || !hasVideo(info)) {
    return {
      ok: false,
      error: {
        code: "no-video",
        message: `Der ${sourcePlatformLabel(parsed.platform)}-Post enthält kein einzelnes untersuchbares Video.`,
      },
    };
  }

  return {
    ok: true,
    post: {
      url: info.webpage_url ?? parsed.url.toString(),
      platform: parsed.platform,
      title: info.title ?? `Unbenannter ${sourcePlatformLabel(parsed.platform)}-Post`,
      publishedAt: publishedAtFrom(info),
      thumbnailUrl,
    },
  };
};

export const extractPost = async (value: string, run = runYtDlp): Promise<PostExtractionResult> => {
  const parsed = parseSupportedPost(value);
  if (!parsed.ok) {
    return { ok: false, error: { code: "invalid-url", message: parsed.message } };
  }
  return parsed.platform === "threads"
    ? extractThreadsPost(parsed.url.toString())
    : extractWithYtDlp(parsed, run);
};
