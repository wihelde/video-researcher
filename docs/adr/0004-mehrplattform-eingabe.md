# Mehrplattform-Eingabe für öffentliche Einzelvideos

Der Eingabepfad unterstützt öffentliche Einzelposts oder Einzelvideos von Reddit, X, Instagram, YouTube, Threads, TikTok, Snapchat und Facebook. Die Plattform wird anhand der Host-Domain erkannt.

Für Reddit, X, Instagram, YouTube, TikTok, Snapchat und Facebook verwenden wir den lokal installierten `yt-dlp`-Extractor. Threads hat im verwendeten `yt-dlp` keinen Extractor und wird deshalb über öffentlich zugängliche HTML-Metadaten wie OpenGraph-Thumbnail, OpenGraph-Video und Veröffentlichungszeitpunkt ausgelesen.

Galerien, Playlists, Profile, Feeds und loginpflichtige Inhalte bleiben ausgeschlossen. Wenn eine Plattform keine verwertbaren öffentlichen Video-Metadaten liefert, erhält der Nutzer eine verständliche Fehlermeldung statt eines unvollständigen Ergebnisses.
