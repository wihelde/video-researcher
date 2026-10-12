# T07 – Manueller externer Smoke-Test

**Typ:** HITL  
**Status:** blocked  
**Parent spec:** [SPEC.md](../../SPEC.md)  
**Blocked by:** T06

## User Stories addressed

- User story 1
- User story 6
- User story 7
- User story 8
- User story 26
- User story 27
- User story 33

## What to build

Eine manuelle Release-Prüfung des vollständigen Ablaufs mit einem echten öffentlichen Reddit-Post, der lokalen `.envrc`-Konfiguration und Cloud Vision.

## Acceptance criteria

- Eine echte öffentliche Reddit-Post-URL mit einem nativen Einzelvideo kann verarbeitet werden.
- Der Startcheck erkennt die vorhandenen lokalen Voraussetzungen und die Google-Cloud-Konfiguration.
- Thumbnail-Suche und, falls nötig, Frame-Fallback liefern einen nachvollziehbaren Status und ein Ergebnis.
- Der lokale Cloud-Vision-Zähler wird korrekt erhöht und bleibt unter dem konfigurierten Limit.
- Fundstellenlinks öffnen sich in neuen Tabs und einzelne URLs lassen sich kopieren.
- Temporäre Medien werden nach Abschluss oder Abbruch entfernt.
- Abweichungen zwischen Fixture-Tests und externem Verhalten werden als konkrete Folgeaufgaben dokumentiert.
