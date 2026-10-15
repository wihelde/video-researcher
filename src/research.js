const form = document.querySelector("#research-form");
const input = document.querySelector("#post-url");
const result = document.querySelector("#research-result");
const status = document.querySelector("#research-status");
const submit = document.querySelector("#start-research");
const cancel = document.querySelector("#cancel-research");
const phaseLabels = {
  video: "Video erkennen …",
  lens: "Google Lens durchsuchen …",
};
const contentLabels = {
  reddit: "Reddit-Post", x: "X-Post", instagram: "Instagram-Post",
  youtube: "YouTube-Video", threads: "Threads-Post", tiktok: "TikTok-Video",
  snapchat: "Snapchat-Video", facebook: "Facebook-Post",
};
const reliabilityLabels = { high: "Hoch", medium: "Mittel", low: "Gering", "not-evaluable": "Nicht bewertbar" };
const dateSourceLabels = { platform: "Plattformdaten", lens: "Google Lens" };
let activeRun = null;
let lastUrl = "";

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function setStatus(text, tone = "") {
  status.replaceChildren(document.createTextNode(text));
  status.dataset.tone = tone;
}

function externalLink(url, text, className) {
  const link = element("a", text, className);
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  return link;
}

/** Preserve date-only precision; show exact timestamps in the user's local time. */
function dateLabel(value, precision = "date") {
  if (!value) return "Datum nicht ermittelbar";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Datum nicht ermittelbar";
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit", month: "short", year: "numeric",
    ...(precision === "instant" ? { hour: "2-digit", minute: "2-digit", timeZoneName: "short" } : { timeZone: "UTC" }),
  }).format(date);
}

function dateElement(finding, className) {
  const label = dateLabel(finding.publishedAt, finding.publishedAtPrecision);
  const node = element(finding.publishedAt ? "time" : "span", finding.relativeDate ? "ca. " + label : label, className);
  if (finding.publishedAt) {
    node.dateTime = finding.publishedAt;
    node.title = finding.relativeDate ? finding.publishedAt + " (" + finding.relativeDate + ")" : finding.publishedAt;
  }
  return node;
}

function dateSourceLabel(finding) {
  const source = dateSourceLabels[finding.dateSource] ?? "Unbekannt";
  return finding.relativeDate ? source + " · " + finding.relativeDate : source;
}

function makeCopyButton(url, label) {
  const copy = element("button", label, "copy-button");
  copy.type = "button";
  copy.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(url);
      copy.textContent = "Kopiert";
      setStatus("URL in die Zwischenablage kopiert.");
    } catch {
      copy.textContent = "Nicht kopiert";
      setStatus("Kopieren nicht möglich. Öffne die Fundstelle und kopiere die URL aus der Adresszeile.", "error");
    }
    setTimeout(() => { copy.textContent = label; }, 1800);
  });
  return copy;
}

function showError(message, retry = false) {
  setStatus(message, "error");
  if (retry) {
    const button = element("button", "Erneut versuchen");
    button.type = "button";
    button.addEventListener("click", () => runResearch(lastUrl));
    status.append(button);
  }
}

/** Group evidence next to the claim it supports, while keeping every finding inspectable. */
function renderFindings(body) {
  result.replaceChildren();
  const summary = element("div", null, "research-summary");
  const earliest = element("div");
  earliest.append(element("h2", "Frühester plausibler Fund", "summary-label"));
  if (body.earliestFinding) {
    earliest.append(dateElement(body.earliestFinding, "summary-date"));
    earliest.append(externalLink(body.earliestFinding.url, body.earliestFinding.title, "summary-link"));
    earliest.append(element("p", "Datumsquelle: " + dateSourceLabel(body.earliestFinding), "summary-note"));
  } else {
    earliest.append(element("p", "Kein datierter Fund", "submitted-title"));
  }
  const submitted = element("div");
  submitted.append(element("h2", "Eingereichter Post", "summary-label"));
  submitted.append(element("p", body.post.title, "submitted-title"));
  submitted.append(dateElement({ publishedAt: body.post.publishedAt, publishedAtPrecision: body.post.publishedAt?.includes("T") ? "instant" : "date" }, "cell-detail"));
  submitted.append(externalLink(body.post.url, (contentLabels[body.post.platform] ?? "Post") + " öffnen ↗", "summary-link"));
  summary.append(earliest, submitted);
  result.append(summary);

  const notes = element("div", null, "research-notes");
  notes.append(element("p", "Verlässlichkeit: " + (reliabilityLabels[body.confidence.level] ?? "Nicht bewertbar") + ". " + body.confidence.reason));
  if (body.repostHint) notes.append(element("p", body.repostHint));
  if (body.lensMessage) notes.append(element("p", body.lensMessage));
  result.append(notes);

  const findings = body.findings ?? [];
  const section = element("section", null, "findings-section");
  section.setAttribute("aria-labelledby", "findings-heading");
  const headingRow = element("div", null, "section-heading");
  const heading = element("h2", "Fundstellen");
  heading.id = "findings-heading";
  heading.append(element("span", String(findings.length), "finding-count"));
  headingRow.append(heading, element("span", "Älteste zuerst · Ohne Datum zuletzt"));
  section.append(headingRow);
  if (!findings.length) {
    section.append(element("p", "Keine konkreten Bildübereinstimmungen gefunden.", "empty-state"));
    result.append(section);
    return;
  }
  const tableWrap = element("div", null, "table-wrap");
  tableWrap.tabIndex = 0;
  tableWrap.setAttribute("role", "region");
  tableWrap.setAttribute("aria-label", "Fundstellen, horizontal scrollbar");
  const table = element("table", null, "findings-table");
  const caption = element("caption", "Fundstellen mit Datum, Datumsquelle und Verlässlichkeit");
  caption.className = "visually-hidden";
  const head = element("thead");
  const headRow = element("tr");
  for (const label of ["Fundstelle", "Datum", "Übereinstimmung", "Verlässlichkeit", "Aktion"]) {
    const cell = element("th", label);
    cell.scope = "col";
    headRow.append(cell);
  }
  head.append(headRow);
  const tbody = element("tbody");
  for (const finding of findings) {
    const row = element("tr");
    const source = element("td");
    source.append(externalLink(finding.url, finding.title, "finding-link"));
    const host = new URL(finding.url).hostname.replace(/^www\./, "");
    source.append(element("span", host + " · " + (finding.source === "submitted" ? "Eingereichter Post" : "Google Lens"), "cell-detail"));
    if (body.earliestFinding?.url === finding.url) {
      row.className = "is-earliest";
      source.append(element("strong", "Frühester plausibler Fund", "earliest-fund"));
    }
    if (finding.originalUrl && finding.originalUrl !== finding.url) {
      const original = element("details", null, "original-fund");
      original.append(element("summary", "Originale Such-URL"));
      if (/^https?:\/\//i.test(finding.originalUrl)) {
        original.append(externalLink(finding.originalUrl, finding.originalUrl));
      } else {
        original.append(element("span", finding.originalUrl));
      }
      original.append(makeCopyButton(finding.originalUrl, "Roh-URL kopieren"));
      source.append(original);
    }
    const date = element("td");
    date.append(dateElement(finding));
    date.append(element("span", finding.dateSource ? "Quelle: " + dateSourceLabel(finding) : "Keine Datumsquelle", "cell-detail"));
    const match = element("td", finding.match === "submitted" ? "Eingereichter Post" : "Vollständige Bildübereinstimmung");
    const reliability = element("td", reliabilityLabels[finding.reliability] ?? "Nicht bewertbar");
    const actions = element("td");
    const copy = makeCopyButton(finding.url, "URL kopieren");
    copy.setAttribute("aria-label", "URL kopieren: " + finding.title);
    actions.append(copy);
    row.append(source, date, match, reliability, actions);
    tbody.append(row);
  }
  table.append(caption, head, tbody);
  tableWrap.append(table);
  section.append(tableWrap);
  result.append(section);
}

