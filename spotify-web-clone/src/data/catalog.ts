import type { Album, Artist, Episode, Playlist, Profile, Show, Track } from "./types";

/**
 * Original, fictional mock catalog. Nothing here comes from Spotify or any
 * real artist; all names and titles are invented for this demo.
 */

export const artists: Artist[] = [
  { id: "nova-lindqvist", name: "Nova Lindqvist" },
  { id: "paper-lanterns", name: "The Paper Lanterns" },
  { id: "kiro-adebayo", name: "Kiro Adebayo" },
  { id: "saffron-meridian", name: "Saffron Meridian" },
  { id: "dune-parade", name: "Dune Parade" },
  { id: "ines-calloway", name: "Ines Calloway" },
  { id: "bright-harbor", name: "Bright Harbor" },
  { id: "orla-whitfield", name: "Orla Whitfield" },
  { id: "velvet-static", name: "Velvet Static" },
  { id: "tomas-reyes", name: "Tomás Reyes-Ode" },
  { id: "lumen-choir", name: "Lumen Choir" },
  { id: "pax-ellery", name: "Pax Ellery" },
  { id: "hello-meridian", name: "Hello Meridian" },
];

export const albums: Album[] = [
  { id: "hello-harbor", title: "Hello, Harbor", artistIds: ["bright-harbor"], year: 2024 },
  { id: "paper-moons", title: "Paper Moons", artistIds: ["paper-lanterns"], year: 2022 },
  { id: "salt-and-static", title: "Salt & Static", artistIds: ["velvet-static"], year: 2023 },
  { id: "slow-weather", title: "Slow Weather", artistIds: ["nova-lindqvist"], year: 2025 },
  { id: "low-tide-letters", title: "Low Tide Letters", artistIds: ["ines-calloway"], year: 2021 },
  { id: "afterglow-atlas", title: "Afterglow Atlas", artistIds: ["saffron-meridian"], year: 2026 },
  { id: "night-bus-hymns", title: "Night Bus Hymns", artistIds: ["lumen-choir"], year: 2020 },
  { id: "dune-days", title: "Dune Days", artistIds: ["dune-parade"], year: 2019 },
  { id: "hello-weather", title: "Hello Weather", artistIds: ["hello-meridian"], year: 2024 },
  { id: "orchard-signals", title: "Orchard Signals", artistIds: ["orla-whitfield"], year: 2023 },
  { id: "field-recordings-vol-1", title: "Field Recordings, Vol. 1", artistIds: ["tomas-reyes"], year: 2022 },
  { id: "quiet-engines", title: "Quiet Engines", artistIds: ["pax-ellery"], year: 2025 },
  { id: "compass-rose", title: "Compass Rose", artistIds: ["kiro-adebayo"], year: 2024 },
];

