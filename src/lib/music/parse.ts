/**
 * Pure helpers that turn raw YouTube video metadata into song-like fields.
 *
 * YouTube has no structured artist/album fields, so everything here is a
 * best-effort heuristic. The rule throughout: prefer leaving a field empty
 * over guessing wrong.
 */

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

/** search.list/videos.list return HTML-escaped titles (&amp;, &#39; ...). */
export function decodeHtmlEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === "#") {
      const code =
        entity[1].toLowerCase() === "x"
          ? parseInt(entity.slice(2), 16)
          : parseInt(entity.slice(1), 10);
      return Number.isInteger(code) && code > 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : match;
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
  });
}

/** ISO 8601 duration ("PT4M13S") to seconds. Unparseable input gives 0. */
export function parseIsoDuration(iso: string | undefined | null): number {
  const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(iso ?? "");
  if (!m) return 0;
  const [, d, h, min, s] = m;
  return Number(d ?? 0) * 86400 + Number(h ?? 0) * 3600 + Number(min ?? 0) * 60 + Number(s ?? 0);
}

export const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

export function isValidVideoId(id: unknown): id is string {
  return typeof id === "string" && VIDEO_ID_PATTERN.test(id);
}

const SCRIPT_LANGUAGES: Array<[RegExp, string]> = [
  [/[\u0C00-\u0C7F]/, "te"], // Telugu
  [/[\u0900-\u097F]/, "hi"], // Devanagari (Hindi)
  [/[\u0B80-\u0BFF]/, "ta"], // Tamil
  [/[\u0D00-\u0D7F]/, "ml"], // Malayalam
];

/** Hint for YouTube's relevanceLanguage when the query is typed in an Indic script. */
export function detectRelevanceLanguage(query: string): string | undefined {
  return SCRIPT_LANGUAGES.find(([pattern]) => pattern.test(query))?.[1];
}

// ---------------------------------------------------------------------------
// Title / description parsing
// ---------------------------------------------------------------------------

export interface ParsedMeta {
  title: string;
  artists: string[];
  album: string | null;
}

const NOISE_WORDS =
  /\b(?:official|video|videos|audio|lyric|lyrics|lyrical|full|song|songs|4k|8k|hd|hq|remastered|remaster|music|mv|visualizer|promo|jukebox|with|subtitles?|english|telugu|hindi|tamil|malayalam|tollywood|bollywood|kollywood|mollywood)\b/gi;
