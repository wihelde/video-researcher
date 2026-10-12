# T09 – Optionaler Google-Lens-Fallback

## Ziel

Zusätzliche direkte Fundstellen über Google Lens ermitteln, ohne dass der Nutzer die Lens-Suche manuell bedienen muss.

## Umsetzung

- Cloud Vision bleibt der erste Suchschritt.
- Danach öffnet `agent-browser` die öffentliche Lens-Ergebnisseite im Hintergrund und liest nur direkte Links aus dem Bereich „Genau Übereinstimmungen“ zu den unterstützten Plattformen aus.
- Vor der Auslese zieht der Browser die vier Eckregler des Lens-Suchbereichs an die Bildränder und prüft die Werte 0/0/100/100.
- Lens-Treffer werden mit den Cloud-Vision-Treffern dedupliziert und gemeinsam datiert.
- Die Fundstellenliste zeigt die Suchquelle pro Treffer: Cloud Vision, Google Lens oder beide.
- Die Oberfläche zeigt die zusätzliche Phase und einen konkreten Hinweis, wenn `agent-browser` fehlt oder Lens blockiert.
- Die Browser-Sitzung bleibt flüchtig. Es wird keine Restore-Datei für Cookies angelegt.

## Abnahmekriterien

- Ein Lens-Treffer erscheint in derselben Fundstellenliste wie ein Vision-Treffer.
- Ein Treffer aus beiden Pfaden wird als „Cloud Vision + Google Lens“ gekennzeichnet.
- Ein Lens-Fehler macht die Cloud-Vision-Recherche nicht unbrauchbar.
- Ein nicht vollständig aufgezogener Lens-Suchbereich wird als Fehler behandelt und liefert keine ausschnittbasierten Treffer.
- Fehlende Browser-Voraussetzungen erscheinen als optionaler Setup-Hinweis.
- Der Ablauf ist nach einer möglichen einmaligen Google-Consent-/CAPTCHA-Bestätigung nutzbar; danach läuft die Auslese automatisch weiter.
