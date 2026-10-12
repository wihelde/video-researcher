# Video Researcher

## Problem Statement

Für ein monatliches Compilation-Video werden gezielt einzelne Videos aus Quellen wie Reddit, Instagram und Facebook recherchiert. Dabei muss eingeschätzt werden, seit wann ein Video wahrscheinlich im Internet verfügbar ist.

Der heutige Ablauf ist manuell: Ein Video wird gestartet, ein geeigneter früher Frame ausgewählt und mit Google Lens gesucht. Anschließend müssen die Treffer einzeln geöffnet und auf ihre Veröffentlichungszeitpunkte geprüft werden. Besonders diese Datumsrecherche kostet viel Zeit.

Häufig liegt keine direkte URL zur Videodatei vor. Verfügbar ist lediglich die URL eines einzelnen Posts, der das Video enthält. Eine Lösung darf deshalb nicht voraussetzen, dass Nutzer die eigentliche Mediendatei oder deren technische URL ermitteln.

## Solution

Video Researcher ist eine kleine lokale Webanwendung. Nutzer fügen die URL eines einzelnen Posts ein. Die Anwendung erkennt das enthaltene Video und dessen Thumbnail automatisch, sucht anhand geeigneter Bilder nach übereinstimmenden Veröffentlichungen und datiert die gefundenen Seiten.

Das Ergebnis nennt den frühesten plausiblen Fund, den Veröffentlichungszeitpunkt des eingereichten Posts, weitere relevante Fundstellen und eine verständliche Einschätzung der Verlässlichkeit. Das früheste gefundene Datum wird ausdrücklich als frühester nachweisbarer Fund und nicht als bewiesenes ursprüngliches Veröffentlichungsdatum bezeichnet.

## User Stories

