# Video Researcher

Video Researcher is a local web application for researching public social media videos. It accepts the URL of an individual post, searches for its thumbnail with Google Lens, and sorts matching findings by their visible publication dates.

The result is a research aid. The oldest date found is an **earliest plausible finding**, not proof of the video's original publication or creator.

## Supported input

Public individual posts or videos are supported from:

- Reddit
- X / Twitter
- Instagram
- YouTube
- Threads
- TikTok
- Snapchat
- Facebook

Profiles, feeds, search pages, galleries, playlists, and private or login-protected content are not supported. For Reddit, X, Instagram, YouTube, TikTok, Snapchat, and Facebook, `yt-dlp` reads the post metadata. Threads is processed through publicly visible HTML metadata.

## How research works

1. The submitted URL is checked for a supported platform and an individual post or video.
2. The tool reads the title, publication time, and thumbnail of the submitted post. The video itself is not downloaded.
3. The thumbnail is sent to Google Lens.
4. `agent-browser` opens Lens and switches to "Exact matches."
5. The Lens selection is expanded to the complete thumbnail. Its four corners must correspond to 0/0, 100/0, 100/100, and 0/100. If this cannot be confirmed, the tool does not accept results that may be based on a cropped selection.
6. The browser remains pinned to its Lens tab so opening result tabs does not interrupt active research.
7. Direct result links and Google's `/goto` redirects are resolved. Only URLs from supported platforms are accepted.
8. Profiles, search pages, and platform collection pages are removed. Examples include TikTok `/discover` and Reddit `/controversial` pages.
9. Duplicate findings are removed while preserving Google's ranking.
10. The first 30 remaining individual posts or videos in Google's ranking are considered.
11. These findings are combined with the submitted post and sorted by date. Findings without a usable date appear last.

## Date rules

- The submitted post receives its date from platform metadata. This date has high reliability.
- Lens findings use dates visible in the German Lens result text, such as `17. Aug. 2026` or `vor 2 Tagen`. Absolute dates take precedence over relative dates.
- Relative values in seconds, minutes, hours, days, weeks, months, or years are converted using the time the Lens results were read. Calendar calculations use the local timezone and account for daylight-saving changes, month ends, and leap years.
- Converted dates participate in sorting and can be the earliest plausible finding. They are marked with `ca.` and retain the original relative label. These are estimates because Google may round relative ages.
- An absolute Lens date has medium reliability. An estimated relative date has low reliability.
- The oldest dated finding is marked as the earliest plausible finding.
- When an absolute Lens date predates the submitted post, the tool shows a repost indication. Estimated dates alone do not trigger this indication. This indication is not proof either.
- Instagram URLs containing `/reel/` or `/reels/` are normalized to `/p/` for display. The original Lens URL remains available as well.

## Requirements

The current version targets macOS and requires:

- [Bun](https://bun.sh/)
- [`yt-dlp`](https://github.com/yt-dlp/yt-dlp)
- [`agent-browser`](https://github.com/vercel-labs/agent-browser) with Chromium installed

Install the external tools with:

```sh
brew install yt-dlp
npm install -g agent-browser
agent-browser install
```

When the application opens, it lists missing requirements together with installation instructions.

## Start

```sh
./start.sh
```

The application is then available at [http://127.0.0.1:3000](http://127.0.0.1:3000). The server binds only to the local machine.

For development with automatic restarts:

```sh
bun run dev
```

Run the tests with:

```sh
bun test
```

## Google confirmation

Google may block automated Lens requests. In that case, the tool opens a visible browser session where consent or a CAPTCHA must be confirmed manually once.

The Lens browser session is not restored permanently. Video Researcher does not export or archive browser cookies.

Google can also delay individual `/goto` result links with a timed verification page. Video Researcher respects the page's refresh delay and retries only Google URLs, with at most 90 seconds of verification waiting per research. Resolution stops once the first 30 supported, unique posts or videos are collected. Finding pages are not requested for this resolution. The interface reports automatic verification separately from a CAPTCHA. If links remain unresolved, successful findings stay visible with an explicit incomplete-research warning and a retry action; the log records `lens-links-incomplete` without URLs.

## Reddit access

Reddit may block automated metadata requests even when the post opens in an incognito browser. Its extractor can report that authentication is required in this situation; that does not mean the post is private.

To let `yt-dlp` use an existing browser session for Reddit, explicitly configure a browser in your local `.envrc`. For Brave on macOS:

```sh
export VIDEO_RESEARCHER_REDDIT_BROWSER="brave:$HOME/Library/Application Support/BraveSoftware/Brave-Browser/Default"
```

Use the profile where you open Reddit. The value follows [yt-dlp's `--cookies-from-browser` syntax](https://github.com/yt-dlp/yt-dlp#authentication-options); an explicit profile path avoids unreliable automatic profile discovery. Restart with `./start.sh` after changing the configuration. The start script loads `.envrc` directly; shells with direnv can also use `direnv allow`.

This is opt-in and applies only to Reddit inputs. `yt-dlp` reads browser cookies locally and uses the cookies matching its requests, without exporting a cookie file. Video Researcher does not need or store your Reddit password. Browser profile or keychain access may require local permission. Without configuration, requests continue without browser cookies.

## Local data

- Research results are kept only in memory and disappear after a refresh or restart.
- There is no database or research archive.
- Runtime, Lens result counts, the number of converted relative dates, and error categories are logged to `.video-researcher.log` by default.
- Before a new entry would exceed 5 MiB, the log rotates to `.video-researcher.log.1`, replacing the previous backup. Only the active log and one backup are retained, normally totaling at most 10 MiB. Custom log paths use the same `.1` backup suffix. Logging failures never interrupt research.
- The researched thumbnail leaves the local machine and is sent to Google Lens.
- Finding pages are not requested for additional date enrichment. The tool uses the visible Lens result text.

## Configuration

Optional environment variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | Local HTTP port |
| `VIDEO_RESEARCHER_REDDIT_BROWSER` | unset | Opt-in browser/profile used by `yt-dlp` for Reddit requests |
| `VIDEO_RESEARCHER_LENS_SESSION` | `video-researcher-lens` | Name of the headless browser session |
| `VIDEO_RESEARCHER_LENS_VISIBLE_SESSION` | `video-researcher-visible` | Name of the visible browser session |
| `VIDEO_RESEARCHER_LOG_FILE` | `.video-researcher.log` | Path to the local log file |

## Known limitations

- Google Lens does not provide a public, officially documented API. Changes to its interface can temporarily break the automation.
- Lens results are not guaranteed to be complete and may contain incorrect matches. The tool does not inspect the complete video content of each finding.
- The first 30 findings deliberately represent only Google's highest-ranked individual results.
- The search currently uses the submitted post's thumbnail rather than multiple frames from the full video.
- A missing or unsupported date cannot be considered when determining the earliest plausible finding. Relative dates are approximate, especially for months and years.
- Only one research job can run at a time.
- Private, deleted, login-protected, or age-restricted content cannot be researched reliably.

## Further documentation

- [Product principles](./PRODUCT.md)
- [Domain terminology](./CONTEXT.md)
- [Google Lens as the image search](./docs/adr/0005-google-lens-browser-fallback.md)
- [Additional architecture decisions](./docs/adr/)
- [Detailed product specification](./SPEC.md), including historical and not yet implemented decisions
