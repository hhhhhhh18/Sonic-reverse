import puppeteer from "puppeteer-core";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * End-to-end browser checks for the running app (`npm run build && npm start`).
 *
 *   BASE_URL     app URL                      (default http://localhost:3000)
 *   CHROME_PATH  path to a Chrome/Chromium    (default: bundled @sparticuz/chromium, Linux only)
 *   NO_SANDBOX   set to 1 when running as root / in containers
 *   SHOTS_DIR    where screenshots are saved  (default: <tmp>/web-player-clone-shots)
 */
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const SHOTS = process.env.SHOTS_DIR ?? path.join(os.tmpdir(), "web-player-clone-shots");
fs.mkdirSync(SHOTS, { recursive: true });

const results = [];
const check = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let launchOptions;
if (process.env.CHROME_PATH) {
  launchOptions = {
    executablePath: process.env.CHROME_PATH,
    headless: true,
    args: process.env.NO_SANDBOX === "1" ? ["--no-sandbox"] : [],
  };
} else {
  const { default: chromium } = await import("@sparticuz/chromium");
  launchOptions = { args: chromium.args, executablePath: await chromium.executablePath(), headless: "shell" };
}
const browser = await puppeteer.launch(launchOptions);
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => m.type() === "error" && errors.push("console.error: " + m.text().slice(0, 200)));

const currentPath = () => page.evaluate(() => location.pathname);
const waitPath = (p, t = 4000) =>
  page.waitForFunction((x) => location.pathname === x, { timeout: t }, p).then(() => true, () => false);
const inputValue = () => page.$eval('input[role="combobox"]', (el) => el.value);

// ---------- Home ----------
await page.goto(BASE + "/", { waitUntil: "networkidle0" });
const home = await page.evaluate(() => ({
  h2: [...document.querySelectorAll("main h2")].map((h) => h.textContent),
  cardsPerShelf: [...document.querySelectorAll("main section[aria-label]")].map((s) => s.querySelectorAll("article").length),
  landmarks: {
    main: document.querySelector("main")?.getAttribute("aria-label"),
    aside: !!document.querySelector('aside[aria-label="Now playing bar"]'),
    search: !!document.querySelector('[role="search"]'),
    nav: !!document.querySelector('nav[aria-label="Main"]'),
    dialog: !!document.querySelector('[role="dialog"][aria-label="Privacy"]'),
  },
  combobox: document.querySelector('input[role="combobox"]')?.getAttribute("aria-label"),
  controlsDisabled: [...document.querySelectorAll('aside button')].filter((b) => ["Previous", "Play", "Next"].includes(b.getAttribute("aria-label"))).every((b) => b.disabled),
}));
check("home: three shelves with titles", JSON.stringify(home.h2.slice(0, 3)) === JSON.stringify(["Trending songs", "Popular artists", "Popular albums and singles"]), home.h2.slice(0,3).join(" | "));
check("home: each shelf shows at least 4 cards", home.cardsPerShelf.length === 3 && home.cardsPerShelf.every((n) => n >= 4), "cards/shelf=" + home.cardsPerShelf.join(","));
check("home: landmarks (main, now-playing aside, search, nav Main, Privacy dialog)", home.landmarks.main === "Home" && home.landmarks.aside && home.landmarks.search && home.landmarks.nav && home.landmarks.dialog);
check("home: combobox named 'What do you want to play?'", home.combobox === "What do you want to play?");
check("home: transport controls disabled before anything plays", home.controlsDisabled);
await page.screenshot({ path: `${SHOTS}/home-1280x720.png` });

