# Web Player Clone (unofficial study recreation)

A Next.js + TypeScript + Tailwind recreation of the **logged-out** interface and observable
behavior of a popular music web player, built from browser captures (screenshot, accessibility
tree, page URLs, network *metadata*). By default it uses **original mock data and generated placeholder
artwork**; with a YouTube API key it searches and plays real songs through the **official YouTube APIs**. It does **not** use any private API. It is not affiliated with or endorsed by Spotify.

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
```

Checks:

```bash
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm test             # vitest: catalog, search ranking, player state machine, YouTube parsing/client/service
npm run build && npm start
```

Browser end-to-end checks (35 assertions: behavior, plus measured layout numbers; real keystrokes, no Enter) live in `e2e/` with their
own dependencies. With the app running on the demo catalog (`MUSIC_PROVIDER=mock npm run build && MUSIC_PROVIDER=mock npm start`, so no API quota is used):

```bash
cd e2e && npm install
# Windows (PowerShell), using your installed Chrome:
$env:CHROME_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"; $env:BASE_URL="http://localhost:3000"; npm test
# Linux/macOS:  CHROME_PATH=/path/to/chrome BASE_URL=http://localhost:3000 npm test
# (add NO_SANDBOX=1 when running as root / in a container)
```

## What is implemented (and where)

| Observed on the reference | Here |
|---|---|
| Header: logo, home, search, Premium/Support/Download, Install App, Sign up, Log in | `components/shell/TopBar.tsx` |
| Search navigates to `/search/<query>` as you type, no Enter, no reload | `components/shell/SearchBox.tsx` |
| Library sidebar: playlist + podcast prompts, legal links, language | `components/shell/Sidebar.tsx` |
| Home: Trending songs, Popular artists, Popular albums and singles | `components/pages/HomePage.tsx` |
| Search filters All / Songs / Albums / Artists / Playlists / Podcasts & Shows / Profiles → `/search/q`, `/tracks`, `/albums`, `/artists`, `/playlists`, `/podcastAndEpisodes`, `/users` | `FilterChips.tsx`, `lib/search.ts`, `app/search/**` |
| Sections: Top result, Songs, Artists, Albums, Playlists, Podcasts, Episodes, Profiles | `components/pages/SearchPage.tsx` |
| Song row: info, duration, play, Add to Liked Songs, More options | `components/media/TrackRow.tsx` |
| Now-playing bar: disabled preview state, then transport controls | `components/shell/NowPlayingBar.tsx` |
| Dismissible privacy banner | `components/shell/CookieBanner.tsx` |
| Landmarks/names: skip link, `search`, `nav "Main"`, `main`, `aside "Now playing bar"`, dialog "Privacy", combobox "What do you want to play?", slider "Resize main navigation" | `AppShell.tsx` and the files above |

## Real music search and playback (YouTube)

With a YouTube API key, search returns **real songs** (title, artists and album when YouTube's
metadata states them, thumbnail, duration, video id) for Telugu, Hindi, Tamil, Malayalam and
international music, and they play through the **official YouTube IFrame Player API** in a visible
player panel above the bottom bar, driven by the existing bottom controls (play/pause, seek, volume,
mute, previous/next, shuffle, repeat). Without a key, or if YouTube fails, the built-in demo catalog is
shown with a visible banner saying why.

### Setup

1. In [Google Cloud Console](https://console.cloud.google.com/) create (or pick) a project.
2. **APIs & Services → Library →** enable **YouTube Data API v3**.
3. **APIs & Services → Credentials → Create credentials → API key.** Then edit the key:
   **API restrictions → Restrict key → YouTube Data API v3.** If your server has a fixed IP, add an
   **IP address** application restriction too (on serverless hosts egress IPs change, so rely on the
   API restriction and your quota).
4. Copy `.env.example` to `.env.local` and set `YOUTUBE_API_KEY=` to your key. `.env.local` is
   git-ignored; never commit it and never put a real key in `.env.example`.
5. Restart `npm run dev` (Next.js reads `.env.local` at startup).

No OAuth is needed for public search. The IFrame Player API needs no key.

| Variable | Default | Purpose |
|---|---|---|
| `YOUTUBE_API_KEY` | none | **Required.** Server-side only (no `NEXT_PUBLIC_` prefix). |
| `YOUTUBE_REGION_CODE` | `IN` | Region bias for results. |
| `MUSIC_CACHE_TTL_SECONDS` | `21600` | Identical searches are served from memory for this long, at no quota cost. |
| `MUSIC_RATE_LIMIT_PER_MIN` | `20` | Uncached searches per client per minute. |
| `MUSIC_DAILY_SEARCH_BUDGET` | `90` | Uncached searches per Pacific day before the app stops calling YouTube. |
| `MUSIC_PROVIDER` | `youtube` | `mock` forces the demo catalog (used by the bundled e2e tests). |

### How it behaves

- **Search as you type:** a search starts 700 ms after you stop typing and needs at least 3
  characters; pressing **Enter** searches immediately.
- **Quota:** a YouTube search is expensive. Google's current docs describe a default of roughly
  **100 searches per day** per project, so results are cached, rate-limited and capped by
  `MUSIC_DAILY_SEARCH_BUDGET`. Check your project's **Quotas** page for the real numbers; more quota
  needs Google's audit/quota-extension form.
- **Artists and albums** are *parsed* from video titles and descriptions: YouTube has no such fields.
  Auto-generated "Topic" uploads are exact; film-song uploads (`Song | Movie | credits`) are
  usually right; otherwise a field is left empty rather than guessed (the byline then shows the
  uploading channel). The Artists and Albums sections are derived from the same results.
- **The player stays visible** while a YouTube song is playing (YouTube requires the embedded player to be
  shown, at least 200×200; this one is 400×225). Closing it pauses playback; press play, or the
  "Show Now Playing view" button, to bring it back. Videos that can't be embedded are filtered out
  or skipped with a notice. YouTube may show ads inside the player.
- **Key safety:** the key is read only in server code (`src/lib/music/*`, `src/app/api/music/*`) and sent
  in an `x-goog-api-key` header, never in a URL; error messages never include it.

API: `GET /api/music/search?q=<query>[&pageToken=<token>]` returns normalized results (or
`{ "error": { "code", "message" } }` with 400/429/502/503).

### Testing without spending quota

- `npm test` covers the parser, client, service (validation, cache, rate limit, budget, error mapping)
  and the player state machine with mocked network.
- `MUSIC_PROVIDER=mock npm run build && MUSIC_PROVIDER=mock npm start`, then run `e2e/e2e.mjs`.
- `e2e/youtube-flow.mjs` starts a **fake YouTube API** and a **fake IFrame player** and checks the whole
  search → play → pause → seek → volume → track-end flow plus that the key never reaches the browser
  (needs `npm run build` first; see the header of that file).

### Troubleshooting

- *"YOUTUBE_API_KEY isn't set"*: the key is missing or still the placeholder; restart the dev server.
- *"The YouTube API key was rejected…"*: enable **YouTube Data API v3** for the key's project, and make
  sure its API restriction includes it. If a proxy strips the `x-goog-api-key` header, set
  `YOUTUBE_KEY_TRANSPORT=query` as a last resort.
- *"quota has been reached"*: wait for midnight Pacific time, or request more quota.

## Visual fidelity: what was measured, and what wasn't

The only visual reference is one 640×360 screenshot of the logged-out home page. Its pixels were
measured and the following were matched **exactly** (and are asserted in `e2e/e2e.mjs`):

- Surface colors: page `#000000`, sidebar panel `#121212`, prompt cards and home/search circles `#1f1f1f`,
  privacy banner `#eeeeee`, muted text `#b3b3b3`.
- Main panel top gradient: `#222222` fading to `#121212` over ~200 px (`.main-panel` in `globals.css`).
- Geometry: white 32 px logo at (28,16); 8 px outer gutters; sidebar 280 px (290 px at 1280 px, via
  `clamp(280px, 22.66vw, 420px)`); 36 px "+" button at (236,80); first prompt card at (16,155), 264 px wide;
  content padding 28 px; heading box at (336,92); card artwork at (336,136) with 12 px card padding and no gap.
- Typography: shelf headings ≈ 20 px (cap height 14 px), sidebar heading 16 px bold, sidebar prompt
  subtitles semi-bold, banner text 14/21 px regular with 16 px side padding.
- The privacy banner is full-bleed to the left, right and bottom edges.

**Not verifiable from the evidence** (so not tuned): any state other than the logged-out home page at
640×360 — there is no reference screenshot of the search page or of the 1280×720 home page, only the
accessibility tree; text below the first card row (hidden by the banner); the bottom player; hover states;
and the exact card pitch beyond the 178 px minimum. Text *width* can't be compared in the build
container, whose fallback font is ~22% wider than the real one; on your machine the stack starts with
Segoe UI. The original site's proprietary typeface is not used.

## Honest limitations

- **Demo tracks are silent.** Items from the built-in demo catalog advance a timer and produce no
  audio. Real songs from YouTube search play through the YouTube player; volume and mute apply to it.
  Real search finds songs only: the Playlists, Podcasts & Shows and Profiles filters stay empty,
  and there is no "load more" yet.
- **Account features are not implemented**: Sign up, Log in, Create playlist, Liked Songs, More
  options, Browse, Install App, Premium/Support/Download menus, language, footer links. They show a
  "isn't implemented in this demo" notice instead of pretending to work.
- **Detail pages don't exist** (artist, album, playlist, show, episode, profile). Their links show
  the same notice. `/section/<id>` ("Show all") exists but its layout is our own guess.
- **Branding is placeholder.** The logo is an original mark (`components/ui/BrandMark.tsx`);
  artwork is generated (`components/ui/Cover.tsx`). Swap `lib/brand.ts` to rename.
- **The privacy banner's wording is ours** and describes this demo (no cookies, no trackers).
- **Not measured, so chosen by us:** search debounce (250 ms), using `history.replace` while already
  on a search route, keeping the active filter while typing, returning Home when the field is
  emptied, Enter skipping the debounce, result ranking, and the layouts of the per-filter pages.
- **Intentional differences from the capture:** the sidebar heading is an `h2` (the reference had a
  second `h1`); below 768 px the sidebar becomes a drawer and search collapses to an icon (the
  reference just overflowed at 640 px).
- Without a YouTube API key (or if YouTube fails) search falls back to fictional demo results, so
  queries match invented names (try "hello", "harbor", "lantern"), and a banner says so.
- No Content-Security-Policy is set yet; a correct one for Next.js needs nonces plus YouTube's hosts.
- Verified in headless Chromium only; Firefox and Safari were not tested.

## Notes on the Next.js setup

`create-next-app` generated Next 16 with `cacheComponents`/`partialPrefetching` enabled. They are
turned off in `next.config.ts` because this app only serves local mock data. `src/proxy.ts` turns
undecodable URLs (e.g. `/search/%E0%A4%A`), which Next would otherwise answer with a 500, into 404s.
`@types/node` is `^22` because Vitest 5 requires it.
