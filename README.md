# Web Player Clone (unofficial study recreation)

A Next.js + TypeScript + Tailwind recreation of the **logged-out** interface and observable
behavior of a popular music web player, built from browser captures (screenshot, accessibility
tree, page URLs, network *metadata*). It uses **original mock data and generated placeholder
artwork** and does **not** call any private API. It is not affiliated with or endorsed by Spotify.

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
```

Checks:

```bash
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm test             # vitest: catalog integrity, search ranking, player state machine (22 tests)
npm run build && npm start
```

Browser end-to-end checks (35 assertions: behavior, plus measured layout numbers; real keystrokes, no Enter) live in `e2e/` with their
own dependencies. With the app running (`npm run build && npm start`):

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

- **Mock playback only.** "Playing" advances a timer; **no audio is produced**. Volume/mute change
  state only. Shuffle, repeat, previous/next and seeking work on the mock queue.
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
- Search results are fictional, so queries match invented names (try "hello", "harbor", "lantern").
- Verified in headless Chromium only; Firefox and Safari were not tested.

## Notes on the Next.js setup

`create-next-app` generated Next 16 with `cacheComponents`/`partialPrefetching` enabled. They are
turned off in `next.config.ts` because this app only serves local mock data. `src/proxy.ts` turns
undecodable URLs (e.g. `/search/%E0%A4%A`), which Next would otherwise answer with a 500, into 404s.
`@types/node` is `^22` because Vitest 5 requires it.