// ---------- Fidelity: numbers measured from the reference screenshot ----------
const fid = await page.evaluate(() => {
  const r = (el) => { const b = el.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)]; };
  const banner = document.querySelector('[role="dialog"][aria-label="Privacy"]');
  return {
    banner: r(banner), bannerBg: getComputedStyle(banner).backgroundColor,
    slider: document.querySelector('[role="slider"][aria-label="Resize main navigation"]').getAttribute("aria-valuenow"),
    vw: window.innerWidth, vh: window.innerHeight,
  };
});
check("fidelity: privacy banner is #eeeeee and flush to the left/right/bottom edges",
  fid.bannerBg === "rgb(238, 238, 238)" && fid.banner[0] === 0 && fid.banner[2] === fid.vw && fid.banner[1] + fid.banner[3] === fid.vh, JSON.stringify(fid.banner) + " " + fid.bannerBg);
check("fidelity: sidebar width is 290 at a 1280px viewport (observed slider value)", fid.slider === "290", "valuenow=" + fid.slider);

// ---------- Cookie/privacy banner ----------
await page.click('[role="dialog"][aria-label="Privacy"] button[aria-label="Close"]');
await sleep(150);
check("banner: dismisses on Close", (await page.$('[role="dialog"][aria-label="Privacy"]')) === null);
await page.reload({ waitUntil: "networkidle0" });
check("banner: stays dismissed after reload", (await page.$('[role="dialog"][aria-label="Privacy"]')) === null);

// ---------- Search: real keystrokes, no Enter, no document reload ----------
await page.evaluate(() => { window.__noReloadMarker = 42; });
await page.click('input[role="combobox"]');
await page.keyboard.type("hello", { delay: 60 });
const arrived = await waitPath("/search/hello");
check("search: typing 'hello' navigates to /search/hello (no Enter)", arrived, "path=" + (await currentPath()));
check("search: no document reload (JS marker survived)", (await page.evaluate(() => window.__noReloadMarker)) === 42);
check("search: input keeps the typed value", (await inputValue()) === "hello");
const sr = await page.evaluate(() => ({
  main: document.querySelector("main")?.getAttribute("aria-label"),
  title: document.title,
  h2: [...document.querySelectorAll("main h2")].map((h) => h.textContent),
  filters: [...document.querySelectorAll('nav[aria-label="Search filters"] a')].map((a) => a.textContent + "→" + a.getAttribute("href")),
  active: document.querySelector('nav[aria-label="Search filters"] a[aria-current="page"]')?.textContent,
  clearBtn: !!document.querySelector('button[aria-label="Clear search field"]'),
  status: document.querySelector("#search-status")?.textContent,
  rowButtons: [...document.querySelectorAll('main section[aria-label="Songs"] li')].slice(0, 1).map((li) => [...li.querySelectorAll("button")].map((b) => b.getAttribute("aria-label")?.split(" ").slice(0, 3).join(" "))),
}));
const want = ["Top result", "Songs", "Artists", "Albums", "Playlists", "Podcasts", "Episodes", "Profiles"];
check("search: sections Top result / Songs / Artists / Albums / Playlists / Podcasts / Episodes / Profiles", want.every((w) => sr.h2.includes(w)), sr.h2.join(" | "));
check("search: seven filter links with observed URLs", sr.filters.length === 7 && sr.filters[0] === "All→/search/hello" && sr.filters[5] === "Podcasts & Shows→/search/hello/podcastAndEpisodes", sr.filters.join(" ; "));
check("search: 'All' filter is current; main labelled; status 'Search results'; clear button shown", sr.active === "All" && sr.main === "Search for hello | Web Player Clone" && sr.status === "Search results" && sr.clearBtn);
check("search: song row has play, like, more-options actions", sr.rowButtons[0].length === 3 && /^Play /.test(sr.rowButtons[0][0]) && sr.rowButtons[0][1] === "Add to Liked" && /^More options/.test(sr.rowButtons[0][2]), JSON.stringify(sr.rowButtons[0]));
await page.screenshot({ path: `${SHOTS}/search-hello-1280x720.png` });

