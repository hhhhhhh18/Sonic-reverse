/**
 * End-to-end test of real music search + YouTube playback, with NO real network or quota:
 *   - a fake YouTube Data API (requires the x-goog-api-key header, rejects ?key=),
 *   - a fake IFrame Player API injected in place of https://www.youtube.com/iframe_api.
 * It starts `next start` itself with a throwaway key, so run `npm run build` first.
 *
 *   CHROME_PATH   Chrome/Chromium to use (default: bundled @sparticuz/chromium, Linux only)
 *   NO_SANDBOX    set to 1 when running as root / in containers
 */
import http from "node:http";
import net from "node:net";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TEST_KEY = `TESTKEY-e2e-${Math.random().toString(36).slice(2, 12)}`;
const results = [];
const check = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const freePort = () =>
  new Promise((resolve) => {
    const s = net.createServer().listen(0, "127.0.0.1", () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });

if (!fs.existsSync(path.join(ROOT, ".next", "BUILD_ID"))) {
  console.error("No production build found. Run `npm run build` in the project root first.");
  process.exit(2);
}

// ---------------------------------------------------------------- fake YouTube Data API
const thumb = (id) => ({ medium: { url: `https://i.ytimg.com/vi/${id}/mqdefault.jpg` } });
const VIDEOS = [
  { id: "aaaaaaaaaaa", snippet: { title: "Sample Song One Full Video Song | Fake Movie | Singer One | Composer One", channelTitle: "Demo Music", thumbnails: thumb("aaaaaaaaaaa") }, contentDetails: { duration: "PT3M7S" }, status: { embeddable: true } },
  { id: "bbbbbbbbbbb", snippet: { title: 'Sample Song Two (From "Another Movie")', channelTitle: "Demo Music", thumbnails: thumb("bbbbbbbbbbb") }, contentDetails: { duration: "PT2M30S" }, status: { embeddable: true } },
  { id: "ccccccccccc", snippet: { title: "Sample Song Three", channelTitle: "Singer Three - Topic", description: "Provided to YouTube by Demo Label\n\nSample Song Three · Singer Three\n\nThird Album\n\n℗ 2024 Demo Label", thumbnails: thumb("ccccccccccc") }, contentDetails: { duration: "PT4M" }, status: { embeddable: true } },
  { id: "ddddddddddd", snippet: { title: "Blocked Song", channelTitle: "X", thumbnails: thumb("ddddddddddd") }, contentDetails: { duration: "PT3M" }, status: { embeddable: false } },
  { id: "eeeeeeeeeee", snippet: { title: "Sample Mix Jukebox", channelTitle: "X", thumbnails: thumb("eeeeeeeeeee") }, contentDetails: { duration: "PT1H" }, status: { embeddable: true } },
];
const api = { searches: [], videos: 0, badAuth: 0, keyInUrl: 0 };
const apiServer = http.createServer((req, res) => {
  const url = new URL(req.url, "http://fake");
  const json = (status, body) => {
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify(body));
  };
  if (url.searchParams.has("key")) api.keyInUrl++;
  if (req.headers["x-goog-api-key"] !== TEST_KEY) {
    api.badAuth++;
    return json(400, { error: { errors: [{ reason: "keyInvalid" }] } });
  }
  if (url.pathname.endsWith("/search")) {
    const q = url.searchParams.get("q") ?? "";
    api.searches.push({ q, lang: url.searchParams.get("relevanceLanguage"), category: url.searchParams.get("videoCategoryId"), embeddable: url.searchParams.get("videoEmbeddable") });
    if (q.includes("quotatest")) return json(403, { error: { errors: [{ reason: "quotaExceeded" }] } });
    if (q === "nothing here") return json(200, { items: [] });
    return json(200, { nextPageToken: "NEXTPAGE", items: VIDEOS.map((v) => ({ id: { videoId: v.id } })) });
  }
  if (url.pathname.endsWith("/videos")) {
    api.videos++;
    const wanted = (url.searchParams.get("id") ?? "").split(",");
    return json(200, { items: VIDEOS.filter((v) => wanted.includes(v.id)) });
  }
  return json(404, {});
});

