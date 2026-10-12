import { appendFile } from "node:fs/promises";

export type LogEvent = {
  event: "research_completed" | "research_failed";
  durationMs: number;
  lensMatches?: number;
  lensErrorCode?: string;
  errorCode?: string;
};

export const appendLog = async (
  event: LogEvent,
  path = process.env.VIDEO_RESEARCHER_LOG_FILE ?? ".video-researcher.log",
) => {
  try {
    await appendFile(path, `${JSON.stringify(event)}\n`, "utf8");
  } catch {
    // Logging must not turn a completed research into an error.
  }
};
