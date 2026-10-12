# T03 – Thumbnail-Suche mit Cloud Vision

**Typ:** AFK  
**Status:** done  
**Parent spec:** [SPEC.md](../../SPEC.md)  
**Blocked by:** T02

## User Stories addressed

- User story 6
- User story 8
- User story 19
- User story 26
- User story 27
- User story 28
- User story 32

## What to build

Nach der Reddit-Erkennung wird das vorhandene Thumbnail einmalig an Cloud Vision Web Detection übergeben. Die Anwendung zeigt konkrete Bildübereinstimmungen, den Suchstatus und den lokalen Verbrauch des monatlichen Limits.

## Acceptance criteria

- Das Thumbnail ist der erste Bildsuchkandidat.
- Cloud-Vision-Aufrufe sind am externen API-Rand durch feste Antworten testbar.
- Nur vollständige oder partielle konkrete Bildübereinstimmungen werden als Fundstellenkandidaten übernommen; rein ähnliche Bilder und Labels nicht.
- Instagram-Bildreferenzen werden auf den tatsächlich zugehörigen Post aufgelöst; nicht auflösbare Zuordnungen werden verworfen.
- Reddit-Seiten werden verworfen, wenn die von Vision gefundene Reddit-CDN-Bildreferenz nicht zum Haupt-Thumbnail des Posts gehört.
- Das Frontend zeigt die Phasen „Video erkennen“, „Bild suchen“ und „Treffer datieren“ passend zum Ablauf.
- Ein Lauf ohne verwertbare Thumbnail-Treffer endet klar und kann den Frame-Fallback vorbereiten.
- Jeder tatsächliche Cloud-Vision-Aufruf wird einmal gezählt.
- Der lokale Monatszähler bleibt über Neustarts erhalten und zeigt verwendete, konfigurierte und verbleibende Aufrufe an.
- Beim Standardlimit von 900 Aufrufen wird kein weiterer Cloud-Vision-Aufruf gestartet.
