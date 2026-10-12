# T08 – Öffentliche Einzelvideos von mehreren Plattformen untersuchen

## Ziel

Die Anwendung akzeptiert öffentliche Einzelposts oder Einzelvideos von Reddit, X, Instagram, YouTube, Threads, TikTok, Snapchat und Facebook.

## Umfang

- Plattform anhand der Host-Domain erkennen.
- yt-dlp für die unterstützten Standard-Extractor verwenden.
- Threads über öffentlich sichtbare HTML-Metadaten auslesen.
- Profile, Feeds, Playlists, Galerien und loginpflichtige Inhalte verständlich ablehnen.
- Eingabe, Fehlertexte, Fundstellen und Frame-Fallback plattformneutral behandeln.

## Abnahmekriterien

- Jede genannte Plattform wird als gültige Einzelpost- oder Einzelvideo-URL erkannt.
- Eine echte yt-dlp-Plattform liefert dieselben Metadatenfelder wie der bisherige Reddit-Pfad.
- Ein öffentlicher Threads-Post mit OpenGraph-Video und Thumbnail wird als untersuchbarer Post erkannt.
- Fehlende Threads-Metadaten führen zu einer verständlichen Fehlermeldung.
- Die bestehende Vision-Suche, Datierung, Tabelle, Kontingentanzeige und der Abbruchpfad bleiben unverändert nutzbar.

## Status

Erledigt im lokalen MVP. Ein manueller Smoke-Test mit echten öffentlichen URLs bleibt abhängig von den jeweiligen Plattformen und deren Zugriffsschutz.
