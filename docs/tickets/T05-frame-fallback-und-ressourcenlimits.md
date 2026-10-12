# T05 – Frame-Fallback und Ressourcenlimits

**Typ:** AFK  
**Status:** done  
**Parent spec:** [SPEC.md](../../SPEC.md)  
**Blocked by:** T04

## User Stories addressed

- User story 7
- User story 28

## What to build

Wenn die Thumbnail-Suche keine verwertbare Fundstelle liefert, untersucht die Anwendung wenige gleichmäßig verteilte Frames und führt dieselbe Fundstellensuche erneut aus.

## Acceptance criteria

- Das Video wird erst geladen, wenn die Thumbnail-Suche keine verwertbare Fundstelle liefert.
- Es werden höchstens drei zusätzliche, gleichmäßig verteilte Frames untersucht.
- Ein Video über 15 Minuten oder 1 GB wird für den Frame-Fallback mit einem verständlichen Hinweis abgelehnt.
- Jeder zusätzliche Cloud-Vision-Aufruf wird auf das lokale Monatslimit angerechnet.
- Die Ergebnisse aus Thumbnail und Frames werden dedupliziert und gemeinsam nach den Regeln aus T04 angezeigt.
- Temporäre Videodateien und Frames werden nach Abschluss, Abbruch oder Fehler entfernt.
- Der Fallback ist am Anwendungseinstieg mit festen Video-, `ffmpeg`- und Cloud-Vision-Fixtures getestet.