1. Als Compilation-Ersteller möchte ich die URL eines einzelnen Posts einfügen, damit ich keine direkte Video-URL ermitteln muss.
2. Als Compilation-Ersteller möchte ich eine öffentliche Einzelpost- oder Video-URL von Reddit, X, Instagram, YouTube, Threads, TikTok, Snapchat oder Facebook verwenden können.
3. Als Compilation-Ersteller möchte ich, dass das enthaltene Video automatisch erkannt wird, damit ich es nicht herunterladen oder technisch untersuchen muss.
4. Als Compilation-Ersteller möchte ich bei einer nicht unterstützten URL oder einem nicht unterstützten Posttyp eine verständliche Erklärung erhalten.
5. Als Compilation-Ersteller möchte ich sehen, wenn eine URL keinen einzelnen untersuchbaren Post bezeichnet, damit ich eine passendere URL einfügen kann.
6. Als Compilation-Ersteller möchte ich, dass zunächst das vorhandene Thumbnail verwendet wird, damit unnötige Videoverarbeitung vermieden wird.
7. Als Compilation-Ersteller möchte ich, dass bei unzureichenden Thumbnail-Treffern automatisch geeignete Frames untersucht werden, damit die Recherche trotzdem fortgesetzt werden kann.
8. Als Compilation-Ersteller möchte ich während der Verarbeitung einen klaren Status sehen, damit ich weiß, ob Videoerkennung, Bildsuche oder Datumsprüfung läuft.
9. Als Compilation-Ersteller möchte ich den Veröffentlichungszeitpunkt des eingereichten Posts sehen, damit ich die aktuelle Fundstelle einordnen kann.
10. Als Compilation-Ersteller möchte ich den frühesten plausiblen Fund sofort erkennen, damit ich das wahrscheinliche Mindestalter des Videos schnell beurteilen kann.
11. Als Compilation-Ersteller möchte ich alle relevanten Fundstellen mit Datum und Link sehen, damit ich das Ergebnis nachvollziehen kann.
12. Als Compilation-Ersteller möchte ich die Fundstellen chronologisch sortiert sehen, damit ältere Veröffentlichungen zuerst sichtbar sind.
13. Als Compilation-Ersteller möchte ich erkennen, wie ähnlich ein Treffer dem untersuchten Bild ist, damit ich falsche Treffer aussortieren kann.
14. Als Compilation-Ersteller möchte ich eine einfache Vertrauenseinschätzung erhalten, damit ich weiß, wie belastbar das genannte Datum ist.
15. Als Compilation-Ersteller möchte ich sehen, aus welcher Seitenangabe ein Datum stammt, damit ich zwischen Plattform-Metadaten und schwächeren Hinweisen unterscheiden kann.
16. Als Compilation-Ersteller möchte ich gewarnt werden, wenn ein Datum nicht zuverlässig ermittelt werden konnte, damit eine Vermutung nicht als Tatsache erscheint.
17. Als Compilation-Ersteller möchte ich einen Treffer direkt öffnen können, damit ich ihn bei Bedarf manuell prüfen kann.
18. Als Compilation-Ersteller möchte ich erkennen, wenn der eingereichte Post wahrscheinlich ein Repost ist, damit ich ihn nicht mit der ursprünglichen Veröffentlichung verwechsle.
19. Als Compilation-Ersteller möchte ich bei fehlenden Treffern ein klares Ergebnis erhalten, damit ich nicht auf einen scheinbar noch laufenden Prozess warte.
20. Als Compilation-Ersteller möchte ich bei nicht öffentlichen oder loginpflichtigen Posts eine verständliche Erklärung erhalten, damit ich weiß, warum die automatische Erkennung gescheitert ist.
21. Als Compilation-Ersteller möchte ich später eine loginpflichtige Quelle optional über meine lokale Browsersitzung untersuchen können, damit zugängliche Posts nicht allein an der Anmeldung scheitern.
22. Als Compilation-Ersteller möchte ich, dass Anmeldedaten und Browser-Cookies nicht dauerhaft gespeichert werden, damit meine Konten nicht unnötig gefährdet werden.
23. Als Compilation-Ersteller möchte ich, dass nur der ausgewählte Post untersucht wird, damit keine kompletten Feeds, Threads oder Profile verarbeitet werden.
24. Als Compilation-Ersteller möchte ich ohne Stichtag recherchieren, damit stets der früheste auffindbare Zeitpunkt ermittelt wird.
25. Als Compilation-Ersteller möchte ich eine fehlgeschlagene Recherche erneut starten können, damit vorübergehende Plattformfehler nicht zur Neueingabe zwingen.
26. Als Compilation-Ersteller möchte ich wissen, wenn die Bildsuche oder eine Quellseite vorübergehend nicht erreichbar ist, damit ich das Ergebnis richtig einordne.
27. Als Betreiber möchte ich die Anzahl der Cloud-Vision-Anfragen nachvollziehen können, damit das kostenlose Kontingent und mögliche Kosten kontrollierbar bleiben.
28. Als Betreiber möchte ich, dass pro Recherche nur so viele Bilder wie nötig untersucht werden, damit Laufzeit und API-Verbrauch gering bleiben.
29. Als Betreiber möchte ich keine Datenbank betreiben müssen, damit das Werkzeug lokal und wartungsarm bleibt.
30. Als Compilation-Ersteller möchte ich die URL einer einzelnen Fundstelle kopieren können, damit ich sie direkt in meine Notizen übernehmen kann.
31. Als Compilation-Ersteller möchte ich eine laufende Recherche abbrechen können, damit ich nicht auf einen unnötigen Download oder externen Dienstaufruf warten muss.
32. Als Betreiber möchte ich den lokalen Stand des Cloud-Vision-Limits im Frontend sehen, damit ich verbleibende kostenlose Anfragen einschätzen kann.
33. Als Compilation-Ersteller möchte ich fehlende lokale Voraussetzungen mit konkreten Installationshinweisen erkennen, damit ich die Anwendung selbstständig einrichten kann.

## Implementation Decisions