/** Ignore late status responses after completion or cancellation. */
async function updatePhase(run) {
  if (activeRun !== run || run.cancelRequested || run.polling) return;
  run.polling = true;
  try {
    const response = await fetch("/api/research/status");
    const body = await response.json();
    if (activeRun !== run || run.cancelRequested || !body.active) return;
    if (body.attention) {
      const label = "Google benötigt eine Bestätigung. Bitte das CAPTCHA im geöffneten Browserfenster lösen.";
      if (status.textContent !== label) setStatus(label);
    } else if (body.phase) {
      const label = phaseLabels[body.phase] ?? "Recherche läuft …";
      if (status.textContent !== label) setStatus(label, "working");
    }
  } catch {
    // The research response remains authoritative if status polling fails.
  } finally {
    run.polling = false;
  }
}

async function runResearch(url) {
  if (activeRun) return;
  lastUrl = url;
  const run = { cancelRequested: false, polling: false };
  activeRun = run;
  const moveFocus = document.activeElement === submit;
  submit.hidden = true;
  cancel.hidden = false;
  cancel.disabled = false;
  input.readOnly = true;
  input.removeAttribute("aria-invalid");
  input.setAttribute("aria-describedby", "url-help privacy-note");
  result.setAttribute("aria-busy", "true");
  if (moveFocus) cancel.focus();
  setStatus(phaseLabels.video, "working");
  const timer = setInterval(() => updatePhase(run), 500);
  try {
    const response = await fetch("/api/research", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const body = await response.json();
    // Stop polling before rendering so a late poll cannot overwrite the outcome.
    activeRun = null;
    if (!body.ok) {
      if (body.error.code === "research-cancelled") {
        setStatus("Die Recherche wurde abgebrochen.");
      } else {
        if (["invalid-url", "invalid-request"].includes(body.error.code)) {
          input.setAttribute("aria-invalid", "true");
          input.setAttribute("aria-describedby", "url-help privacy-note research-status");
        }
        showError(body.error.message, ["extractor-error", "research-failed"].includes(body.error.code));
      }
      return;
    }
    renderFindings(body);
    setStatus("Recherche abgeschlossen. " + (body.findings?.length ?? 0) + " Fundstellen.");
  } catch {
    activeRun = null;
    showError("Die Recherche konnte nicht abgeschlossen werden.", true);
  } finally {
    clearInterval(timer);
    activeRun = null;
    result.removeAttribute("aria-busy");
    const restoreFocus = document.activeElement === cancel || run.restoreFocus;
    submit.hidden = false;
    cancel.hidden = true;
    input.readOnly = false;
    if (restoreFocus) submit.focus();
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  runResearch(input.value.trim());
});
input.addEventListener("input", () => {
  input.removeAttribute("aria-invalid");
  input.setAttribute("aria-describedby", "url-help privacy-note");
});
cancel.addEventListener("click", async () => {
  const run = activeRun;
  if (!run || run.cancelRequested) return;
  run.cancelRequested = true;
  run.restoreFocus = document.activeElement === cancel;
  cancel.disabled = true;
  setStatus("Recherche wird abgebrochen …");
  try {
    const response = await fetch("/api/research/cancel", { method: "POST" });
    if (!response.ok && activeRun === run) throw new Error("Cancellation failed");
  } catch {
    if (activeRun !== run) return;
    run.cancelRequested = false;
    cancel.disabled = false;
    showError("Abbruch nicht bestätigt. Bitte erneut abbrechen oder das Ergebnis abwarten.");
  }
});
