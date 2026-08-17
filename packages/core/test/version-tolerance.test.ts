/**
 * The 0.4 tolerance requirement, proved (SPEC.md §3): a synthetic
 * 0.5 document containing an unknown enum value AND an unknown field parses
 * under this 0.4 package in consumer usage, while producer-side validation
 * still rejects typos.
 */
import {
  ConsumptionPlanSchema,
  ConsumptionReceiptSchema,
  ConsumptionStateSchema,
  ContentRefSchema,
  ReceiptOutcomeSchema,
  ResolutionResultSchema,
  ResolvedContentSchema,
  StructuredFeedbackSchema,
  UnavailableReasonSchema,
  isKnown,
  isPodcastEpisodeRef,
} from "@cueback/core";
import { describe, expect, it } from "vitest";

/** A plausible plan produced by a 0.5 server: new version, new enum values, new fields. */
const plan05 = {
  cueback_version: "0.5",
  plan_id: "pl_0198a9c1-2d3e-7f40-9a5b-6c7d8e9f0a1b",
  title: "Mixed-media week",
  brief: {
    goal: "Understand the economics of AI coding agents",
    // Unknown enum value a 0.5 minor added.
    knowledge_level: "expert",
    retention: "playlist_lifetime",
    // Unknown field a 0.5 minor added.
    curation_style: "editorial",
  },
  recommendations: [
    {
      recommendation_id: "rec_0198a9c1-4f5a-7b6c-8d7e-9f0a1b2c3d4e",
      content: {
        content_type: "podcast_episode",
        episode_id: "ep_0198a7e2-9b3c-7d4e-a5f6-0718293a4b5c",
        show_id: "show_0198a7e0-4c1d-7a2b-8f3e-2b9d4c5e6f70",
        title: "The Economics of AI Inference",
        show_title: "Practical AI Infrastructure",
        duration_seconds: 3540,
        published_at: "2026-07-14T09:00:00Z",
        has_publisher_transcript: true,
        already_listened: false,
      },
      position: 0,
      why: "Cost curves from a practitioner.",
      // Unknown enum value (0.5 added a new disclosure basis).
      match_basis: "generated_transcript",
      contrasting_perspective: false,
      locked: false,
      added_by: "assistant",
      // Unknown enum value (0.5 added a new state).
      consumption_state: "revisited",
    },
    {
      recommendation_id: "rec_0198a9c1-5a6b-7c8d-9e0f-1a2b3c4d5e6f",
      // A whole content profile this release does not know.
      content: {
        content_type: "long_read",
        url: "https://example.com/essays/agent-margins",
        title: "The Coming Agent Margin Collapse",
        word_count: 5400,
      },
      position: 1,
      why: "The skeptical perspective, in a medium 0.5 supports.",
      match_basis: "metadata",
      contrasting_perspective: true,
      locked: false,
      added_by: "assistant",
    },
  ],
  created_by: "copilot",
  created_at: "2026-07-29T18:12:03Z",
  total_duration_seconds: 3540,
  // Unknown top-level field a 0.5 minor added.
  refresh_policy: { cadence: "weekly" },
};

/** A 0.5 receipt: unknown outcome, unknown structured field, unknown top-level field. */
const receipt05 = {
  cueback_version: "0.5",
  receipt_id: "rcpt_0198b3d4-6e7f-7a8b-9c0d-1e2f3a4b5c6d",
  content_type: "long_read",
  // A content id from a profile this release does not know — opaque beyond prefix.
  content_id: "art_0198a7e2-9b3c-7d4e-a5f6-0718293a4b5c",
  content_title: "The Coming Agent Margin Collapse",
  source_title: "Example Essays",
  recommendation_id: "rec_0198a9c1-5a6b-7c8d-9e0f-1a2b3c4d5e6f",
  plan_id: "pl_0198a9c1-2d3e-7f40-9a5b-6c7d8e9f0a1b",
  why: "The skeptical perspective.",
  contrasting_perspective: true,
  content_length: { unit: "words", value: 5400 },
  consumption: {
    // Unknown enum value (0.5 added an outcome).
    outcome: "revisited",
    progress_percent: 40,
    time_spent_minutes: 12,
  },
  structured_feedback: {
    // Unknown enum value on a known field.
    value: "mixed_feelings",
    // Unknown field a 0.5 minor added (must not fail, must not be required).
    sentiment_note: "conflicted",
  },
  user_feedback: [
    {
      text: "the margins argument falls apart in section 3",
      occurred_at: "2026-07-29T21:38:12Z",
      location: { unit: "words", value: 3200 },
    },
  ],
  created_at: "2026-07-29T21:40:00Z",
  // Unknown top-level field.
  reading_streak_days: 4,
};

