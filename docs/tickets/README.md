# Umsetzungstickets

Die Tickets schneiden den bestätigten lokalen MVP in vertikale, einzeln prüfbare Slices. Die fachliche Grundlage ist [SPEC.md](../../SPEC.md); Begriffe und Entscheidungen stehen in [CONTEXT.md](../../CONTEXT.md) und [docs/adr](../adr/).

## Reihenfolge und Abhängigkeiten

1. [T01 – Lokaler Start und Voraussetzungen](./T01-lokaler-start-und-voraussetzungen.md)
2. [T02 – Öffentlichen Reddit-Post untersuchen](./T02-oeffentlichen-reddit-post-untersuchen.md) — blockiert durch T01
3. [T03 – Thumbnail-Suche mit Cloud Vision](./T03-thumbnail-suche-mit-cloud-vision.md) — blockiert durch T02
4. [T04 – Fundstellen datieren und bewerten](./T04-fundstellen-datieren-und-bewerten.md) — blockiert durch T03
5. [T05 – Frame-Fallback und Ressourcenlimits](./T05-frame-fallback-und-ressourcenlimits.md) — blockiert durch T04
6. [T06 – Abbruch, Retry und Fehlerzustände](./T06-abbruch-retry-und-fehlerzustaende.md) — blockiert durch T05
7. [T07 – Manueller externer Smoke-Test](./T07-manueller-externer-smoke-test.md) — blockiert durch T06
8. [T08 – Öffentliche Einzelvideos von mehreren Plattformen untersuchen](./T08-mehrplattform-eingabe.md) — erweitert T02
9. [T09 – Optionaler Google-Lens-Fallback](./T09-google-lens-fallback.md) — erweitert T03

Alle Tickets sind AFK, außer T07 als HITL-Ticket für die manuelle Prüfung mit echten externen Diensten.
