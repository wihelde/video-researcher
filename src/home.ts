import type { PreflightResult } from "./app";
import styles from "./home.css" with { type: "text" };
import script from "./research.js" with { type: "text" };

const escapeHtml = (value: string) =>
  value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  })[character] ?? character);

/** Renders the research workspace, with setup details disclosed only when needed. */
export const renderHome = (result: PreflightResult) => {
  const checks = result.checks.map((check) => `
    <li class="check ${check.ok ? "ok" : "missing"}">
      <strong>${escapeHtml(check.label)}</strong>
      <span>${check.ok ? "Bereit" : check.required === false ? "Optional" : "Fehlt"}</span>
      <small>${escapeHtml(check.detail)}</small>
      ${!check.ok && check.installHint ? `<code>${escapeHtml(check.installHint)}</code>` : ""}
    </li>`).join("");

  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <title>Video Researcher</title>
  <style>${styles}</style>
</head>
<body>
  <a class="skip-link" href="#workspace">Zur Recherche</a>
  <header class="toolbar">
    <div class="toolbar-content">
      <span class="app-name">Video Researcher</span>
      <span class="local-status">Lokal auf diesem Mac</span>
    </div>
  </header>
  <main id="workspace" tabindex="-1">
    <section class="research-input" aria-labelledby="research-heading">
      <h1 id="research-heading">Frühere Fundstellen finden</h1>
      <p class="intro">Öffentlichen Post prüfen und visuelle Fundstellen zeitlich einordnen.</p>
      ${result.ready ? "" : '<p class="setup-warning">Recherche gesperrt. <a href="#setup">Fehlende Voraussetzungen einrichten</a>.</p>'}
      <form id="research-form" aria-label="Video recherchieren">
        <label for="post-url">Post- oder Video-URL</label>
        <div class="input-row">
          <input id="post-url" name="url" type="url" required placeholder="https://www.reddit.com/r/…/comments/…" autocomplete="off" spellcheck="false" aria-describedby="url-help privacy-note" ${result.ready ? "" : "disabled"}>
          <button class="primary" id="start-research" type="submit" ${result.ready ? "" : "disabled"}>Recherche starten</button>
          <button id="cancel-research" type="button" hidden>Recherche abbrechen</button>
        </div>
        <div class="input-help">
          <details id="url-help">
            <summary>Unterstützte Plattformen</summary>
            <p>Reddit, X, Instagram, YouTube, Threads, TikTok, Snapchat und Facebook. Einzelne öffentliche Posts und Videos, keine Profile oder Sammlungen.</p>
          </details>
          <p id="privacy-note">Das Vorschaubild wird an Google Lens übertragen.</p>
        </div>
      </form>
    </section>
    <p id="research-status" class="research-status" role="status" aria-live="polite" aria-atomic="true"></p>
    <section id="research-result" aria-label="Rechercheergebnis">
      <div class="section-heading"><h2>Fundstellen</h2><span>Älteste zuerst</span></div>
      <div class="empty-state">
        <p>Noch keine Recherche</p>
        <p>Füge eine URL ein. Hier erscheinen die Fundstellen mit Datum und Datumsquelle.</p>
      </div>
    </section>
    <footer class="workspace-footer">
      <p>Ein früher Fund ist kein Beweis für den Ursprung des Videos.</p>
      <p>Ergebnisse bleiben bis zum Neuladen sichtbar.</p>
      <details id="setup" class="setup" ${result.ready ? "" : "open"}>
        <summary class="${result.ready ? "ok" : "missing"}">${result.ready ? "Voraussetzungen erfüllt" : "Recherche gesperrt"}</summary>
        ${result.ready ? "" : "<p>Richte die fehlenden Voraussetzungen ein und prüfe danach erneut.</p>"}
        <ul class="checklist" aria-label="Voraussetzungen">${checks}</ul>
        <a href="/">Erneut prüfen</a>
      </details>
    </footer>
  </main>
  ${result.ready ? `<script>${script}</script>` : ""}
</body>
</html>`;
};