describe("0.5-synthetic documents parse under the 0.4 package (consumer usage)", () => {
  it("a 0.5 ConsumptionPlan with unknown enum values, fields, and content type parses", () => {
    const parsed = ConsumptionPlanSchema.safeParse(plan05);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    // Unknown enum values are preserved verbatim, never collapsed.
    expect(parsed.data.recommendations[0]?.consumption_state).toBe("revisited");
    expect(parsed.data.recommendations[0]?.match_basis).toBe("generated_transcript");
    expect(parsed.data.brief.knowledge_level).toBe("expert");
    // The unrecognized content variant carries its discriminator through.
    expect(parsed.data.recommendations[1]?.content.content_type).toBe("long_read");
    // An assistant slug outside the known four is legal (0.3 open set, unchanged in 0.4).
    expect(parsed.data.created_by).toBe("copilot");
  });

  it("a 0.5 ConsumptionReceipt with unknown enum values and fields parses", () => {
    const parsed = ConsumptionReceiptSchema.safeParse(receipt05);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.consumption.outcome).toBe("revisited");
    expect(parsed.data.structured_feedback?.value).toBe("mixed_feelings");
    expect(parsed.data.content_id).toBe("art_0198a7e2-9b3c-7d4e-a5f6-0718293a4b5c");
    expect(parsed.data.user_feedback?.[0]?.location).toEqual({ unit: "words", value: 3200 });
  });

  it("a 0.5 ResolutionResult with an unknown reason parses, preserved verbatim", () => {
    const parsed = ResolutionResultSchema.safeParse({
      status: "unavailable",
      reason: "drm_locked",
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.reason).toBe("drm_locked");
    // isKnown is the documented narrowing helper: unknown → handle generically.
    expect(isKnown(UnavailableReasonSchema, parsed.data.reason as string)).toBe(false);
    expect(isKnown(UnavailableReasonSchema, "resolution_failed")).toBe(true);
  });

  it("an unknown content_type parses as unrecognized content on both unions", () => {
    const ref = ContentRefSchema.safeParse({
      content_type: "long_read",
      url: "https://example.com/essays/agent-margins",
    });
    expect(ref.success).toBe(true);
    if (ref.success) expect(isPodcastEpisodeRef(ref.data)).toBe(false);

    const resolved = ResolvedContentSchema.safeParse({
      content_type: "long_read",
      url: "https://example.com/essays/agent-margins",
      title: "The Coming Agent Margin Collapse",
    });
    expect(resolved.success).toBe(true);
  });
});

describe("producer-side validation still rejects typos (SPEC.md §3)", () => {
  it("StructuredFeedbackSchema (the write schema) rejects unknown enum values", () => {
    expect(StructuredFeedbackSchema.safeParse({ value: "worth_my_tmie" }).success).toBe(false);
    expect(StructuredFeedbackSchema.safeParse({ difficulty: "impossible" }).success).toBe(false);
    expect(StructuredFeedbackSchema.safeParse({ flags: ["too_political"] }).success).toBe(false);
    // The removed 0.2 field is gone: a direction-only write is an empty write.
    expect(StructuredFeedbackSchema.safeParse({ direction: "more_like_this" }).success).toBe(false);
    // And the strict enums themselves stay closed.
    expect(ReceiptOutcomeSchema.safeParse("revisited").success).toBe(false);
    expect(ConsumptionStateSchema.safeParse("revisited").success).toBe(false);
  });

  it("a malformed KNOWN ref never slides into the unrecognized fallback", () => {
    // podcast_episode with no identifier: still rejected, exactly as in 0.2.
    expect(
      ContentRefSchema.safeParse({ content_type: "podcast_episode", title: "hints only" }).success,
    ).toBe(false);
    // article without its required url: still rejected.
    expect(ContentRefSchema.safeParse({ content_type: "article" }).success).toBe(false);
  });
});
