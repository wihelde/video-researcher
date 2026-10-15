import { appendFile, rename, stat } from "node:fs/promises";

const MAX_LOG_BYTES = 5 * 1024 * 1024;

export type LogEvent = {
  event: "research_completed" | "research_failed";
  durationMs: number;
  lensMatches?: number;
  lensRelativeDates?: number;
  lensErrorCode?: string;
  errorCode?: string;
};

export const appendLog = async (
  event: LogEvent,
  path = process.env.VIDEO_RESEARCHER_LOG_FILE ?? ".video-researcher.log",
) => {
  try {
    const line = `${JSON.stringify(event)}\n`;
    const size = await stat(path).then(
      (file) => file.size,
      (error: unknown) => {
        if (error instanceof Error && "code" in error && error.code === "ENOENT") return 0;
        throw error;
      },
    );
    if (size > 0 && size + Buffer.byteLength(line, "utf8") > MAX_LOG_BYTES) {
      // Replace the single backup before appending, keeping each entry intact.
      await rename(path, `${path}.1`);
    }
    await appendFile(path, line, "utf8");
  } catch {
    // Logging must not turn a completed research into an error.
  }
};