export const tracks: Track[] = [
  { id: "hello-harbor-lights", title: "Hello, Harbor Lights", artistIds: ["bright-harbor"], albumId: "hello-harbor", durationSec: 214 },
  { id: "hello-again-tuesday", title: "Hello Again, Tuesday", artistIds: ["hello-meridian"], albumId: "hello-weather", durationSec: 187 },
  { id: "say-hello-to-static", title: "Say Hello to Static", artistIds: ["velvet-static"], albumId: "salt-and-static", durationSec: 203 },
  { id: "hello-from-the-attic", title: "Hello from the Attic", artistIds: ["orla-whitfield", "paper-lanterns"], albumId: "orchard-signals", durationSec: 251 },
  { id: "paper-moon-parade", title: "Paper Moon Parade", artistIds: ["paper-lanterns"], albumId: "paper-moons", durationSec: 198 },
  { id: "slow-weather", title: "Slow Weather", artistIds: ["nova-lindqvist"], albumId: "slow-weather", durationSec: 232 },
  { id: "low-tide-letter", title: "Low Tide Letter", artistIds: ["ines-calloway"], albumId: "low-tide-letters", durationSec: 176 },
  { id: "afterglow-atlas", title: "Afterglow Atlas", artistIds: ["saffron-meridian", "kiro-adebayo"], albumId: "afterglow-atlas", durationSec: 243 },
  { id: "night-bus-hymn", title: "Night Bus Hymn", artistIds: ["lumen-choir"], albumId: "night-bus-hymns", durationSec: 267 },
  { id: "dune-day-one", title: "Dune Day One", artistIds: ["dune-parade"], albumId: "dune-days", durationSec: 189 },
  { id: "orchard-signal", title: "Orchard Signal", artistIds: ["orla-whitfield"], albumId: "orchard-signals", durationSec: 221 },
  { id: "field-note-seven", title: "Field Note Seven", artistIds: ["tomas-reyes"], albumId: "field-recordings-vol-1", durationSec: 164 },
  { id: "quiet-engine", title: "Quiet Engine", artistIds: ["pax-ellery"], albumId: "quiet-engines", durationSec: 207 },
  { id: "compass-rose-at-dawn", title: "Compass Rose at Dawn", artistIds: ["kiro-adebayo", "nova-lindqvist"], albumId: "compass-rose", durationSec: 238 },
  { id: "salt-on-the-glass", title: "Salt on the Glass", artistIds: ["velvet-static"], albumId: "salt-and-static", durationSec: 195 },
  { id: "weather-window", title: "Weather Window", artistIds: ["hello-meridian", "nova-lindqvist"], albumId: "hello-weather", durationSec: 226 },
  { id: "harbor-after-rain", title: "Harbor After Rain", artistIds: ["bright-harbor"], albumId: "hello-harbor", durationSec: 211 },
  { id: "lantern-lullaby", title: "Lantern Lullaby", artistIds: ["paper-lanterns", "lumen-choir"], albumId: "paper-moons", durationSec: 182 },
  { id: "saffron-hours", title: "Saffron Hours", artistIds: ["saffron-meridian"], albumId: "afterglow-atlas", durationSec: 255 },
  { id: "midnight-timetable", title: "Midnight Timetable", artistIds: ["lumen-choir"], albumId: "night-bus-hymns", durationSec: 199 },
  { id: "sand-and-signal", title: "Sand and Signal", artistIds: ["dune-parade", "pax-ellery"], albumId: "dune-days", durationSec: 216 },
  { id: "hello-neighbor-wave", title: "Hello, Neighbor Wave", artistIds: ["ines-calloway"], albumId: "low-tide-letters", durationSec: 173 },
  { id: "tidal-radio", title: "Tidal Radio", artistIds: ["ines-calloway", "bright-harbor"], albumId: "low-tide-letters", durationSec: 208 },
  { id: "engine-hum-lullaby", title: "Engine Hum Lullaby", artistIds: ["pax-ellery"], albumId: "quiet-engines", durationSec: 192 },
];

export const playlists: Playlist[] = [
  { id: "hello-monday-mix", title: "Hello Monday Mix", owner: "Demo Curator", trackIds: ["hello-harbor-lights", "hello-again-tuesday", "say-hello-to-static", "hello-from-the-attic", "hello-neighbor-wave", "slow-weather"] },
  { id: "rainy-window-radio", title: "Rainy Window Radio", owner: "Demo Curator", trackIds: ["weather-window", "low-tide-letter", "harbor-after-rain", "tidal-radio", "slow-weather", "quiet-engine"] },
  { id: "late-bus-home", title: "Late Bus Home", owner: "Night Shift Club", trackIds: ["night-bus-hymn", "midnight-timetable", "engine-hum-lullaby", "sand-and-signal", "lantern-lullaby"] },
  { id: "focus-garden", title: "Focus Garden", owner: "Quiet Hours", trackIds: ["quiet-engine", "field-note-seven", "orchard-signal", "dune-day-one", "compass-rose-at-dawn"] },
  { id: "sunday-kitchen", title: "Sunday Kitchen", owner: "Sunday Collective", trackIds: ["paper-moon-parade", "saffron-hours", "salt-on-the-glass", "lantern-lullaby", "hello-harbor-lights"] },
  { id: "harbor-mornings", title: "Harbor Mornings", owner: "Demo Curator", trackIds: ["hello-harbor-lights", "harbor-after-rain", "tidal-radio", "low-tide-letter"] },
  { id: "hello-world-gently", title: "Hello World, Gently", owner: "Demo Curator", trackIds: ["hello-again-tuesday", "hello-neighbor-wave", "hello-from-the-attic", "say-hello-to-static"] },
  { id: "salt-static-essentials", title: "Salt & Static Essentials", owner: "Demo Curator", trackIds: ["say-hello-to-static", "salt-on-the-glass", "afterglow-atlas", "sand-and-signal"] },
];