- Die Anwendung wird als kleine lokale Webanwendung umgesetzt. Sie benötigt für den Kernablauf keine Browser-Erweiterung.
- Der lokale Webserver bindet ausschließlich an `127.0.0.1` und bietet keine Netzwerkfreigabe oder Benutzerkonten.
- Die lokale Startprozedur prüft, ob Bun vorhanden ist. Die laufende Anwendung prüft `yt-dlp`, `ffmpeg` und die Google-Cloud-Konfiguration. Fehlende Voraussetzungen werden einzeln mit konkreten macOS-Installationshinweisen angezeigt; automatische Installationen gibt es nicht. Nach der Einrichtung kann der Check erneut ausgeführt werden.
- Die Eingabe ist die URL eines einzelnen Posts. Eine direkte Video- oder Datei-URL ist nicht erforderlich.
- Die Eingabe unterstützt öffentliche Einzelposts oder Einzelvideos von Reddit, X, Instagram, YouTube, Threads, TikTok, Snapchat und Facebook. Die yt-dlp-unterstützten Plattformen verwenden den vorhandenen Extractor; Threads wird über öffentlich sichtbare Seiten-Metadaten ausgelesen.
- `yt-dlp` ermittelt aus der Post-URL Videometadaten, Thumbnail, Veröffentlichungszeitpunkt und die abrufbare Mediendatei. Das Video wird nur heruntergeladen, wenn für die Frame-Extraktion tatsächlich darauf zugegriffen werden muss.
- Posts mit mehreren Videos, Galerien, Crossposts und externen Video-Links werden im MVP verständlich abgelehnt.
- Das Thumbnail ist immer der erste Bildkandidat. Zusätzliche Frames werden nur erzeugt, wenn die erste Suche keine ausreichenden Treffer liefert.
- Die Anzahl zusätzlicher Frames bleibt klein und fest begrenzt. Eine flächendeckende Analyse des gesamten Videos ist nicht erforderlich.
- Die visuelle Websuche verwendet zuerst Cloud Vision Web Detection. Danach wird optional ein lokaler, unsichtbarer Google-Lens-Browserlauf über `agent-browser` gestartet. Vor der Auslese setzt der Lauf die vier nativen Lens-Regler per Tastatur an die Bildränder und prüft, dass die Auswahl links und oben bei 0 Prozent sowie rechts und unten bei 100 Prozent liegt. Danach wechselt er auf „Genaue Übereinstimmungen“ und bestätigt Vollbildauswahl und Ergebnisart erneut. Cloud Vision bleibt der Kernpfad und kann andere Ergebnisse als Lens liefern. Fehlt `agent-browser`, blockiert Google den Lauf oder setzt Google beim Wechsel erneut einen Ausschnitt, werden keine Lens-Treffer übernommen; die Cloud-Vision-Suche bleibt nutzbar und zeigt einen konkreten Hinweis.
- Für jede gefundene Seite versucht die Anwendung, das Veröffentlichungsdatum aus strukturierten Plattformdaten, JSON-LD und OpenGraph-Metadaten zu bestimmen. Weniger verlässliche sichtbare oder technische Datumsangaben dürfen nur als entsprechend gekennzeichneter Fallback dienen.
- Bei widersprüchlichen Datumsangaben derselben Fundstelle gilt die Reihenfolge strukturierte Plattformdaten, JSON-LD, OpenGraph, sichtbare Angabe und technische Fallback-Angabe.
- Die Datumsprüfung lädt Fundstellen direkt per HTTP und rendert keine vollständigen Webseiten im Browser. Der optionale Lens-Lauf ist davon getrennt und rendert nur die Lens-Ergebnisseite. Für direkte Reddit- und Instagram-Fundstellen darf `yt-dlp` bei blockierten oder unvollständigen Seitenmetadaten den Veröffentlichungszeitpunkt nachladen. Andere JavaScript-only-Datumsangaben werden als nicht automatisch ermittelbar gekennzeichnet.
- Treffer werden dedupliziert und chronologisch sortiert. Der älteste belastbare Treffer wird als frühester plausibler Fund hervorgehoben.
- Instagram-Fundstellen mit `/reel/` oder `/reels/` werden für Abruf und Anzeige auf `/p/` normalisiert; die ursprüngliche Such-URL bleibt als Roh-URL nachvollziehbar.
- Konkrete Bildübereinstimmungen ohne ermittelbares Datum erscheinen ebenfalls in dieser Fundstellenliste, werden aber nicht für den frühesten plausiblen Fund verwendet.
- Datierten Fundstellen werden aufsteigend sortiert; undatierte Fundstellen stehen am Ende der gemeinsamen Liste und tragen „Datum nicht ermittelbar“.
- Die Bildähnlichkeit wird qualitativ als vollständige oder partielle Bildübereinstimmung gekennzeichnet; das ist keine Aussage über den gesamten Inhalt eines Videos. Prozentwerte werden nicht behauptet.
- Instagram-Lookaside-Bildreferenzen werden auf den tatsächlich zugehörigen Post aufgelöst. Kann die Zuordnung nicht aufgelöst werden, wird die möglicherweise falsche Seiten-URL nicht angezeigt.
- Reddit-Fundstellen aus Cloud Vision werden verworfen, wenn die konkrete Reddit-CDN-Bildreferenz nicht dem Haupt-Thumbnail des Posts entspricht.
- Das Ergebnis trennt Fakten von Schlussfolgerungen. Ein gefundener Zeitpunkt beweist nicht, dass das Video an diesem Tag erstmals veröffentlicht wurde.
- Ein Repost-Hinweis wird nur angezeigt, wenn mindestens eine konkrete datierte Fundstelle mit mindestens mittlerer Verlässlichkeit vor dem eingereichten Post liegt; eine schwache Fallback-Angabe reicht nicht.
- Die Vertrauenseinschätzung basiert mindestens auf Bildübereinstimmung, Verlässlichkeit der Datumsquelle und Übereinstimmung mehrerer Fundstellen. Sie bleibt verständlich und wird nicht als scheinpräziser Prozentwert dargestellt.
- Die URL und das Veröffentlichungsdatum des eingereichten Posts werden als eigene Fundstelle behandelt.
- Jede Fundstelle zeigt, ob sie aus Cloud Vision, Google Lens oder beiden Suchpfaden stammt.
- Loginpflichtige Inhalte gehören nicht zum MVP-Kernpfad. Der optionale Lens-Lauf verwendet eine flüchtige lokale Browsersitzung ohne Restore-Datei; Browser-Cookies werden nicht als dauerhafte Datei exportiert oder in der Anwendung gespeichert. Wenn Google den automatisierten Lauf blockiert, kann einmalig eine sichtbare Consent-/CAPTCHA-Bestätigung erforderlich sein.
- Loginpflichtige oder altersbeschränkte Posts werden ohne lokale Browsersitzung verständlich abgelehnt; ein Cookie-Import gehört nicht zum ersten Schnitt.
- Verarbeitete URLs, Bilder, Videos und Ergebnisse werden standardmäßig nur temporär gehalten. Eine Datenbank und ein Recherchearchiv sind nicht Bestandteil der ersten Version.
- Rechercheergebnisse werden nicht über einen Browser-Refresh oder einen Neustart hinweg erhalten.
- Temporäre Mediendateien werden nach Abschluss oder Abbruch einer Recherche entfernt.
- Cloud-Zugangsdaten verbleiben im lokalen Backend und werden nicht an den Browser ausgeliefert.
- Die Oberfläche zeigt die Phasen Video erkennen, Bild suchen, Google Lens durchsuchen und Treffer datieren sowie verständliche Fehlerzustände.
- Die Oberfläche des MVP ist deutschsprachig.
- Die Oberfläche ist für Desktop- und Laptop-Browser optimiert und bleibt ohne mobile Sonderlogik grundsätzlich responsiv.
- Der MVP wird zunächst für macOS unterstützt; Windows und Linux sind nicht zugesichert.
- Eine laufende Recherche kann über einen Abbrechen-Button beendet werden; dabei werden temporäre Mediendateien entfernt.
- Jede angezeigte Fundstelle bietet einen eigenen Button zum Kopieren ihrer URL in die Zwischenablage. Einen Sammel-Export aller URLs gibt es nicht.
- Der Clipboard-Button kopiert bevorzugt die kanonische Seiten-URL ohne offensichtliche Tracking-Parameter; falls keine Canonical-URL ermittelbar ist, wird die gefundene URL kopiert.
- Fundstellen-URLs werden als klickbare Links dargestellt und öffnen sich mit `target="_blank"` und `rel="noopener noreferrer"` in einem neuen Tab.
- Das Frontend zeigt die im aktuellen Monat lokal gezählten Web-Detection-Anfragen, das konfigurierte Limit und die verbleibende lokale Anzahl an. Es weist darauf hin, dass dies nicht die projektweite Google-Cloud-Nutzung umfasst.
- Jeder tatsächliche Cloud-Vision-Aufruf zählt einmal zum Limit, auch bei Retries oder Frame-Fallbacks; Aufrufe werden bei erreichtem Limit nicht gestartet.
- Die Anwendung protokolliert lokal die Zahl der Cloud-Vision-Anfragen, Laufzeiten und Fehlerkategorien. Die monatliche Anfragezahl bleibt über Neustarts hinweg erhalten; sie erfasst keine vollständigen Browser-Cookies oder unnötigen Medieninhalte.
- Ein konfigurierbares hartes Nutzungslimit schützt vor unbeabsichtigten Cloud-Kosten. Der Standard liegt bei 900 Web-Detection-Anfragen pro Kalender­monat. Ein Stichtag für das Alter des recherchierten Videos ist ausdrücklich nicht vorgesehen.

