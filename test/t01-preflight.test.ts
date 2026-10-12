import { expect, test } from "bun:test";
import { createApp, type PreflightResult } from "../src/app";

test("shows concrete setup help when a prerequisite is missing", async () => {
  const preflight: PreflightResult = {
    ready: false,
    checks: [
      {
        id: "google-lens-browser",
        label: "agent-browser",
        ok: false,
        detail: "Nicht gefunden",
        installHint: "npm install -g agent-browser && agent-browser install",
      },
    ],
  };

  const app = createApp({ preflight: async () => preflight });
  const response = await app.fetch(new Request("http://localhost/"));
  const html = await response.text();

  expect(response.status).toBe(200);
  expect(html).toContain("agent-browser");
  expect(html).toContain("npm install -g agent-browser");
  expect(html).toContain("Erneut prüfen");
  expect(html).toContain("Recherche gesperrt");
});

test("marks the setup as ready when all prerequisites pass", async () => {
  const preflight: PreflightResult = {
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

  const app = createApp({ preflight: async () => preflight });
  const response = await app.fetch(new Request("http://localhost/"));
  const html = await response.text();

  expect(response.status).toBe(200);
  expect(html).toContain("Voraussetzungen erfüllt");
  expect(html).not.toContain("Recherche gesperrt");
});
