import { afterEach, expect, test } from "bun:test";
import { mkdtemp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendLog, type LogEvent } from "../src/log";

const limit = 5 * 1024 * 1024;
const directories: string[] = [];
const event: LogEvent = { event: "research_completed", durationMs: 25, lensMatches: 3 };
const line = JSON.stringify(event) + "\n";

const temporaryLog = async () => {
  const directory = await mkdtemp(join(tmpdir(), "video-researcher-log-test-"));
  directories.push(directory);
  return { directory, path: join(directory, "research.jsonl") };
};

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

test("creates a missing log and appends complete JSON lines without rotating early", async () => {
  const { directory, path } = await temporaryLog();
  await appendLog(event, path);
  await appendLog(event, path);
  expect(await readFile(path, "utf8")).toBe(line + line);
  expect(await readdir(directory)).toEqual(["research.jsonl"]);
});

test("keeps an entry that fits exactly and rotates before the next entry exceeds 5 MiB", async () => {
  const { path } = await temporaryLog();
  const previous = Buffer.alloc(limit - Buffer.byteLength(line), "\n");
  await writeFile(path, previous);
  await appendLog(event, path);
  expect((await stat(path)).size).toBe(limit);
  await expect(stat(path + ".1")).rejects.toMatchObject({ code: "ENOENT" });

  await appendLog(event, path);
  expect(await readFile(path, "utf8")).toBe(line);
  const backup = await readFile(path + ".1");
  expect(backup.equals(Buffer.concat([previous, Buffer.from(line)]))).toBe(true);
});

test("replaces the previous backup and uses UTF-8 bytes rather than character count", async () => {
  const { directory, path } = await temporaryLog();
  const unicodeEvent: LogEvent = { event: "research_failed", durationMs: 1, errorCode: "äöü" };
  const unicodeLine = JSON.stringify(unicodeEvent) + "\n";
  const previous = Buffer.alloc(limit - unicodeLine.length, "\n");
  await writeFile(path, previous);
  await writeFile(path + ".1", "Older generation\n");

  await appendLog(unicodeEvent, path);
  expect(await readFile(path, "utf8")).toBe(unicodeLine);
  expect((await readFile(path + ".1")).equals(previous)).toBe(true);
  expect((await readdir(directory)).sort()).toEqual(["research.jsonl", "research.jsonl.1"]);
});

test("does not fail research or grow an active log when rotation fails", async () => {
  const { path } = await temporaryLog();
  await writeFile(path, Buffer.alloc(limit, "\n"));
  await mkdir(path + ".1");
  await expect(appendLog(event, path)).resolves.toBeUndefined();
  expect((await stat(path)).size).toBe(limit);
});

test("does not propagate a log write failure", async () => {
  const { path } = await temporaryLog();
  await mkdir(path);
  await expect(appendLog(event, path)).resolves.toBeUndefined();
});
