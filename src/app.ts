import {
  extractPost,
  parseSupportedPost,
  type PostExtractionResult,
  type SocialPost,
} from "./social-post";
import {
  searchGoogleLens,
  type LensAttentionReporter,
  type LensSearchResult,
} from "./lens";
import { buildFindings } from "./findings";
import { appendLog, type LogEvent } from "./log";

export type { PostExtractionResult, SocialPost } from "./social-post";
export type { LensSearchResult } from "./lens";

export type PreflightCheck = {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
  installHint?: string;
  required?: boolean;
};

export type PreflightResult = {
  ready: boolean;
  checks: PreflightCheck[];
};

type AppDependencies = {
  preflight?: () => Promise<PreflightResult>;
  extractPost?: (url: string) => Promise<PostExtractionResult>;
  searchLens?: (
    imageUrl: string,
    reportAttention: LensAttentionReporter,
  ) => Promise<LensSearchResult>;
  log?: (event: LogEvent) => Promise<void>;
};

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>'"]/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[character] ?? character,
  );

const runPreflight = async (): Promise<PreflightResult> => {
  const commandChecks = [
    ["yt-dlp", "yt-dlp", "brew install yt-dlp"],
    ["google-lens-browser", "agent-browser", "npm install -g agent-browser && agent-browser install"],
  ] as const;

  const checks: PreflightCheck[] = commandChecks.map(
    ([id, command, installHint]) => {
      const path = Bun.which(command);
      return {
        id,
        label: command,
        ok: Boolean(path),
        detail: path ? `Gefunden: ${path}` : "Nicht gefunden",
        installHint,
      };
    },
  );

  return {
    ready: checks.every((check) => check.ok),
    checks,
  };
};