## Testing Decisions

- Getestet wird beobachtbares Verhalten statt interner Implementierungsdetails.
- Der bevorzugte Test-Seam liegt auf Anwendungsebene: Eine Post-URL wird eingegeben und die Anwendung liefert ein geordnetes, nachvollziehbares Rechercheergebnis oder einen verständlichen Fehler.
- Externe Antworten von Plattformen, `yt-dlp`, Cloud Vision und gefundenen Webseiten werden im Test durch feste Fixtures ersetzt. Dadurch bleiben Tests schnell und unabhängig von Netzwerk, Logins und wechselnden Drittanbieteroberflächen.
- Der zentrale Verhaltenstest deckt mindestens einen erfolgreichen Lauf vom einzelnen Post über Thumbnail-Suche und Datumsbestimmung bis zum frühesten plausiblen Fund ab.
- Weitere fokussierte Verhaltenstests decken nur wesentliche Abzweigungen ab: nicht unterstützter Posttyp, Thumbnail ohne ausreichende Treffer mit Frame-Fallback, loginpflichtiger Post, kein Video, keine Treffer und widersprüchliche oder fehlende Datumsangaben.
- Die Rangfolge der Treffer wird anhand ihrer extern sichtbaren Ausgabe geprüft. Interne Bewertungsfunktionen erhalten keine eigene umfangreiche Testsuite.
- Da das Projekt aktuell leer ist, existiert keine Test-Prior-Art. Das gewählte Testwerkzeug soll sich an der später gewählten Laufzeit orientieren und keine zusätzliche Testarchitektur erzwingen.
- Ein kleiner manueller Integrationstest mit öffentlichen Beispiel-URLs der unterstützten Plattformen prüft vor Releases, ob die externen Extractoren weiterhin funktionieren. Diese URLs sind keine dauerhaft zuverlässigen automatisierten Regressionstests.

