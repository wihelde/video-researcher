import { expect, test } from "bun:test";
import { createApp } from "../src/app";
import { searchGoogleLens, type BrowserCommandRunner } from "../src/lens";

const facebook = "https://www.facebook.com/furremedia452/videos/tukuhu/1523457048907185/";
const threads = "https://www.threads.com/@austrianton/post/DZKoz5pCDFH/tactical-assault-raven/";
const links = [
  { url: "https://www.reddit.com/r/likeus/comments/1pe8c9e/crow/", title: "Crow · 4. Dez. 2025" },
  { url: "https://www.google.com/goto?url=facebook", title: "Tukuhu · 11. Dez. 2025 · Facebook" },
  { url: "https://www.google.com/goto?url=threads", title: "Tactical assault raven · 4. Juni 2026 · Threads" },
];
const run: BrowserCommandRunner = async (args, stdin) => {
  if (args[0] === "get") return "https://www.google.com/search?udm=48";
  if (stdin?.includes("lens-cropped")) return "lens-full";
  if (stdin?.includes("lens-exact-inactive")) return "lens-exact-active";
  return JSON.stringify(links);
};

test("keeps Facebook and Threads after Google's timed verification instead of losing them", async () => {
  const calls: string[] = [];
  const waits: number[] = [];
  const attention: Array<boolean | "verification"> = [];
  const result = await searchGoogleLens("https://example.com/raven.jpg", run,
    value => attention.push(value),
    async (input, init) => {
      expect(init?.redirect).toBe("manual");
      const url = String(input);
      calls.push(url);
      if (url.endsWith("=facebook")) return new Response('<meta content="64;url=/goto?url=verified-facebook&amp;step=2" http-equiv="refresh"><div>Anfrage wird verifiziert</div>');
      return new Response(null, { status: 302, headers: { location: url.includes("verified-facebook") ? facebook : threads } });
    }, undefined, async ms => { waits.push(ms); },
  );
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.error.message);
  expect(result.matches.map(m => m.url)).toEqual([links[0].url, facebook, threads]);
  expect(result.matches[1].lensPublishedAt).toBe("2025-12-11");
  expect(result).not.toHaveProperty("warning");
  expect(waits).toEqual([64_000]);
  expect(attention.slice(-2)).toEqual(["verification", false]);
  expect(calls).toContain("https://www.google.com/goto?url=verified-facebook&step=2");
  expect(calls.every(url => new URL(url).hostname === "www.google.com")).toBe(true);
});

test("bounds verification waits across the whole research and returns an explicit partial warning", async () => {
  const waits: number[] = [];
  const result = await searchGoogleLens("https://example.com/raven.jpg", run, undefined,
    async () => new Response('<meta http-equiv="refresh" content="64;url=/goto?url=still-blocked">'),
    undefined, async ms => { waits.push(ms); },
  );
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.error.message);
  expect(result.matches).toHaveLength(1);
  expect(result.warning).toMatchObject({ code: "lens-links-incomplete" });
  expect(result.warning?.message).toContain("2 Google-Links");
  expect(waits).toEqual([64_000]);
});

test("stops after 30 supported unique findings without resolving later links", async () => {
  const candidates = [
    {url:"https://www.facebook.com/example/",title:"Profile, not a post"},
    {url:"https://www.instagram.com/reel/SamePost/",title:"Reel"},
    {url:"https://www.instagram.com/p/SamePost/",title:"Same post"},
    ...Array.from({length:29},(_,i)=>({url:`https://www.google.com/goto?url=${i}`,title:`Post ${i}`})),
    {url:"https://www.google.com/goto?url=outside-limit",title:"Must not request"},
  ];
  let calls = 0;
  const result = await searchGoogleLens("https://example.com/raven.jpg", async (args, stdin, options) => {
    if(stdin?.includes("const urlPattern")) return JSON.stringify(candidates);
    return run(args,stdin,options);
  }, undefined, async input => {
    const id=new URL(String(input)).searchParams.get("url");
    if(id === "outside-limit") throw new Error("Should have stopped at 30 findings");
    calls++;
    return new Response(null,{status:302,headers:{location:`https://x.com/example/status/${id}`}});
  });
  expect(result.ok).toBe(true);
  if(!result.ok) throw new Error(result.error.message);
  expect(result.matches).toHaveLength(30);
  expect(result).not.toHaveProperty("warning");
  expect(calls).toBe(29);
});

test("does not request platform targets supplied by an HTML refresh or retry a CAPTCHA forever", async () => {
  for (const body of [
    '<meta http-equiv="refresh" content="1;url=https://www.facebook.com/reel/123/">',
    '<meta http-equiv="refresh" content="100000;url=/goto?url=blocked">',
    '<meta http-equiv="refresh" content="0;url=/goto?url=blocked">',
    '<html><div>reCAPTCHA</div></html>',
  ]) {
    let calls = 0;
    const result = await searchGoogleLens("https://example.com/raven.jpg", run, undefined,
      async () => { calls++; return new Response(body); },
      undefined, async () => {},
    );
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error.message);
    expect(result.warning?.code).toBe("lens-links-incomplete");
    expect(calls).toBeLessThanOrEqual(6);
  }
});

test("shows automatic verification status and preserves partial findings and warning in the API and log", async () => {
  let release!: () => void;
  let started!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  const running = new Promise<void>(resolve => { started = resolve; });
  const events: unknown[] = [];
  const warning = { code: "lens-links-incomplete", message: "2 Google-Links konnten nicht aufgelöst werden. Die Recherche ist unvollständig." };
  const app = createApp({
    preflight: async () => ({ready:true,checks:[]}),
    extractPost: async () => ({ok:true,post:{url:links[0].url,platform:"reddit",title:"Crow",publishedAt:null,thumbnailUrl:"https://example.com/raven.jpg"}}),
    searchLens: async (_url, reportAttention) => {
      reportAttention("verification");
      started();
      await pending;
      return {ok:true,matches:[{url:facebook,title:"Tukuhu",match:"full",source:"lens"}],warning};
    },
    log: async event => { events.push(event); },
  });
  const request = app.fetch(new Request("http://localhost/api/research", {method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({url:links[0].url})}));
  await running;
  expect(await (await app.fetch(new Request("http://localhost/api/research/status"))).json()).toEqual({active:true,phase:"lens",attention:"verification"});
  release();
  const body = await (await request).json();
  expect(body.findings.some((f: { url: string }) => f.url === facebook)).toBe(true);
  expect(body.lensMessage).toBe(warning.message);
  expect(events[0]).toMatchObject({lensErrorCode:"lens-links-incomplete",lensMatches:1});
  expect(JSON.stringify(events)).not.toContain("facebook.com");
});