const renderHome = (result: PreflightResult) => {
  const checks = result.checks
    .map(
      (check) => `
        <li class="check ${check.ok ? "ok" : "missing"}">
          <strong>${escapeHtml(check.label)}</strong>
          <span>${check.ok ? "Bereit" : check.required === false ? "Optional" : "Fehlt"}</span>
          <small>${escapeHtml(check.detail)}</small>
          ${
            check.ok || !check.installHint
              ? ""
              : `<code>${escapeHtml(check.installHint)}</code>`
          }
        </li>`,
    )
    .join("");

  const state = result.ready
    ? "Voraussetzungen erfüllt"
    : "Recherche gesperrt";
  const message = result.ready
    ? "Die Anwendung ist bereit für die nächste Recherche."
    : "Richte die fehlenden Voraussetzungen ein und prüfe danach erneut.";
  const researchForm = result.ready
    ? `
      <form id="research-form">
        <label for="post-url">Öffentliche Social-Media-Post- oder Video-URL</label>
        <input id="post-url" name="url" type="url" required placeholder="https://…">
        <button type="submit">Recherche starten</button>
        <button id="cancel-research" type="button" hidden>Recherche abbrechen</button>
      </form>
      <section id="research-result" aria-live="polite"></section>
      <script>
        const form = document.querySelector("#research-form");
        const result = document.querySelector("#research-result");
        const cancel = document.querySelector("#cancel-research");
        const phaseLabels = {
          video: "Video erkennen …",
          lens: "Google Lens durchsuchen … (bei Bedarf Bestätigung im Browserfenster)"
        };
        const attentionLabels = {
          captcha: "Google benötigt eine Bestätigung. Bitte das CAPTCHA im geöffneten Browserfenster lösen."
        };
        const contentLabels = {
          reddit: "Reddit-Post",
          x: "X-Post",
          instagram: "Instagram-Post",
          youtube: "YouTube-Video",
          threads: "Threads-Post",
          tiktok: "TikTok-Video",
          snapchat: "Snapchat-Video",
          facebook: "Facebook-Post"
        };
        const dateSourceLabels = {
          platform: "Plattform",
          lens: "Google Lens"
        };
        let lastUrl = "";
        let controller = null;
        let phaseTimer = null;
        const updatePhase = async () => {
          try {
            const response = await fetch("/api/research/status");
            const body = await response.json();
            if (body.active && body.phase) {
              result.textContent = body.attention
                ? attentionLabels[body.attention] ?? "Die Recherche benötigt deine Aufmerksamkeit."
                : phaseLabels[body.phase] ?? "Recherche läuft …";
            }
          } catch {
            // The research request remains the source of truth if status polling fails.
          }
        };
        const runResearch = async (url) => {
          lastUrl = url;
          controller = new AbortController();
          cancel.hidden = false;
          result.textContent = phaseLabels.video;
          phaseTimer = setInterval(updatePhase, 250);
          try {
            const response = await fetch("/api/research", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ url }),
              signal: controller.signal
            });
            const body = await response.json();
            if (!body.ok) {
              result.textContent = body.error.message;
              if (["extractor-error", "research-failed"].includes(body.error.code)) {
                const retry = document.createElement("button");
                retry.type = "button";
                retry.textContent = "Erneut versuchen";
                retry.addEventListener("click", () => runResearch(lastUrl));
                result.append(retry);
              }
              return;
            }
            result.innerHTML = "";
            const heading = document.createElement("h2");
            heading.textContent = body.post.title;
            const date = document.createElement("p");
            date.textContent = body.post.publishedAt ?? "Veröffentlichungszeitpunkt nicht ermittelbar";
            const link = document.createElement("a");
            link.href = body.post.url;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.textContent = (contentLabels[body.post.platform] ?? "Post") + " öffnen";
            const confidence = document.createElement("p");
            confidence.textContent = "Verlässlichkeit: " + body.confidence.level + " – " + body.confidence.reason;
            const repost = document.createElement("p");
            if (body.repostHint) {
              repost.textContent = body.repostHint;
            }
            const findingsSection = document.createElement("section");
            findingsSection.className = "findings-section";
            const findingsHeading = document.createElement("h3");
            findingsHeading.textContent = "Fundstellen";
            const tableWrap = document.createElement("div");
            tableWrap.className = "table-wrap";
            const findings = document.createElement("table");
            findings.className = "findings-table";
            findings.innerHTML =
              "<caption class='visually-hidden'>Fundstellen mit Datum und Verlässlichkeit</caption>" +
              "<thead><tr>" +
              "<th scope='col'>Fundstelle</th>" +
              "<th scope='col'>Datum</th>" +
              "<th scope='col'>Übereinstimmung</th>" +
              "<th scope='col'>Suchquelle</th>" +
              "<th scope='col'>Datumsquelle</th>" +
              "<th scope='col'>Verlässlichkeit</th>" +
              "<th scope='col'>Aktion</th>" +
              "</tr></thead><tbody></tbody>";
            const findingsBody = findings.querySelector("tbody");
            const makeCopyButton = (url, label) => {
              const copy = document.createElement("button");
              copy.type = "button";
              copy.textContent = label;
              copy.addEventListener("click", async () => {
                try {
                  await navigator.clipboard.writeText(url);
                  copy.textContent = "Kopiert";
                } catch {
                  copy.textContent = "Kopieren nicht möglich";
                }
              });
              return copy;
            };
            for (const finding of body.findings ?? []) {
              const item = document.createElement("tr");
              const findingLink = document.createElement("a");
              findingLink.href = finding.url;
              findingLink.target = "_blank";
              findingLink.rel = "noopener noreferrer";
              findingLink.textContent = finding.title;
              const dateText = finding.publishedAt ?? "Datum nicht ermittelbar";
              const matchText = finding.match === "submitted"
                ? "eingereichter Post"
                : "vollständige Bildübereinstimmung";
              const searchSourceText = finding.source === "submitted"
                ? "Eingereichter Post"
                : "Google Lens";
              const sourceText = finding.dateSource
                ? "Quelle: " + (dateSourceLabels[finding.dateSource] ?? finding.dateSource)
                : "Datum nicht ermittelbar";
              const earliestText = body.earliestFinding?.url === finding.url
                ? "Frühester plausibler Fund"
                : "";
              const sourceCell = document.createElement("td");
              sourceCell.prepend(findingLink);
              if (finding.originalUrl && finding.originalUrl !== finding.url) {
                const original = document.createElement("small");
                original.className = "original-fund";
                original.textContent = "Originale Such-URL: ";
                if (/^https?:\\/\\//i.test(finding.originalUrl)) {
                  const originalLink = document.createElement("a");
                  originalLink.href = finding.originalUrl;
                  originalLink.target = "_blank";
                  originalLink.rel = "noopener noreferrer";
                  originalLink.textContent = finding.originalUrl;
                  original.append(originalLink);
                } else {
                  original.append(document.createTextNode(finding.originalUrl));
                }
                sourceCell.append(original);
              }
              if (earliestText) {
                const earliest = document.createElement("strong");
                earliest.className = "earliest-fund";
                earliest.textContent = earliestText;
                sourceCell.append(earliest);
              }
              const dateCell = document.createElement("td");
              dateCell.textContent = dateText;
              const matchCell = document.createElement("td");
              matchCell.textContent = matchText;
              const searchSourceCell = document.createElement("td");
              searchSourceCell.textContent = searchSourceText;
              const sourceDateCell = document.createElement("td");
              sourceDateCell.textContent = sourceText;
              const reliabilityCell = document.createElement("td");
              reliabilityCell.textContent = finding.reliability;
              const actionCell = document.createElement("td");
              actionCell.append(makeCopyButton(finding.url, "URL kopieren"));
              if (finding.originalUrl && finding.originalUrl !== finding.url) {
                actionCell.append(makeCopyButton(finding.originalUrl, "Roh-URL kopieren"));
              }
              item.append(sourceCell, dateCell, matchCell, searchSourceCell, sourceDateCell, reliabilityCell, actionCell);
              findingsBody?.append(item);
            }
            if (!findingsBody?.children.length) {
              const empty = document.createElement("p");
              empty.textContent = "Keine konkreten Bildübereinstimmungen gefunden.";
              findingsSection.append(findingsHeading, empty);
            } else {
              tableWrap.append(findings);
              findingsSection.append(findingsHeading, tableWrap);
            }
            result.append(heading, date, link, confidence);
            if (body.repostHint) result.append(repost);
            if (body.lensMessage) {
              const lens = document.createElement("p");
              lens.textContent = body.lensMessage;
              result.append(lens);
            }
            result.append(findingsSection);
          } catch (error) {
            if (error.name !== "AbortError") {
              result.textContent = "Die Recherche konnte nicht abgeschlossen werden.";
              const retry = document.createElement("button");
              retry.type = "button";
              retry.textContent = "Erneut versuchen";
              retry.addEventListener("click", () => runResearch(lastUrl));
              result.append(retry);
            }
          } finally {
            clearInterval(phaseTimer);
            phaseTimer = null;
            cancel.hidden = true;
            controller = null;
          }
        };
        form.addEventListener("submit", (event) => {
          event.preventDefault();
          runResearch(form.elements.url.value);
        });
        cancel.addEventListener("click", async () => {
          try {
            await fetch("/api/research/cancel", { method: "POST" });
          } catch {
            // The local request may already have completed; aborting remains safe.
          } finally {
            controller?.abort();
            result.textContent = "Die Recherche wurde abgebrochen.";
          }
        });
      </script>`
    : "";

  return `<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Video Researcher</title>
    <style>
      :root { color-scheme: light dark; font: 16px/1.5 system-ui, sans-serif; }
      body { margin: 0; background: Canvas; color: CanvasText; }
      main { max-width: none; margin: 4rem 25px; padding: 0; }
      .checklist { padding: 0; list-style: none; }
      .check { display: grid; grid-template-columns: 1fr auto; gap: .2rem 1rem; padding: .9rem 0; border-bottom: 1px solid color-mix(in srgb, CanvasText 18%, transparent); }
      .check small, .check code { grid-column: 1 / -1; color: GrayText; }
      .ok span { color: #188038; }
      .missing span { color: #b3261e; }
      code { display: block; padding: .35rem .5rem; background: color-mix(in srgb, CanvasText 8%, transparent); overflow-wrap: anywhere; }
      a { color: LinkText; }
      form { display: grid; gap: .6rem; margin-top: 2rem; max-width: 44rem; }
      input, button { font: inherit; padding: .6rem .7rem; }
      button { justify-self: start; cursor: pointer; }
      #research-result { margin-top: 2rem; }
      .findings-section { margin-top: 2rem; }
      .findings-section h3 { margin: 0 0 .75rem; font-size: 1rem; }
      .table-wrap { overflow-x: auto; }
      .findings-table { width: 100%; min-width: 58rem; border-collapse: collapse; }
      .findings-table th, .findings-table td { padding: .7rem .65rem; border-bottom: 1px solid color-mix(in srgb, CanvasText 24%, transparent); text-align: left; vertical-align: top; }
      .findings-table th { font-size: .8rem; font-weight: 650; color: GrayText; white-space: nowrap; }
      .findings-table td:first-child { min-width: 15rem; }
      .findings-table td:nth-child(2), .findings-table td:nth-child(4), .findings-table td:nth-child(5), .findings-table td:last-child { white-space: nowrap; }
      .original-fund { display: block; margin-top: .4rem; overflow-wrap: anywhere; }
      .earliest-fund { display: block; margin-top: .25rem; color: oklch(.45 .074 200); font-size: .85rem; }
      .visually-hidden { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
      @media (prefers-color-scheme: dark) { .earliest-fund { color: oklch(.72 .074 200); } }
    </style>
  </head>
  <body>
    <main>
      <h1>Video Researcher</h1>
      <p>${escapeHtml(state)}</p>
      <p>${escapeHtml(message)}</p>
      <p><small>Das untersuchte Bild wird für die Bildsuche an Google Lens übertragen.</small></p>
      <ul class="checklist" aria-label="Voraussetzungen">${checks}</ul>
      <p><a href="/">Erneut prüfen</a></p>
      ${researchForm}
    </main>
  </body>
</html>`;
};