## Out of Scope

- Vollständige Gleichheit mit der interaktiven Google-Lens-Oberfläche
- Garantie, das tatsächliche ursprüngliche Veröffentlichungsdatum zu finden
- Vollständige Suche über alle existierenden Webseiten und Plattformen
- Verarbeitung ganzer Reddit-Threads, Feeds, Profile oder Kanäle
- Automatische Auswahl eines Videos aus einem Post mit mehreren Videos
- Vollständiges Browser-Rendering gefundener Webseiten zur Datumsbestimmung
- Permanentes Archiv früherer Recherchen
- Datenbank, Benutzerkonten oder Mehrbenutzerbetrieb
- Mobile App oder Browser-Erweiterung
- Videoschnitt, Downloadverwaltung oder Erstellung des Compilation-Videos
- Urheberrechtsprüfung, Lizenzbewertung oder Freigabe zur Nutzung eines Videos
- Gesichtserkennung oder inhaltliche Moderation
- Altersprüfung gegen einen vom Nutzer gewählten Stichtag
- Garantierter Zugriff auf private, gelöschte oder nicht für den angemeldeten Nutzer freigegebene Inhalte
- Verarbeitung privater, loginpflichtiger oder gelöschter Inhalte

## Further Notes

- Cloud Vision Web Detection umfasst derzeit ein monatliches Freikontingent, verlangt aber ein Google-Cloud-Projekt mit aktiviertem Abrechnungskonto. Preise und Kontingente müssen vor der Implementierung erneut anhand der offiziellen Dokumentation geprüft werden.
- An Google Cloud oder Google Lens gesendete Thumbnails und Frames verlassen den lokalen Rechner. Dieser Umstand muss in der Oberfläche transparent benannt werden.
- Plattformen ändern ihre Seiten und Zugriffsschutzmaßnahmen regelmäßig. Fehler eines einzelnen Extractors sollen deshalb als begrenzter Plattformfehler erscheinen und nicht den gesamten Dienst unbrauchbar machen.
- Der Name „frühester plausibler Fund“ ist bewusst gewählt: Das Werkzeug liefert belastbare Recherchehinweise, keine beweissichere Provenienz.
