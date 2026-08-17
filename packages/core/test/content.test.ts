import { describe, expect, it } from "vitest";
import {
  ContentRefSchema,
  ID_PREFIXES,
  ResolutionResultSchema,
  ResolvedContentSchema,
  newId,
} from "../src/index.js";

describe("ContentRef", () => {
  it("parses a podcast_episode ref with any single identifier", () => {
    const identifiers = [
      { episode_id: newId(ID_PREFIXES.episode) },
      { guid: "guid-42" },
      { feed_url: "https://example.com/feed.xml" },
      { episode_url: "https://example.com/pod/ep-42" },
    ];
    for (const identifier of identifiers) {
      expect(
        ContentRefSchema.safeParse({ content_type: "podcast_episode", ...identifier }).success,
      ).toBe(true);
    }
  });

  it("rejects a podcast_episode ref carrying only hints", () => {
    const result = ContentRefSchema.safeParse({
      content_type: "podcast_episode",
      title: "Ep 42",
      show_title: "AI Infrastructure Weekly",
      published_at: "2026-07-21",
    });
    expect(result.success).toBe(false);
  });

  it("parses an article ref (schema-only profile)", () => {
    const ref = ContentRefSchema.parse({
      content_type: "article",
      url: "https://example.com/posts/inference-economics",
      title: "The economics of inference",
      author: "A. Writer",
      published_at: "2026-07-21",
    });
    expect(ref.content_type).toBe("article");
    if (ref.content_type === "article") {
      expect(ref.url).toBe("https://example.com/posts/inference-economics");
    }
  });

  it("rejects a malformed known ref but parses an unknown content_type (0.3 fallback)", () => {
    // A KNOWN variant that is malformed still fails — the fallback refuses
    // known content types, so it cannot launder a bad article ref.
    expect(ContentRefSchema.safeParse({ content_type: "article", title: "no url" }).success).toBe(
      false,
    );
    // An UNKNOWN content_type parses as unrecognized content (SPEC.md §3, §8):
    // a future profile must not break 0.3 validators. Fields pass through.
    const parsed = ContentRefSchema.safeParse({
      content_type: "video",
      url: "https://example.com/v/1",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.content_type).toBe("video");
      expect((parsed.data as Record<string, unknown>).url).toBe("https://example.com/v/1");
    }
  });
});

describe("ResolvedContent", () => {
  const resolvedEpisode = {
    content_type: "podcast_episode",
    episode_id: newId(ID_PREFIXES.episode),
    show_id: newId(ID_PREFIXES.show),
    title: "The Economics of AI Inference",
    show_title: "AI Infrastructure Weekly",
    description: "Operators discuss the unit economics of coding agents.",
    duration_seconds: 3120,
    published_at: "2026-07-21T06:00:00Z",
    has_publisher_transcript: true,
    already_listened: false,
  };

  it("parses the podcast_episode variant", () => {
    const content = ResolvedContentSchema.parse(resolvedEpisode);
    expect(content.content_type).toBe("podcast_episode");
    if (content.content_type === "podcast_episode") {
      expect(content.duration_seconds).toBe(3120);
    }
  });

  it("parses the article variant (schema-only profile)", () => {
    const content = ResolvedContentSchema.parse({
      content_type: "article",
      url: "https://example.com/posts/inference-economics",
      title: "The economics of inference",
      author: "A. Writer",
      published_at: "2026-07-21T06:00:00Z",
      word_count: 2400,
    });
    expect(content.content_type).toBe("article");
    if (content.content_type === "article") {
      expect(content.word_count).toBe(2400);
    }
  });

  it("rejects a podcast_episode whose episode_id lacks the catalog prefix", () => {
    expect(
      ResolvedContentSchema.safeParse({ ...resolvedEpisode, episode_id: "0190f7a2-6a3e" }).success,
    ).toBe(false);
  });
});

describe("ResolutionResult", () => {
  it("requires content when playable and reason when unavailable", () => {
    expect(ResolutionResultSchema.safeParse({ status: "playable" }).success).toBe(false);
    expect(ResolutionResultSchema.safeParse({ status: "unavailable" }).success).toBe(false);
    expect(
      ResolutionResultSchema.safeParse({
        status: "playable",
        content: {
          content_type: "podcast_episode",
          episode_id: newId(ID_PREFIXES.episode),
          show_id: newId(ID_PREFIXES.show),
          title: "The Economics of AI Inference",
          show_title: "AI Infrastructure Weekly",
          duration_seconds: 3120,
          published_at: "2026-07-21T06:00:00Z",
          has_publisher_transcript: false,
          already_listened: false,
        },
      }).success,
    ).toBe(true);
  });

  it("accepts the unsupported_content_type guard reason", () => {
    const result = ResolutionResultSchema.parse({
      status: "unavailable",
      reason: "unsupported_content_type",
    });
    expect(result.reason).toBe("unsupported_content_type");
  });
});