class ResearchCancelled extends Error {}

type ResearchPhase = "video" | "lens";
type ActiveResearch = {
  cancelled: boolean;
  phase: ResearchPhase;
  attention?: "captcha";
};

export const createApp = (dependencies: AppDependencies = {}) => {
  const preflight = dependencies.preflight ?? runPreflight;
  const extractPostFromUrl = dependencies.extractPost ?? extractPost;
  const searchLens =
    dependencies.searchLens ??
    (dependencies.preflight
      ? async (): Promise<LensSearchResult> => ({ ok: true, matches: [] })
      : (imageUrl: string, reportAttention: LensAttentionReporter) =>
          searchGoogleLens(imageUrl, undefined, reportAttention));
  const log = dependencies.log ?? appendLog;
  const record = async (event: LogEvent) => {
    try {
      await log(event);
    } catch {
      // Logging must never change the research result.
    }
  };
  let activeResearch: ActiveResearch | null = null;

  return {
    async fetch(request: Request): Promise<Response> {
      const url = new URL(request.url);

      if (request.method === "GET" && url.pathname === "/api/preflight") {
        return Response.json(await preflight(), {
          headers: { "cache-control": "no-store" },
        });
      }

      if (request.method === "GET" && url.pathname === "/") {
        return new Response(renderHome(await preflight()), {
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      }

      if (request.method === "GET" && url.pathname === "/api/research/status") {
        return Response.json(
          activeResearch
            ? {
                active: true,
                phase: activeResearch.phase,
                ...(activeResearch.attention
                  ? { attention: activeResearch.attention }
                  : {}),
              }
            : { active: false },
          { headers: { "cache-control": "no-store" } },
        );
      }

      if (request.method === "POST" && url.pathname === "/api/research/cancel") {
        if (!activeResearch) {
          return Response.json(
            { ok: false, error: { code: "no-active-research", message: "Keine Recherche läuft." } },
            { status: 404 },
          );
        }
        activeResearch.cancelled = true;
        return Response.json({ ok: true }, { status: 202 });
      }

      if (request.method === "POST" && url.pathname === "/api/research") {
        if (activeResearch) {
          return Response.json(
            { ok: false, error: { code: "research-active", message: "Eine Recherche läuft bereits." } },
            { status: 409 },
          );
        }

        const job: ActiveResearch = { cancelled: false, phase: "video" };
        activeResearch = job;
        const startedAt = performance.now();
        let lensMatches = 0;
        let lensErrorCode: string | undefined;
        const checkCancelled = () => {
          if (job.cancelled) throw new ResearchCancelled();
        };

        try {
          checkCancelled();
          const setup = await preflight();
          checkCancelled();
          if (!setup.ready) {
            return Response.json(
              {
                ok: false,
                error: {
                  code: "prerequisites-missing",
                  message: "Die lokalen Voraussetzungen sind noch nicht erfüllt.",
                },
              },
              { status: 503 },
            );
          }

          let body: unknown;
          try {
            body = await request.json();
          } catch {
            return Response.json(
              { ok: false, error: { code: "invalid-request", message: "Ungültige Anfrage." } },
              { status: 400 },
            );
          }

          const value =
            typeof body === "object" && body !== null && "url" in body
              ? body.url
              : undefined;
          if (typeof value !== "string" || !value.trim()) {
            return Response.json(
              {
                ok: false,
                error: { code: "invalid-request", message: "Bitte eine öffentliche Post- oder Video-URL eingeben." },
              },
              { status: 400 },
            );
          }

          const parsed = parseSupportedPost(value);
          if (!parsed.ok) {
            return Response.json(
              { ok: false, error: { code: "invalid-url", message: parsed.message } },
              { status: 422 },
            );
          }

          const extraction = await extractPostFromUrl(parsed.url.toString());
          checkCancelled();
          if (!extraction.ok) {
            await record({
              event: "research_failed",
              durationMs: Math.round(performance.now() - startedAt),
              errorCode: extraction.error.code,
            });
            return Response.json(extraction, { status: 422 });
          }
          let lensMessage: string | null = null;
          job.phase = "lens";
          checkCancelled();
          let lens: LensSearchResult;
          try {
            lens = await searchLens(extraction.post.thumbnailUrl, (required) => {
              job.attention = required ? "captcha" : undefined;
            });
          } catch (error) {
            lens = {
              ok: false,
              error: {
                code: "lens-search-failed",
                message: `Google Lens konnte nicht ausgelesen werden: ${error instanceof Error ? error.message : "unbekannter Fehler"}`,
              },
            };
          }
          checkCancelled();
          job.attention = undefined;
          const matches = lens.ok ? lens.matches : [];
          if (lens.ok) {
            lensMatches = lens.matches.length;
          } else {
            lensErrorCode = lens.error.code;
            lensMessage = lens.error.message;
          }

          checkCancelled();
          const summary = await buildFindings(extraction.post, matches);
          checkCancelled();
          await record({
            event: "research_completed",
            durationMs: Math.round(performance.now() - startedAt),
            lensMatches,
            lensErrorCode,
          });

          return Response.json({
            ok: true,
            post: extraction.post,
            matches,
            ...summary,
            lensMessage,
          });
        } catch (error) {
          if (error instanceof ResearchCancelled) {
            await record({
              event: "research_failed",
              durationMs: Math.round(performance.now() - startedAt),
              errorCode: "research-cancelled",
            });
            return Response.json(
              { ok: false, error: { code: "research-cancelled", message: "Die Recherche wurde abgebrochen." } },
              { status: 499 },
            );
          }
          await record({
            event: "research_failed",
            durationMs: Math.round(performance.now() - startedAt),
            errorCode: "research-failed",
          });
          return Response.json(
            { ok: false, error: { code: "research-failed", message: "Die Recherche konnte nicht abgeschlossen werden." } },
            { status: 502 },
          );
        } finally {
          if (activeResearch === job) activeResearch = null;
        }
      }

      return new Response("Not found", { status: 404 });
    },
  };
};

export { runPreflight };