const PUNCT_AND_DIGITS = /[\s\d.,;:!?'"“”‘’()[\]{}\-–—_/\\|&+*#@~^%$=<>`]/g;

/** True when the text is only tags like "(Official Video)" or "Telugu 2024". */
function isNoiseText(text: string): boolean {
  return text.replace(NOISE_WORDS, " ").replace(PUNCT_AND_DIGITS, "").length === 0;
}

const FROM_BRACKET =
  /\s*[([]\s*from\s+(?:the\s+)?(?:(?:movie|film|album)\s+)?["“”'‘’]?([^"“”'‘’()[\]]+?)["“”'‘’]?\s*[)\]]/i;

const TRAILING_TAGS: RegExp[] = [
  /\s*[-–—:]*\s*\b(?:full\s+)?(?:official\s+)?(?:video|audio|lyrical|lyric|lyrics)(?:\s+video)?\s+songs?\b.*$/i,
  /\s*[-–—:]*\s*\bofficial\s+(?:music\s+)?(?:video|audio|lyric\s+video|visualizer)\b.*$/i,
  /\s*[-–—:]*\s*\b(?:lyric|lyrical|lyrics)\s+video\b.*$/i,
  /\s*[-–—:]*\s*\bfull\s+(?:audio\s+)?songs?\b.*$/i,
];

/** Hints that a title follows the "Song - Movie | credits" convention of film-song uploads. */
const FILM_HINT = /(video song|audio song|full song|lyrical|\bfrom\s+["“]|\bmovie\b|\bfilm\b)/i;

function cleanTitle(raw: string): { title: string; album: string | null } {
  let s = raw.trim();
  let album: string | null = null;

  const from = FROM_BRACKET.exec(s);
  if (from) {
    album = from[1].trim() || null;
    s = s.replace(FROM_BRACKET, "");
  }
  s = s.replace(/\s*[([][^()[\]]*[)\]]/g, (group) => (isNoiseText(group) ? "" : group));
  for (const tag of TRAILING_TAGS) s = s.replace(tag, "");
  s = s.replace(/\s+/g, " ").replace(/[\s\-–—|:,]+$/, "").trim();
  return { title: s, album };
}

function normalizeName(text: string): string {
  return text.normalize("NFC").toLowerCase().replace(PUNCT_AND_DIGITS, "");
}

function namesMatch(a: string, b: string): boolean {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  return na.length >= 3 && nb.length >= 3 && (na.includes(nb) || nb.includes(na));
}

function splitNames(text: string): string[] {
  const seen = new Set<string>();
  return text
    .split(/\s*(?:,|&|\/|;|\band\b|\bx\b|\bfeat\.?\b|\bft\.?\b)\s*/i)
    .map((n) => n.trim())
    .filter((n) => n.length > 0 && n.length <= 60 && !isNoiseText(n))
    .filter((n) => (seen.has(n.toLowerCase()) ? false : (seen.add(n.toLowerCase()), true)));
}

function splitOnDash(title: string): [string, string] | null {
  const parts = title.split(/\s+[-–—]\s+/);
  if (parts.length !== 2) return null;
  const [left, right] = [parts[0].trim(), parts[1].trim()];
  return left && right ? [left, right] : null;
}

/**
 * Auto-generated "Topic" uploads carry exact metadata in their description:
 *   Provided to YouTube by <label>
 *   <Title> · <Artist> · <Artist>
 *   <Album>
 *   ℗ <year> <label>
 */
function parseTopicDescription(description: string): ParsedMeta | null {
  const lines = description.split(/\r?\n/).map((l) => l.trim());
  const start = lines.findIndex((l) => /^Provided to YouTube by/i.test(l));
  if (start < 0) return null;
  const rest = lines.slice(start + 1).filter(Boolean);
  const head = rest[0];
  if (!head || !head.includes(" · ")) return null;

  const [rawTitle, ...artists] = head.split(" · ").map((p) => p.trim()).filter(Boolean);
  if (!rawTitle) return null;
  const albumLine = rest[1] && !rest[1].startsWith("℗") ? rest[1] : null;
  const cleaned = cleanTitle(rawTitle);
  // A single's album is usually just its own title; that adds nothing.
  const album =
    albumLine && normalizeName(albumLine) !== normalizeName(rawTitle) ? albumLine : cleaned.album;
  return { title: cleaned.title || rawTitle, artists, album };
}

/** "Name - Topic" channels are an artist's auto-generated channel. */
function topicChannelArtist(channelTitle: string): string | null {
  const m = /^(.+?)\s+-\s+Topic$/i.exec(channelTitle.trim());
  return m ? m[1].trim() : null;
}

export function parseTrackMetadata(input: {
  title: string;
  channelTitle: string;
  description?: string;
}): ParsedMeta {
  const topic = parseTopicDescription(input.description ?? "");
  if (topic) return topic;

  const decoded = decodeHtmlEntities(input.title).replace(/\s+/g, " ").trim();
  const segments = decoded.split("|").map((s) => s.trim()).filter(Boolean);
  const extras = segments.slice(1).filter((s) => !isNoiseText(s));

  const cleaned = cleanTitle(segments[0] ?? decoded);
  let title = cleaned.title;
  let album = cleaned.album;
  let artists: string[] = [];

  const channelName = input.channelTitle.replace(/\s+-\s+Topic$/i, "").replace(/VEVO$/i, "");
  const dash = splitOnDash(title);
  if (dash) {
    const [left, right] = dash;
    if (namesMatch(left, channelName)) {
      artists = [left];
      title = right;
    } else if (namesMatch(right, channelName)) {
      artists = [right];
      title = left;
    } else if (extras.length > 0 || FILM_HINT.test(decoded)) {
      // "Song - Movie" film-upload convention.
      title = left;
      album = album ?? right;
    }
    // Otherwise the direction is ambiguous: keep the whole title untouched.
  }

  if (extras.length >= 2) {
    // "Song | Movie | Credit | Credit ..." convention.
    album = album ?? extras[0];
    if (artists.length === 0) artists = splitNames(extras.slice(1).join(", ")).slice(0, 4);
  } else if (extras.length === 1) {
    if (FILM_HINT.test(decoded) && !album) album = extras[0];
    else if (artists.length === 0) artists = splitNames(extras[0]).slice(0, 4);
  }

  if (artists.length === 0) {
    const topicArtist = topicChannelArtist(input.channelTitle);
    if (topicArtist) artists = [topicArtist];
  }
  return { title: title || decoded, artists, album };
}

/** Filters out jukeboxes, reactions, trailers etc. so results look like songs. */
export function isLikelySong(title: string, durationSec: number): boolean {
  if (durationSec < 45 || durationSec > 15 * 60) return false;
  return !/\b(?:jukebox|reaction|reacts?|review|interview|trailer|teaser|making|behind the scenes|scene|dialogue|shorts?|status|ringtone|karaoke|tutorial|how to|podcast|full movie)\b/i.test(
    title,
  );
}

const THUMBNAIL_HOST = /^https:\/\/i9?\.ytimg\.com\//;

/** Prefers the 320x180 "medium" thumbnail (no letterbox bars); only trusts YouTube's image hosts. */
export function pickThumbnail(
  thumbnails: Record<string, { url?: string } | undefined> | undefined,
): string | null {
  for (const size of ["medium", "high", "standard", "default", "maxres"]) {
    const url = thumbnails?.[size]?.url;
    if (url && THUMBNAIL_HOST.test(url)) return url;
  }
  return null;
}