// ---------- Filter navigation (client-side) ----------
await page.click('nav[aria-label="Search filters"] a[href="/search/hello/tracks"]');
check("filter: clicking Songs goes to /search/hello/tracks client-side", (await waitPath("/search/hello/tracks")) && (await page.evaluate(() => window.__noReloadMarker)) === 42);
check("filter: Songs is the current chip and input still says 'hello'", (await page.$eval('nav[aria-label="Search filters"] a[aria-current="page"]', (a) => a.textContent)) === "Songs" && (await inputValue()) === "hello");

// typing more while on a filter keeps the filter (our design choice)
await page.click('input[role="combobox"]');
await page.keyboard.press("End");
await page.keyboard.type(" w", { delay: 60 });
check("search: typing more keeps the active filter in the URL", await waitPath("/search/hello%20w/tracks"), "path=" + (await currentPath()));

// ---------- Back button keeps the field in sync ----------
await page.goBack();
const backOk = await waitPath("/search/hello");
await sleep(200);
check("history: Back goes to the prior entry (/search/hello) and the field follows the URL (was 'hello w')", backOk && (await inputValue()) === "hello", `path=${await currentPath()} value="${await inputValue()}"`);

// ---------- Clear ----------
await page.click('button[aria-label="Clear search field"]');
check("clear: Clear search field empties the input and returns Home", (await waitPath("/")) && (await inputValue()) === "");

// ---------- Playback (mock) ----------
await page.type('input[role="combobox"]', "hello", { delay: 40 });
await waitPath("/search/hello");
await page.click('main li button[aria-label^="Play "]');
await sleep(300);
const np1 = await page.evaluate(() => {
  const bar = document.querySelector('aside[aria-label="Now playing bar"]');
  return {
    title: bar.querySelector("p.font-bold")?.textContent,
    transport: bar.querySelector('button[aria-label="Pause"], button[aria-label="Play"]')?.getAttribute("aria-label"),
    time: bar.querySelector("input[aria-label='Change progress']")?.value,
    row: document.querySelector('main li button[aria-label^="Pause "]') ? "row shows Pause" : "row not paused-label",
  };
});
check("play: clicking a song shows it in the bar and flips to Pause", !!np1.title && np1.transport === "Pause" && np1.row === "row shows Pause", `title="${np1.title}" transport=${np1.transport}`);
await sleep(1700);
const t2 = await page.$eval("aside input[aria-label='Change progress']", (el) => Number(el.value));
check("play: simulated playhead advances while playing", t2 >= 1, "position=" + t2 + "s");
await page.click('aside button[aria-label="Pause"]');
const frozen = await page.$eval("aside input[aria-label='Change progress']", (el) => Number(el.value));
await sleep(1200);
const frozen2 = await page.$eval("aside input[aria-label='Change progress']", (el) => Number(el.value));
check("pause: playhead stops and button reads Play", frozen === frozen2 && (await page.$('aside button[aria-label="Play"]')) !== null, `${frozen}s → ${frozen2}s`);
await page.click('aside button[aria-label="Next"]');
await sleep(200);
const nextTitle = await page.$eval("aside p.font-bold", (el) => el.textContent);
check("next: advances to a different track and starts playing", nextTitle !== np1.title && (await page.$('aside button[aria-label="Pause"]')) !== null, `"${np1.title}" → "${nextTitle}"`);
await page.screenshot({ path: `${SHOTS}/playing-1280x720.png` });

