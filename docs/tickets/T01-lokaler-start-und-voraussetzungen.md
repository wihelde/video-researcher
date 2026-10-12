# T01 – Lokaler Start und Voraussetzungen

**Typ:** AFK  
**Status:** done  
**Parent spec:** [SPEC.md](../../SPEC.md)  
**Blocked by:** None — can start immediately

## User Stories addressed

- User story 29
- User story 33

## What to build

Eine deutschsprachige lokale Startprozedur und Startseite, die die für Video Researcher benötigten Voraussetzungen prüft und den Nutzer bei fehlenden Werkzeugen zur Einrichtung führt.

## Acceptance criteria

- Die Anwendung startet ausschließlich lokal auf `127.0.0.1`.
- Die Startprozedur prüft Bun, bevor die Anwendung gestartet wird.
- Die laufende Anwendung prüft `yt-dlp`, `ffmpeg` und die Google-Cloud-Konfiguration einzeln.
- Fehlende Voraussetzungen werden mit konkreten macOS-Installationshinweisen angezeigt.
- Die Anwendung installiert nichts automatisch.
- Nach der Einrichtung kann der Check erneut ausgeführt werden.
- Solange eine Pflichtvoraussetzung fehlt, kann keine Recherche gestartet werden.
- Der Startcheck ist über die öffentliche Anwendungsschnittstelle mit festen Umgebungs-Fixtures getestet.
