import { createApp } from "./app";

const port = Number(process.env.PORT ?? 3000);
const server = Bun.serve({
  hostname: "127.0.0.1",
  port,
  fetch: createApp().fetch,
});

console.log(`Video Researcher läuft auf ${server.url}`);
