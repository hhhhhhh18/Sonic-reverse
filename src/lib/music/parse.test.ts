import { describe, expect, it } from "vitest";
import {
  decodeHtmlEntities,
  detectRelevanceLanguage,
  isLikelySong,
  isValidVideoId,
  parseIsoDuration,
  parseTrackMetadata,
  pickThumbnail,
} from "./parse";

describe("decodeHtmlEntities", () => {
  it("decodes named, decimal and hex entities", () => {
    expect(decodeHtmlEntities("Rock &amp; Roll &#39;n&#39; &quot;x&quot; &#x2764;")).toBe(
      "Rock & Roll 'n' \"x\" \u2764",
    );
  });
  it("leaves unknown or invalid entities alone", () => {
    expect(decodeHtmlEntities("&bogus; &#99999999999;")).toBe("&bogus; &#99999999999;");
  });
});

describe("parseIsoDuration", () => {
  it("converts ISO 8601 durations", () => {
    expect(parseIsoDuration("PT4M13S")).toBe(253);
    expect(parseIsoDuration("PT1H2M3S")).toBe(3723);
    expect(parseIsoDuration("PT45S")).toBe(45);
    expect(parseIsoDuration("P1DT1S")).toBe(86401);
  });
  it("returns 0 for live/invalid input", () => {
    expect(parseIsoDuration("P0D")).toBe(0);
    expect(parseIsoDuration("garbage")).toBe(0);
    expect(parseIsoDuration(undefined)).toBe(0);
  });
});

describe("isValidVideoId / detectRelevanceLanguage", () => {
  it("accepts only 11-char ids from the YouTube alphabet", () => {
    expect(isValidVideoId("dQw4w9WgXcQ")).toBe(true);
    expect(isValidVideoId("short")).toBe(false);
    expect(isValidVideoId("dQw4w9WgXc!")).toBe(false);
    expect(isValidVideoId('"><script>')).toBe(false);
    expect(isValidVideoId(undefined)).toBe(false);
  });
  it("maps Indic scripts to a language hint", () => {
    expect(detectRelevanceLanguage("బుట్ట బొమ్మ")).toBe("te");
    expect(detectRelevanceLanguage("तुम ही हो")).toBe("hi");
    expect(detectRelevanceLanguage("வாத்தி கம்மிங்")).toBe("ta");
    expect(detectRelevanceLanguage("മഞ്ഞുമ്മൽ")).toBe("ml");
    expect(detectRelevanceLanguage("blinding lights")).toBeUndefined();
  });
});

describe("parseTrackMetadata", () => {
  it("reads exact metadata from auto-generated Topic descriptions", () => {
    const description =
      "Provided to YouTube by Sony Music\n\nTum Hi Ho · Arijit Singh\n\nAashiqui 2\n\n℗ 2013 T-Series\n\nReleased on: 2013-04-08";
    expect(parseTrackMetadata({ title: "Tum Hi Ho", channelTitle: "Arijit Singh - Topic", description })).toEqual({
      title: "Tum Hi Ho",
      artists: ["Arijit Singh"],
      album: "Aashiqui 2",
    });
  });

  it("ignores an album that just repeats the song title", () => {
    const description = "Provided to YouTube by Sony\n\nKesariya · Arijit Singh · Pritam\n\nKesariya\n\n℗ 2022";
    const meta = parseTrackMetadata({ title: "Kesariya", channelTitle: "Pritam - Topic", description });
    expect(meta.artists).toEqual(["Arijit Singh", "Pritam"]);
    expect(meta.album).toBeNull();
  });

  it("parses the film-upload 'Song | Movie | credits' convention", () => {
    const meta = parseTrackMetadata({
      title: "Butta Bomma Full Video Song | Ala Vaikunthapurramuloo | Allu Arjun | Thaman S",
      channelTitle: "Aditya Music",
    });
    expect(meta).toEqual({
      title: "Butta Bomma",
      artists: ["Allu Arjun", "Thaman S"],
      album: "Ala Vaikunthapurramuloo",
    });
  });

  it("takes the album from a (From \"Movie\") bracket", () => {
    const meta = parseTrackMetadata({ title: 'Kesariya (From "Brahmastra")', channelTitle: "Sony Music India" });
    expect(meta).toEqual({ title: "Kesariya", artists: [], album: "Brahmastra" });
  });

  it("splits 'Artist - Title' only when the channel confirms the artist", () => {
    const official = parseTrackMetadata({
      title: "The Weeknd - Blinding Lights (Official Video)",
      channelTitle: "TheWeekndVEVO",
    });
    expect(official).toEqual({ title: "Blinding Lights", artists: ["The Weeknd"], album: null });

    const ambiguous = parseTrackMetadata({ title: "Arijit Singh - Tum Hi Ho", channelTitle: "T-Series" });
    expect(ambiguous).toEqual({ title: "Arijit Singh - Tum Hi Ho", artists: [], album: null });
  });

  it("falls back to the artist from a Topic channel name", () => {
    expect(
      parseTrackMetadata({ title: "Hello Again", channelTitle: "Hello Meridian - Topic" }).artists,
    ).toEqual(["Hello Meridian"]);
  });

  it("decodes HTML entities and keeps non-Latin text intact", () => {
    expect(parseTrackMetadata({ title: "Rock &amp; Roll", channelTitle: "X" }).title).toBe("Rock & Roll");
    const telugu = parseTrackMetadata({
      title: "బుట్ట బొమ్మ | అల వైకుంఠపురములో | అల్లు అర్జున్",
      channelTitle: "Aditya Music",
    });
    expect(telugu.title).toBe("బుట్ట బొమ్మ");
    expect(telugu.album).toBe("అల వైకుంఠపురములో");
    expect(telugu.artists).toEqual(["అల్లు అర్జున్"]);
  });

  it("never returns an empty title", () => {
    expect(parseTrackMetadata({ title: "(Official Video)", channelTitle: "X" }).title).not.toBe("");
  });
});

describe("isLikelySong / pickThumbnail", () => {
  it("filters non-songs by duration and keywords", () => {
    expect(isLikelySong("Nice Song", 200)).toBe(true);
    expect(isLikelySong("Nice Song", 30)).toBe(false);
    expect(isLikelySong("Nice Song", 20 * 60)).toBe(false);
    expect(isLikelySong("Telugu Hits Jukebox", 300)).toBe(false);
    expect(isLikelySong("Movie Trailer", 150)).toBe(false);
  });

  it("prefers the medium thumbnail and rejects foreign hosts", () => {
    expect(
      pickThumbnail({
        medium: { url: "https://i.ytimg.com/vi/x/mqdefault.jpg" },
        high: { url: "https://i.ytimg.com/vi/x/hqdefault.jpg" },
      }),
    ).toBe("https://i.ytimg.com/vi/x/mqdefault.jpg");
    expect(pickThumbnail({ medium: { url: "https://evil.example/x.jpg" } })).toBeNull();
    expect(pickThumbnail({ medium: { url: "http://i.ytimg.com/x.jpg" } })).toBeNull();
    expect(pickThumbnail(undefined)).toBeNull();
  });
});
