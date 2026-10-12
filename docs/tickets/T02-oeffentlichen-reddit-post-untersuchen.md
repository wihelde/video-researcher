# T02 – Öffentlichen Reddit-Post untersuchen

**Typ:** AFK  
**Status:** done  
**Parent spec:** [SPEC.md](../../SPEC.md)  
**Blocked by:** T01

## User Stories addressed

- User story 1
- User story 3
- User story 5
- User story 9
- User story 20
- User story 23

## What to build

Ein Nutzer kann eine unterstützte öffentliche Reddit-Post-URL eingeben und erhält den eingereichten Post mit Thumbnail und Veröffentlichungszeitpunkt oder eine verständliche Erklärung, warum der Post nicht untersuchbar ist.

## Acceptance criteria

- Normale Reddit-Permalinks und `redd.it`-Links werden auf einen einzelnen Post aufgelöst.
- Nur öffentliche Posts mit genau einem nativen Reddit-Video werden akzeptiert.
- Galerien, mehrere Videos, Crossposts, externe Video-Links, Profil-/Feed-/Kommentar-URLs sowie loginpflichtige Posts werden verständlich abgelehnt.
- `yt-dlp` liefert Post-Metadaten, Thumbnail und den Veröffentlichungszeitpunkt über den Anwendungspfad.
- Das Video wird für diesen Slice noch nicht heruntergeladen, wenn das Thumbnail ausreicht.
- Der Nutzer sieht eine der drei Statusphasen und einen klaren Fehlerzustand bei fehlendem Video oder fehlendem Zugriff.
- Der Anwendungspfad ist mit einer festen `yt-dlp`-Fixture am öffentlichen HTTP-Verhalten getestet.