// ---------------------------------------------------------------- fake IFrame Player API
const FAKE_IFRAME_API = `(function () {
  var y = (window.__yt = { log: [], players: [], time: 0, duration: 190, state: -1, videoId: null, volume: 100, muted: false, playing: false, lastOptions: null });
  function Player(el, opts) {
    this.opts = opts; y.players.push(this);
    y.lastOptions = JSON.parse(JSON.stringify({ width: opts.width, height: opts.height, host: opts.host, playerVars: opts.playerVars }));
    var f = document.createElement("iframe"); f.setAttribute("data-fake-yt", "1"); f.style.cssText = "width:100%;height:100%;border:0;background:#111";
    el.replaceWith(f); var self = this; setTimeout(function () { opts.events.onReady({ target: self }); }, 10);
  }
  Player.prototype._emit = function (s) { y.state = s; this.opts.events.onStateChange({ data: s }); };
  Player.prototype.loadVideoById = function (o) { y.log.push(["load", o.videoId]); y.videoId = o.videoId; y.time = 0; y.playing = true; var self = this; setTimeout(function () { self._emit(1); }, 20); };
  Player.prototype.cueVideoById = function (o) { y.log.push(["cue", o.videoId]); y.videoId = o.videoId; y.time = 0; y.playing = false; };
  Player.prototype.playVideo = function () { y.log.push(["play"]); if (!y.playing) { y.playing = true; this._emit(1); } };
  Player.prototype.pauseVideo = function () { y.log.push(["pause"]); if (y.playing) { y.playing = false; this._emit(2); } };
  Player.prototype.stopVideo = function () { y.log.push(["stop"]); y.playing = false; };
  Player.prototype.seekTo = function (s) { y.log.push(["seek", s]); y.time = s; };
  Player.prototype.setVolume = function (v) { y.log.push(["volume", v]); y.volume = v; };
  Player.prototype.mute = function () { y.log.push(["mute"]); y.muted = true; };
  Player.prototype.unMute = function () { y.log.push(["unMute"]); y.muted = false; };
  Player.prototype.getCurrentTime = function () { return y.time; };
  Player.prototype.getDuration = function () { return y.duration; };
  Player.prototype.getPlayerState = function () { return y.state; };
  Player.prototype.getVideoData = function () { return { video_id: y.videoId }; };
  Player.prototype.destroy = function () { y.log.push(["destroy"]); };
  window.YT = { Player: Player };
  setInterval(function () { if (y.playing) y.time += 0.25; }, 250);
  y.finish = function () { y.playing = false; y.players[0]._emit(0); };
  y.fail = function (code) { y.players[0].opts.events.onError({ data: code }); };
  y.userPause = function () { y.playing = false; y.players[0]._emit(2); };
  setTimeout(function () { window.onYouTubeIframeAPIReady && window.onYouTubeIframeAPIReady(); }, 5);
})();`;
const PNG_1x1 = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");

