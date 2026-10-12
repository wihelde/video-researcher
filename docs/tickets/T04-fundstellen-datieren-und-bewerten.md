# T04 – Fundstellen datieren und bewerten

**Typ:** AFK  
**Status:** done  
**Parent spec:** [SPEC.md](../../SPEC.md)  
**Blocked by:** T03

## User Stories addressed

- User story 10
- User story 11
- User story 12
- User story 13
- User story 14
- User story 15
- User story 16
- User story 17
- User story 18
- User story 19
- User story 24

## What to build

Die konkreten Bildübereinstimmungen werden als nachvollziehbare Fundstellen aufbereitet. Die Anwendung prüft die besten Ergebnisse direkt per HTTP, datiert sie, bewertet ihre Verlässlichkeit und stellt sie gemeinsam mit dem eingereichten Post dar.

## Acceptance criteria

- Höchstens die zehn besten Treffer pro Bild und insgesamt höchstens 30 eindeutige Seiten werden geprüft.
- Datumsquellen werden in der festgelegten Reihenfolge ausgewertet: strukturierte Plattformdaten, JSON-LD, OpenGraph, sichtbare Angabe, technische Fallback-Angabe.
- Direkte Reddit- und Instagram-Fundstellen verwenden bei blockierten oder unvollständigen Seitenmetadaten den vorhandenen `yt-dlp`-Metadatenabruf als Fallback; andere JavaScript-only-Daten werden als nicht automatisch ermittelbar gekennzeichnet.
- Fundstellen werden dedupliziert; datierte Einträge aufsteigend sortiert und undatierte Einträge am Ende derselben Liste angezeigt.
- Der eingereichte Reddit-Post erscheint als eigene Fundstelle.
- Der früheste plausible Fund wird hervorgehoben, ohne ein ursprüngliches Veröffentlichungsdatum zu behaupten.
- Verlässlichkeit wird qualitativ angezeigt; die Bildübereinstimmung erscheint als vollständig oder partiell.
- Ein Repost-Hinweis erscheint nur bei einer früheren Fundstelle mit mindestens mittlerer Verlässlichkeit.
- Jede Fundstelle bietet einen klickbaren Link in einem neuen Tab und einen eigenen Copy-Button für die kanonische URL.
- Die Datums- und Sortierregeln sind über die öffentliche Anwendungsschnittstelle mit Seiten-Fixtures getestet.
