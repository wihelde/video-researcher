# Google Lens als einzige Bildsuche

## Kontext

Cloud Vision Web Detection lieferte weniger direkte Social-Media-URLs als Google Lens. Die anschließenden Plattformabrufe zur Datumsermittlung waren langsam und führten bei TikTok zu Rate-Limits. Eine öffentliche, offiziell dokumentierte Lens-API steht nicht zur Verfügung.

## Entscheidung

Die lokale Anwendung verwendet ausschließlich die öffentliche Google-Lens-Ergebnisseite über `agent-browser` und liest direkte Links aus „Genaue Übereinstimmungen“ für alle unterstützten Plattformen aus. Plattform-Sammelseiten werden entfernt; nach der Deduplizierung werden Googles erste 30 individuellen Posts oder Videos nach ihrem sichtbaren Datum sortiert dargestellt. Der Lauf wechselt zunächst zu „Genaue Übereinstimmungen“, zieht bei Bedarf die obere linke und untere rechte Ecke des Suchbereichs mit nativen Mausbewegungen an die Bildränder und öffnet danach die Ergebnisse erneut mit derselben Auswahl. Die vollständige Auswahl wird anhand der von Lens gemeldeten Koordinaten 0/0, 100/0, 100/100 und 0/100 geprüft. Behält Google die Auswahl nicht bei, werden keine Lens-Treffer übernommen. Erkennt der Browser eine Google-Blockierungsseite, wird einmalig eine sichtbare, isolierte Browser-Sitzung geöffnet. Der Nutzer kann dort Consent oder CAPTCHA bestätigen; danach liest die Anwendung die Ergebnisse automatisch aus.

Ein im deutschen Lens-Ergebnistext sichtbares Datum wird als einzige Datumsquelle für gefundene Fundstellen übernommen und mit mittlerer Verlässlichkeit ausgewiesen. Die Anwendung ruft Fundstellen nicht zur Datumsanreicherung auf und startet dafür auch kein `yt-dlp`.

Die Browser-Sitzung wird nicht mit `--restore` gestartet. Cookies bleiben damit auf die laufende lokale Sitzung begrenzt und werden nicht als dauerhafte Datei gespeichert.

## Konsequenzen

- Der Ablauf kann Instagram-, TikTok- und andere Plattform-URLs finden, ohne diese Plattformen anschließend aufzurufen.
- Google Lens kann den Lauf blockieren oder die Oberfläche ändern; in diesem Fall zeigt die Anwendung einen Hinweis und hat keine zweite Bildsuche als Fallback.
- Für die erste Freigabe kann eine einmalige sichtbare Consent-/CAPTCHA-Bestätigung nötig sein.
- `agent-browser` ist eine erforderliche lokale Voraussetzung. Die Ergebnisse sind nicht garantiert vollständig oder identisch mit der interaktiven Lens-Suche.
- Schlägt die geprüfte Full-Frame-Auswahl fehl, werden keine möglicherweise ausschnittbasierten Lens-Treffer übernommen.
