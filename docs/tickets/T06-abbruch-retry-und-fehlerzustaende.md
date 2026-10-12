# T06 – Abbruch, Retry und Fehlerzustände

**Typ:** AFK  
**Status:** done  
**Parent spec:** [SPEC.md](../../SPEC.md)  
**Blocked by:** T05

## User Stories addressed

- User story 8
- User story 16
- User story 19
- User story 20
- User story 25
- User story 26
- User story 31

## What to build

Der vollständige Rechercheablauf kann kontrolliert beendet oder nach vorübergehenden Fehlern erneut gestartet werden. Die Oberfläche unterscheidet verwertbare Ergebnisse, fehlende Treffer und begrenzte externe Fehler.

## Acceptance criteria

- Eine laufende Recherche kann abgebrochen werden.
- Abbruch und Fehler entfernen temporäre Medien und setzen die Oberfläche in einen neutralen Zustand.
- Vorübergehende Netzwerk-, Reddit-, Fundstellen- oder Cloud-Vision-Fehler können ohne erneute URL-Eingabe wiederholt werden.
- Ungültige URLs und nicht unterstützte Posttypen werden nicht in einer Retry-Schleife wiederholt.
- „Keine verwertbare Fundstelle“ ist ein abgeschlossenes Ergebnis und kein technischer Fehler.
- Ergebnisse werden weder über Browser-Refresh noch über Neustart erhalten.
- Betriebslogs enthalten Zähler, Laufzeiten und Fehlerkategorien, aber keine URLs oder Medien.
- Die Kontroll- und Fehlerpfade sind am öffentlichen Anwendungseinstieg mit externen Fehler-Fixtures getestet.
