import { afterEach, expect, mock, test } from "bun:test";
import { extractPost } from "../src/social-post";

const redditUrl = "https://www.reddit.com/r/example/comments/abc123/example/";
const browser = "brave:/example/Brave Browser/Default";
const originalBrowser = process.env.VIDEO_RESEARCHER_REDDIT_BROWSER;
const metadata = {
  info: { title: "Example video", thumbnail: "https://preview.redd.it/example.jpg", duration: 16 },
  stderr: "",
  exitCode: 0,
};

afterEach(() => {
  if (originalBrowser === undefined) delete process.env.VIDEO_RESEARCHER_REDDIT_BROWSER;
  else process.env.VIDEO_RESEARCHER_REDDIT_BROWSER = originalBrowser;
});

test("uses the opted-in browser session only for Reddit posts", async () => {
  process.env.VIDEO_RESEARCHER_REDDIT_BROWSER = browser;
  const run = mock(async () => metadata);

  expect((await extractPost(redditUrl, run)).ok).toBe(true);
  expect(run).toHaveBeenLastCalledWith(redditUrl, browser);

  const youtubeUrl = "https://www.youtube.com/watch?v=abc123";
  expect((await extractPost(youtubeUrl, run)).ok).toBe(true);
  expect(run).toHaveBeenLastCalledWith(youtubeUrl, undefined);
});

test("does not read a browser session without explicit configuration", async () => {
  delete process.env.VIDEO_RESEARCHER_REDDIT_BROWSER;
  const run = mock(async () => metadata);

  await extractPost(redditUrl, run);
  expect(run).toHaveBeenCalledWith(redditUrl, undefined);
});

test("explains Reddit's authentication response without declaring the post private", async () => {
  delete process.env.VIDEO_RESEARCHER_REDDIT_BROWSER;
  const result = await extractPost(redditUrl, async () => ({
    info: null,
    stderr: "ERROR: [Reddit] abc123: Account authentication is required.",
    exitCode: 1,
  }));

  expect(result).toEqual({
    ok: false,
    error: {
      code: "access-denied",
      message: "Reddit blockiert den automatischen Abruf. Richte eine Browsersitzung für Reddit ein und versuche es erneut.",
    },
  });
});

test("gives an actionable error when the configured browser cookies cannot be read", async () => {
  process.env.VIDEO_RESEARCHER_REDDIT_BROWSER = browser;
  const result = await extractPost(redditUrl, async () => ({
    info: null,
    stderr: 'ERROR: could not find brave cookies database in "/private/profile"',
    exitCode: 1,
  }));

  expect(result).toEqual({
    ok: false,
    error: {
      code: "browser-session-unavailable",
      message: "Die eingerichtete Browsersitzung für Reddit konnte nicht gelesen werden. Prüfe Browserprofil und Zugriffsrechte und versuche es erneut.",
    },
  });
});