export const shows: Show[] = [
  { id: "hello-mornings", title: "Hello Mornings", publisher: "Radio Lantern" },
  { id: "long-commute", title: "The Long Commute", publisher: "Commuter Collective" },
  { id: "small-machines", title: "Small Machines", publisher: "Workshop Audio" },
  { id: "weather-notes", title: "Weather Notes", publisher: "Field Desk" },
  { id: "say-hello-to-strangers", title: "Say Hello to Strangers", publisher: "Open Door Media" },
  { id: "slow-cooking-club", title: "Slow Cooking Club", publisher: "Pantry Radio" },
];

export const episodes: Episode[] = [
  { id: "hello-mornings-41", title: "Why mornings feel longer in autumn", showId: "hello-mornings", dateLabel: "Oct 19", durationSec: 17 * 60 + 20, isNew: true },
  { id: "hello-mornings-40", title: "A small guide to better coffee", showId: "hello-mornings", dateLabel: "Oct 12", durationSec: 21 * 60 },
  { id: "hello-mornings-39", title: "Hello again, Monday", showId: "hello-mornings", dateLabel: "Oct 5", durationSec: 15 * 60 + 10 },
  { id: "long-commute-88", title: "The 7:15 platform conversation", showId: "long-commute", dateLabel: "Oct 17", durationSec: 24 * 60 + 5, isNew: true },
  { id: "long-commute-87", title: "Trains, delays, and good company", showId: "long-commute", dateLabel: "Oct 10", durationSec: 19 * 60 },
  { id: "small-machines-12", title: "Fixing a radio from 1974", showId: "small-machines", dateLabel: "Oct 14", durationSec: 32 * 60 },
  { id: "weather-notes-203", title: "What a warm October means", showId: "weather-notes", dateLabel: "Oct 18", durationSec: 12 * 60 + 40, isNew: true },
  { id: "say-hello-9", title: "Say hello to your neighbors", showId: "say-hello-to-strangers", dateLabel: "Sep 29", durationSec: 28 * 60 },
  { id: "say-hello-8", title: "Hello, new city", showId: "say-hello-to-strangers", dateLabel: "Sep 22", durationSec: 26 * 60 + 30 },
  { id: "slow-cooking-31", title: "The patient pot", showId: "slow-cooking-club", dateLabel: "Oct 5", durationSec: 36 * 60 },
];

export const profiles: Profile[] = [
  { id: "hello-wanderer", name: "hello_wanderer" },
  { id: "hello-june", name: "hello.june" },
  { id: "morning-hello", name: "morning_hello" },
  { id: "the-hello-club", name: "the-hello-club" },
  { id: "quiet-harbor", name: "quiet.harbor" },
  { id: "lantern-fan", name: "paper.lantern.fan" },
];

/** Home-page sections, in display order. `ids` index into the matching list above. */
export const SECTIONS = {
  "trending-songs": { title: "Trending songs", kind: "track", ids: tracks.slice(0, 20).map((t) => t.id) },
  "popular-artists": { title: "Popular artists", kind: "artist", ids: artists.slice(0, 12).map((a) => a.id) },
  "popular-albums": { title: "Popular albums and singles", kind: "album", ids: albums.map((a) => a.id) },
} as const;

export type SectionId = keyof typeof SECTIONS;
export const SECTION_IDS = Object.keys(SECTIONS) as SectionId[];