// ---------------------------------------------------------------- start everything
const apiPort = await freePort();
await new Promise((r) => apiServer.listen(apiPort, "127.0.0.1", r));
const webPort = await freePort();
const BASE = `http://127.0.0.1:${webPort}`;
let serverLog = "";
const web = spawn(process.execPath, [path.join(ROOT, "node_modules", "next", "dist", "bin", "next"), "start", "-p", String(webPort), "-H", "127.0.0.1"], {
  cwd: ROOT,
  env: {
    ...process.env,
    NODE_ENV: "production",
    YOUTUBE_API_KEY: TEST_KEY, // process env beats .env.local, so a real key in the project is never used here
    YOUTUBE_API_BASE_URL: `http://127.0.0.1:${apiPort}/youtube/v3`,
    MUSIC_PROVIDER: "youtube",
    MUSIC_RATE_LIMIT_PER_MIN: "200",
    MUSIC_DAILY_SEARCH_BUDGET: "0",
    MUSIC_CACHE_TTL_SECONDS: "3600",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
web.stdout.on("data", (d) => (serverLog += d));
web.stderr.on("data", (d) => (serverLog += d));

let browser;
const cleanup = async () => {
  try { await browser?.close(); } catch {}
  web.kill();
  apiServer.close();
};
process.on("SIGINT", async () => { await cleanup(); process.exit(130); });

try {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(BASE + "/")).ok) break; } catch {}
    await sleep(500);
    if (i === 59) throw new Error("Next server did not start:\n" + serverLog.slice(-800));
  }

  let launch;
  if (process.env.CHROME_PATH) {
    launch = { executablePath: process.env.CHROME_PATH, headless: true, args: process.env.NO_SANDBOX === "1" ? ["--no-sandbox"] : [] };
  } else {
    const { default: chromium } = await import("@sparticuz/chromium");
    launch = { args: chromium.args, executablePath: await chromium.executablePath(), headless: "shell" };
  }
  browser = await puppeteer.launch(launch);
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  const errors = [];
  const external = [];
  const scripts = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => m.type() === "error" && errors.push("console.error: " + m.text().slice(0, 200)));
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    const url = req.url();
    if (url === "https://www.youtube.com/iframe_api") return req.respond({ status: 200, contentType: "application/javascript", body: FAKE_IFRAME_API });
    if (/^https:\/\/(i9?\.ytimg\.com|s\.ytimg\.com|www\.youtube(-nocookie)?\.com)\//.test(url)) {
      external.push(url);
      return req.respond({ status: 200, contentType: "image/png", body: PNG_1x1 });
    }
    if (!url.startsWith(BASE) && !url.startsWith("data:")) external.push(url);
    req.continue();
  });
  page.on("response", async (res) => {
    if (res.url().includes("/_next/static/") && res.url().endsWith(".js")) scripts.push(res);
  });

  const yt = () => page.evaluate(() => ({ log: window.__yt.log.slice(), time: window.__yt.time, volume: window.__yt.volume, muted: window.__yt.muted, opts: window.__yt.lastOptions }));
  const waitFn = (fn, arg, timeout = 6000) => page.waitForFunction(fn, { timeout }, arg).then(() => true, () => false);
  const waitPath = (p, t) => waitFn((x) => location.pathname === x, p, t);
  const logHas = (log, ...entry) => log.some((e) => JSON.stringify(e) === JSON.stringify(entry));
  const bar = () => page.evaluate(() => {
    const b = document.querySelector('aside[aria-label="Now playing bar"]');
    return {
      title: b.querySelector("p.font-bold")?.textContent ?? null,
      transport: b.querySelector('button[aria-label="Pause"], button[aria-label="Play"]')?.getAttribute("aria-label"),
      progress: Number(b.querySelector("input[aria-label='Change progress']").value),
      times: [...b.querySelector("input[aria-label='Change progress']").parentElement.querySelectorAll("span")].map((s) => s.textContent),
    };
  });
  const panel = () => page.evaluate(() => {
    const s = document.querySelector('section[aria-label="YouTube video player"]');
    const r = s.getBoundingClientRect();
    return { visible: getComputedStyle(s).display !== "none" && r.width > 0, w: Math.round(r.width), h: Math.round(r.height) };
  });
  const setRange = (label, value) => page.$eval(`aside input[aria-label='${label}']`, (el, v) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, String(v));
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }, value);
  const toast = () => page.$eval('[role="status"][aria-live="polite"]', (el) => el.textContent);

  // ---------- typing: minimum length, debounce, no Enter ----------
  await page.goto(BASE + "/", { waitUntil: "networkidle0" });
  // The full-width privacy banner covers the bottom player bar until it is dismissed (as on the reference).
  await page.click('[role="dialog"][aria-label="Privacy"] button[aria-label="Close"]');
  await page.click('input[role="combobox"]');
  await page.keyboard.type("sa", { delay: 50 });
  await sleep(1100);
  check("typing: 2 characters does not search or navigate", (await page.evaluate(() => location.pathname)) === "/" && api.searches.length === 0);
  await page.keyboard.type("mple song", { delay: 40 });
  await sleep(300);
  check("typing: nothing happens before the 700ms debounce elapses", (await page.evaluate(() => location.pathname)) === "/" && api.searches.length === 0);
  check("typing: 'sample song' navigates after the debounce, without Enter", await waitPath("/search/sample%20song", 4000));
  await page.waitForSelector('main section[aria-label="Songs"] li');
  await sleep(300);
  check("typing: one burst of typing makes exactly one YouTube search (+1 videos lookup)", api.searches.length === 1 && api.videos === 1, `searches=${api.searches.length} videos=${api.videos}`);
  check("api: music category, embeddable only, region IN, key sent in a header", api.searches[0]?.category === "10" && api.searches[0]?.embeddable === "true" && api.keyInUrl === 0 && api.badAuth === 0);

  // ---------- real results ----------
  const rows = await page.evaluate(() => [...document.querySelectorAll('main section[aria-label="Songs"] li')].map((li) => ({ text: li.textContent, img: li.querySelector("img")?.getAttribute("src") ?? null })));
  check("results: only playable songs (blocked and jukebox hits filtered out)", rows.length === 3 && !rows.some((r) => /Blocked|Jukebox/.test(r.text)), rows.map((r) => r.text.slice(0, 22)).join(" | "));
  check("results: real titles, artists and album parsed from YouTube metadata",
    /Sample Song One/.test(rows[0].text) && /Singer One, Composer One • Fake Movie/.test(rows[0].text) &&
    /Sample Song Two/.test(rows[1].text) && /Another Movie/.test(rows[1].text) &&
    /Singer Three • Third Album/.test(rows[2].text));
  check("results: YouTube thumbnails are shown", rows.every((r) => r.img?.startsWith("https://i.ytimg.com/vi/")));
  const extras = await page.evaluate(() => ({
    headings: [...document.querySelectorAll("main h2")].map((h) => h.textContent),
    demoBanner: !!document.querySelector('main [role="note"]'),
    top: document.querySelector('section[aria-label="Top result"]')?.textContent ?? "",
  }));
  check("results: Top result, Songs, Artists and Albums sections; no demo banner", ["Top result", "Songs", "Artists", "Albums"].every((h) => extras.headings.includes(h)) && !extras.demoBanner && /Sample Song One/.test(extras.top));
  const before = api.searches.length;
  await page.reload({ waitUntil: "networkidle0" });
  check("cache: reloading the same search makes no new YouTube call", api.searches.length === before);

  // ---------- key safety ----------
  const htmlSearch = await (await fetch(BASE + "/search/sample%20song")).text();
  const apiJson = await (await fetch(BASE + "/api/music/search?q=sample%20song")).text();
  check("security: the key is not in page HTML or API responses", ![htmlSearch, apiJson, await (await fetch(BASE + "/")).text()].some((t) => t.includes(TEST_KEY)));
  let leaked = [];
  for (const res of scripts) {
    try { const t = await res.text(); if (t.includes(TEST_KEY) || t.includes("x-goog-api-key") || t.includes("YOUTUBE_API_KEY")) leaked.push(res.url()); } catch {}
  }
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
  for (const f of walk(path.join(ROOT, ".next", "static")).filter((f) => /\.(js|css|map)$/.test(f))) {
    const t = fs.readFileSync(f, "utf8");
    if (t.includes(TEST_KEY) || t.includes("x-goog-api-key") || t.includes("YOUTUBE_API_KEY")) leaked.push(path.relative(ROOT, f));
  }
  check(`security: no client JavaScript mentions the key, its env name or the auth header (${scripts.length} loaded chunks + .next/static scanned)`, leaked.length === 0, leaked.slice(0, 3).join(", "));
  check("security: the browser never calls the YouTube Data API itself", !external.some((u) => u.includes("googleapis.com")));

  // ---------- playback ----------
  await page.click('main section[aria-label="Songs"] li button[aria-label^="Play Sample Song One"]');
  check("play: clicking a song loads that video in the YouTube player", await waitFn(() => window.__yt?.log.some((e) => e[0] === "load" && e[1] === "aaaaaaaaaaa"), null));
  const first = await yt();
  const p1 = await panel();
  check("player panel: visible and at least 200x200 (400x225 body)", p1.visible && p1.w >= 200 && p1.h >= 200, `${p1.w}x${p1.h}`);
  check("player: privacy-enhanced host, origin set, inline playback", first.opts.host === "https://www.youtube-nocookie.com" && first.opts.playerVars.origin === BASE && first.opts.playerVars.playsinline === 1);
  await sleep(1500);
  const b1 = await bar();
  check("bottom bar: shows the song, a Pause button, a moving progress and the player's real duration", b1.title === "Sample Song One" && b1.transport === "Pause" && b1.progress >= 1 && b1.times[1] === "3:10", JSON.stringify(b1));

  await page.click('aside button[aria-label="Pause"]');
  await sleep(500);
  const t0 = (await bar()).progress;
  await sleep(1000);
  const pausedBar = await bar();
  const pausedYt = await yt();
  check("pause: bar Pause tells the player to pause, and progress stops", logHas(pausedYt.log, "pause") && pausedBar.progress === t0 && pausedBar.transport === "Play",
    `bar=${JSON.stringify(pausedBar)} t0=${t0} log=${JSON.stringify(pausedYt.log.slice(-8))}`);
  await page.click('aside button[aria-label="Play"]');
  await sleep(400);
  check("resume: bar Play resumes the player", (await bar()).transport === "Pause" && (await yt()).log.filter((e) => e[0] === "play").length >= 1);

  await setRange("Change progress", 90);
  await sleep(500);
  const afterSeek = await bar();
  check("seek: dragging progress seeks the player to that second and the bar follows", logHas((await yt()).log, "seek", 90) && /^1:3\d$/.test(afterSeek.times[0]), afterSeek.times[0]);

  await setRange("Change volume", 30);
  await page.click('aside button[aria-label="Mute"]');
  await sleep(300);
  const v = await yt();
  check("volume + mute: bar controls drive the player", logHas(v.log, "volume", 30) && v.volume === 30 && v.muted === true);
  await page.click('aside button[aria-label="Unmute"]');
  await sleep(200);
  check("unmute: player is unmuted", (await yt()).muted === false);

  await page.evaluate(() => window.__yt.userPause());
  await sleep(300);
  check("sync: pausing inside the YouTube player updates the bar", (await bar()).transport === "Play");
  await page.click('aside button[aria-label="Play"]');
  await sleep(300);

  await page.evaluate(() => window.__yt.finish());
  check("track end: the next song loads automatically", await waitFn(() => window.__yt.log.some((e) => e[0] === "load" && e[1] === "bbbbbbbbbbb"), null));
  await sleep(300);
  check("track end: bar now shows song two", (await bar()).title === "Sample Song Two");

  await page.evaluate(() => window.__yt.fail(101));
  check("error: an un-embeddable video is skipped to the next song", await waitFn(() => window.__yt.log.some((e) => e[0] === "load" && e[1] === "ccccccccccc"), null));
  check("error: the user is told why", /doesn't allow/.test(await toast()), await toast());

  await page.click('button[aria-label="Close video"]');
  await sleep(300);
  const closed = await panel();
  check("close: hides the player and pauses so nothing plays hidden", !closed.visible && (await bar()).transport === "Play" && logHas((await yt()).log, "pause"));
  await page.click('aside button[aria-label="Show Now Playing view"]');
  await sleep(200);
  check("reopen: 'Show Now Playing view' shows the player again", (await panel()).visible);
  await page.click('button[aria-label="Close video"]');
  await page.click('aside button[aria-label="Play"]');
  await sleep(300);
  check("reopen: pressing Play also shows the player and resumes", (await panel()).visible && (await bar()).transport === "Pause");

  await page.evaluate(() => window.__yt.finish());
  await sleep(500);
  const ended = await bar();
  check("queue end: playback stops, rewound, with a Play button", ended.transport === "Play" && ended.progress === 0, JSON.stringify(ended));
  const shotsDir = process.env.SHOTS_DIR ?? path.join(process.env.TEMP ?? process.env.TMPDIR ?? "/tmp", "web-player-clone-shots");
  fs.mkdirSync(shotsDir, { recursive: true });
  await page.screenshot({ path: path.join(shotsDir, "youtube-flow-playing.png") });

  // ---------- Enter, short queries, non-Latin queries, empty and failing searches ----------
  await page.goto(BASE + "/", { waitUntil: "networkidle0" });
  await page.click('input[role="combobox"]');
  await page.keyboard.type("zz");
  const t1 = Date.now();
  await page.keyboard.press("Enter");
  const enteredFast = (await waitPath("/search/zz", 1500)) && Date.now() - t1 < 650;
  check("Enter: searches immediately, ahead of the 700ms debounce", enteredFast, `${Date.now() - t1}ms`);
  const shortNotice = await page.evaluate(() => document.querySelector('main [role="note"]')?.textContent ?? "");
  check("short query: explains it needs 3 characters and shows demo results", /Showing demo results/.test(shortNotice) && /at least 3 characters/.test(shortNotice), shortNotice.slice(0, 80));

  const telugu = "బుట్ట బొమ్మ";
  await page.goto(BASE + "/search/" + encodeURIComponent(telugu), { waitUntil: "networkidle0" });
  check("Telugu query: searches YouTube with a Telugu language hint and shows results", api.searches.at(-1)?.q === telugu && api.searches.at(-1)?.lang === "te" && (await page.$$('main section[aria-label="Songs"] li')).length === 3);

  await page.goto(BASE + "/search/nothing%20here", { waitUntil: "networkidle0" });
  check("no results: friendly message instead of demo data", /No songs found for/.test(await page.$eval("main", (m) => m.textContent)) && !(await page.$('main [role="note"]')));

  const callsBeforeQuota = api.searches.length;
  await page.goto(BASE + "/search/quotatest%20song", { waitUntil: "networkidle0" });
  const quotaNotice = await page.evaluate(() => document.querySelector('main [role="note"]')?.textContent ?? "");
  check("quota exhausted: falls back to demo results with an explanation", /Showing demo results/.test(quotaNotice) && /quota/i.test(quotaNotice), quotaNotice.slice(0, 90));
  await page.goto(BASE + "/search/another%20query", { waitUntil: "networkidle0" });
  check("quota exhausted: later searches don't hammer YouTube", api.searches.length === callsBeforeQuota + 1);
  const cachedApi = await fetch(BASE + "/api/music/search?q=sample%20song");
  check("api route: still serves cached results while the quota is blocked", cachedApi.status === 200 && (await cachedApi.json()).cached === true);
  const bad = await fetch(BASE + "/api/music/search?q=ab");
  check("api route: rejects too-short queries with 400", bad.status === 400);

  check("hygiene: the server log never contains the key", !serverLog.includes(TEST_KEY));
  check("hygiene: no browser errors", errors.length === 0, errors.slice(0, 3).join(" | "));
} catch (error) {
  check("test run completed without crashing", false, String(error?.stack ?? error).slice(0, 600));
} finally {
  await cleanup();
}
console.log(`\n${results.filter(Boolean).length}/${results.length} checks passed`);
process.exit(results.length > 0 && results.every(Boolean) ? 0 : 1);
