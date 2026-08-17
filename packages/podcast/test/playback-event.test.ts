import { ID_PREFIXES, newId } from "@cueback/core";
import { describe, expect, it } from "vitest";
import {
  EpisodeSearchResultSchema,
  PlaybackEventSchema,
  PlaybackEventTypeSchema,
} from "../src/index.js";

describe("PlaybackEvent", () => {
  it("parses a valid event", () => {
    expect(
      PlaybackEventSchema.safeParse({
        type: "skipped_forward",
        episode_id: newId(ID_PREFIXES.episode),
        position_seconds: 610,
        detail: { to_position_seconds: 745 },
        occurred_at: "2026-07-30T08:15:00Z",
      }).success,
    ).toBe(true);
  });

  it("attributes a play to the recommendation it came from", () => {
    const event = PlaybackEventSchema.parse({
      type: "started",
      episode_id: newId(ID_PREFIXES.episode),
      recommendation_id: newId(ID_PREFIXES.recommendation),
      occurred_at: "2026-07-30T08:00:00Z",
    });
    expect(event.recommendation_id?.startsWith(ID_PREFIXES.recommendation)).toBe(true);
  });

  it("tolerates an unknown event type but keeps the closed enum strict (0.3)", () => {
    // The server is the CONSUMER of events (SPEC.md §3: unknown types are
    // ignorable), so the document parses and the value survives verbatim…
    const parsed = PlaybackEventSchema.safeParse({
      type: "fast_forwarded",
      episode_id: newId(ID_PREFIXES.episode),
      occurred_at: "2026-07-30T08:15:00Z",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.type).toBe("fast_forwarded");
    // …while the enum itself (what a 0.3 producer may emit) stays closed.
    expect(PlaybackEventTypeSchema.safeParse("fast_forwarded").success).toBe(false);
  });

  it("carries the 0.3 idempotency key and rejects a non-UUID one", () => {
    const eventId = "0198a7e2-9b3c-7d4e-a5f6-0718293a4b5c";
    const parsed = PlaybackEventSchema.parse({
      type: "started",
      event_id: eventId,
      episode_id: newId(ID_PREFIXES.episode),
      occurred_at: "2026-07-30T08:00:00Z",
    });
    expect(parsed.event_id).toBe(eventId);
    expect(
      PlaybackEventSchema.safeParse({
        type: "started",
        event_id: "not-a-uuid",
        episode_id: newId(ID_PREFIXES.episode),
        occurred_at: "2026-07-30T08:00:00Z",
      }).success,
    ).toBe(false);
  });
});

describe("EpisodeSearchResult", () => {
  it("parses a search row and discloses its match basis", () => {
    const row = EpisodeSearchResultSchema.parse({
      episode_id: newId(ID_PREFIXES.episode),
      title: "The Economics of AI Inference",
      show_title: "AI Infrastructure Weekly",
      duration_seconds: 3120,
      published_at: "2026-07-21T06:00:00Z",
      description_snippet: "Operators discuss the unit economics of coding agents.",
      has_publisher_transcript: true,
      match_basis: "publisher_transcript",
    });
    expect(row.match_basis).toBe("publisher_transcript");
  });

  it("tolerates an unknown match basis on reads (values may grow per medium)", () => {
    const parsed = EpisodeSearchResultSchema.safeParse({
      episode_id: newId(ID_PREFIXES.episode),
      title: "The Economics of AI Inference",
      show_title: "AI Infrastructure Weekly",
      duration_seconds: 3120,
      published_at: "2026-07-21T06:00:00Z",
      description_snippet: "…",
      has_publisher_transcript: false,
      match_basis: "generated_transcript",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.match_basis).toBe("generated_transcript");
  });
});
