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
import { renderHome } from "./home";

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
            lensRelativeDates: matches.filter((match) => match.lensRelativeDate).length,
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