// ---------- Unimplemented features are honest ----------
await page.click('main li button[aria-label="Add to Liked Songs"]');
await sleep(200);
const toast = await page.$eval('[role="status"][aria-live="polite"]', (el) => el.textContent);
check("honesty: Add to Liked Songs shows a 'not implemented' notice", /isn't implemented in this demo/.test(toast), toast);

// ---------- Fidelity: layout geometry (1100x360 gives the same 280px sidebar as the 640px reference) ----------
await page.setViewport({ width: 1100, height: 360 });
await page.goto(BASE + "/", { waitUntil: "networkidle0" });
await sleep(300);
const g = await page.evaluate(() => {
  const r = (el) => { const b = el.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)]; };
  const q = (s) => document.querySelector(s);
  return {
    logo: r(q('header a[aria-label$="home"]')), sidebar: r(q('nav[aria-label="Main"]')), main: r(q(".main-panel")),
    plus: r(q('button[aria-label="Create"]')), prompt: r(q('nav[aria-label="Main"] section')),
    heading: r(q("main h2")), art: r(q("main article > div > div")), card1: r(q("main article")),
    slider: q('[role="slider"][aria-label="Resize main navigation"]').getAttribute("aria-valuenow"),
    mainBg: getComputedStyle(q(".main-panel")).backgroundImage.slice(0, 40), logoFill: q("header svg circle").getAttribute("fill"),
  };
});
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
check("fidelity: logo is a white 32px mark at (28,16)", eq(g.logo, [28, 16, 32, 32]) && g.logoFill === "#ffffff", JSON.stringify(g.logo) + " " + g.logoFill);
check("fidelity: sidebar panel x=8 w=280, main panel starts x=296, top y=64", g.sidebar[0] === 8 && g.sidebar[2] === 280 && g.sidebar[1] === 64 && g.main[0] === 296 && g.main[1] === 64 && g.slider === "280", JSON.stringify([g.sidebar, g.main, g.slider]));
check("fidelity: '+' button 36px at (236,80); first prompt card at (16,155) w=264", eq(g.plus, [236, 80, 36, 36]) && g.prompt[0] === 16 && g.prompt[1] === 155 && g.prompt[2] === 264, JSON.stringify([g.plus, g.prompt]));
check("fidelity: first shelf heading box at (336,92) 32px tall; artwork top-left at (336,136)", g.heading[0] === 336 && g.heading[1] === 92 && g.heading[3] === 32 && g.art[0] === 336 && g.art[1] === 136, JSON.stringify([g.heading, g.art]));
check("fidelity: cards touch (12px padding, no gap) and are at least 178px wide", g.card1[2] >= 178 && g.card1[0] === 324, JSON.stringify(g.card1));
check("fidelity: main panel has the top gradient", /linear-gradient/.test(g.mainBg), g.mainBg);

// ---------- Small viewport ----------
await page.setViewport({ width: 640, height: 360 });
await page.goto(BASE + "/", { waitUntil: "networkidle0" });
const small = await page.evaluate(() => ({
  hScroll: document.documentElement.scrollWidth > window.innerWidth + 1,
  libBtn: !!document.querySelector('button[aria-label="Open Your Library"]'),
  searchBtn: !!document.querySelector('button[aria-label="Open search"]'),
  sidebarVisible: [...document.querySelectorAll('nav[aria-label="Main"]')].some((n) => n.offsetParent),
}));
check("640px: no horizontal page scroll; sidebar collapses to a drawer button", !small.hScroll && small.libBtn && small.searchBtn && !small.sidebarVisible, JSON.stringify(small));
await page.screenshot({ path: `${SHOTS}/home-640x360.png` });
await page.click('button[aria-label="Open Your Library"]');
await sleep(150);
check("640px: Library drawer opens (a visible Your Library nav appears)", await page.evaluate(() => [...document.querySelectorAll('nav[aria-label="Main"]')].some((n) => n.offsetParent && /Your Library/.test(n.textContent))));
await page.screenshot({ path: `${SHOTS}/drawer-640x360.png` });
await page.click('button[aria-label="Close Your Library"]');
await sleep(150);
check("640px: drawer closes again", await page.evaluate(() => ![...document.querySelectorAll('nav[aria-label="Main"]')].some((n) => n.offsetParent)));

console.log("\nbrowser errors:", errors.length ? errors.slice(0, 5) : "none");
console.log(`\n${results.filter(Boolean).length}/${results.length} checks passed`);
await browser.close();
process.exit(results.every(Boolean) ? 0 : 1);
