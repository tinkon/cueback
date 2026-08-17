import { describe, expect, it } from "vitest";
import {
  CUEBACK_VERSION,
  type ConsumptionPlan,
  ConsumptionPlanSchema,
  ConsumptionStateSchema,
  ID_PREFIXES,
  NewRecommendationSchema,
  PlanUpdateOpSchema,
  newId,
} from "../src/index.js";

function makeEpisode(title: string) {
  return {
    content_type: "podcast_episode",
    episode_id: newId(ID_PREFIXES.episode),
    show_id: newId(ID_PREFIXES.show),
    title,
    show_title: "AI Infrastructure Weekly",
    description: "Operators discuss the unit economics of coding agents.",
    duration_seconds: 3120,
    published_at: "2026-07-21T06:00:00Z",
    has_publisher_transcript: true,
    already_listened: false,
  };
}

const planWire = {
  cueback_version: CUEBACK_VERSION,
  plan_id: newId(ID_PREFIXES.plan),
  title: "AI coding agents: economics deep dive",
  brief: {
    goal: "Understand the economics of AI coding agents",
    available_minutes: 120,
    knowledge_level: "intermediate",
    preferences: ["prefer practitioners"],
    retention: "playlist_lifetime",
  },
  recommendations: [
    {
      recommendation_id: newId(ID_PREFIXES.recommendation),
      content: makeEpisode("The Economics of AI Inference"),
      position: 0,
      why: "Operator perspective on inference cost curves",
      goal_supported: "Understand the economics of AI coding agents",
      match_basis: "publisher_transcript",
      contrasting_perspective: false,
      locked: false,
      added_by: "assistant",
      consumption_state: "not_started",
    },
    {
      recommendation_id: newId(ID_PREFIXES.recommendation),
      content: makeEpisode("Why Coding Agents Won't Pay for Themselves"),
      position: 1,
      why: "The requested skeptical perspective",
      match_basis: "metadata",
      contrasting_perspective: true,
      locked: true,
      added_by: "user",
    },
  ],
  created_by: "claude",
  created_at: "2026-07-30T12:00:00Z",
  player_link: "https://player.example/l/abc123",
};

describe("ConsumptionPlan", () => {
  it("round-trips through JSON without loss", () => {
    const parsed: ConsumptionPlan = ConsumptionPlanSchema.parse(planWire);
    const reparsed = ConsumptionPlanSchema.parse(JSON.parse(JSON.stringify(parsed)));
    expect(reparsed).toEqual(parsed);
    expect(reparsed.recommendations).toHaveLength(2);
    expect(reparsed.recommendations[1]?.locked).toBe(true);
  });

  it("carries the user's own name when they set one, and is fine without it", () => {
    // `user_title` is additive and optional (SPEC.md §11): a plan nobody renamed
    // simply omits it, and a producer that never learned about the field keeps
    // parsing. When present it is the user's string — the schema does not
    // constrain it beyond the protocol ceiling, because the implementation's
    // own user-facing rename path already did.
    expect(ConsumptionPlanSchema.parse(planWire).user_title).toBeUndefined();
    const renamed = ConsumptionPlanSchema.parse({ ...planWire, user_title: "L6 kickoff" });
    expect(renamed.user_title).toBe("L6 kickoff");
    // Renaming adds a string; it never rewrites the assistant's two.
    expect(renamed.title).toBe(planWire.title);
    expect(renamed.brief.goal).toBe(planWire.brief.goal);
  });

  it("accepts any 0.x version and rejects a major bump (SPEC.md §3, 0.x tolerance)", () => {
    // Consumers must tolerate future minors: 0.5 parses under the 0.4 package.
    expect(ConsumptionPlanSchema.safeParse({ ...planWire, cueback_version: "0.5" }).success).toBe(
      true,
    );
    // …and stored 0.3 documents stay legal (mixed versions in one page, §4).
    expect(ConsumptionPlanSchema.safeParse({ ...planWire, cueback_version: "0.3" }).success).toBe(
      true,
    );
    expect(
      ConsumptionPlanSchema.safeParse({ ...planWire, cueback_version: "0.12.1" }).success,
    ).toBe(true);
    // A major bump is the one thing a 0.x consumer may reject outright.
    expect(ConsumptionPlanSchema.safeParse({ ...planWire, cueback_version: "1.0" }).success).toBe(
      false,
    );
    expect(
      ConsumptionPlanSchema.safeParse({ ...planWire, cueback_version: "banana" }).success,
    ).toBe(false);
  });
});

describe("ConsumptionState", () => {
  it("accepts the known values", () => {
    for (const state of ["not_started", "in_progress", "completed", "removed"]) {
      expect(ConsumptionStateSchema.safeParse(state).success).toBe(true);
    }
  });

  it("keeps the strict enum closed while plan reads tolerate unknown values (0.3)", () => {
    // The strict enum (what 0.3 producers may write) still rejects strays…
    expect(ConsumptionStateSchema.safeParse("unplayed").success).toBe(false);
    // …but a plan DOCUMENT carrying a value a newer minor added still parses:
    // consumers must not hard-fail on unknown enum values (SPEC.md §3).
    const [first, ...rest] = planWire.recommendations;
    const parsed = ConsumptionPlanSchema.safeParse({
      ...planWire,
      recommendations: [{ ...first, consumption_state: "revisited" }, ...rest],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.recommendations[0]?.consumption_state).toBe("revisited");
    }
  });
});

describe("NewRecommendation", () => {
  it("accepts content_id form and ref form", () => {
    expect(
      NewRecommendationSchema.safeParse({
        content_id: newId(ID_PREFIXES.episode),
        why: "Directly on-goal",
      }).success,
    ).toBe(true);
    expect(
      NewRecommendationSchema.safeParse({
        ref: {
          content_type: "podcast_episode",
          episode_url: "https://example.com/pod/ep-42",
          title: "Ep 42",
        },
        why: "Found via web search",
        contrasting_perspective: true,
      }).success,
    ).toBe(true);
  });

  it("accepts an article ref (schema-only; the server rejects it at resolve time)", () => {
    expect(
      NewRecommendationSchema.safeParse({
        ref: { content_type: "article", url: "https://example.com/posts/inference-economics" },
        why: "Background reading",
      }).success,
    ).toBe(true);
  });

  it("rejects a recommendation with neither content_id nor ref", () => {
    expect(NewRecommendationSchema.safeParse({ why: "no target" }).success).toBe(false);
  });
});

describe("PlanUpdateOp", () => {
  it("parses each op variant via the discriminated union", () => {
    const recommendationId = newId(ID_PREFIXES.recommendation);
    const ops = [
      {
        op: "add",
        recommendation: { content_id: newId(ID_PREFIXES.episode), why: "fills the gap" },
      },
      { op: "remove", recommendation_id: recommendationId },
      { op: "reorder", recommendation_id: recommendationId, position: 2 },
      {
        op: "replace",
        recommendation_id: recommendationId,
        recommendation: {
          ref: {
            content_type: "podcast_episode",
            feed_url: "https://example.com/feed.xml",
            guid: "g-1",
          },
          why: "swap",
        },
      },
      { op: "lock", recommendation_id: recommendationId },
      { op: "unlock", recommendation_id: recommendationId },
    ];
    for (const op of ops) {
      expect(PlanUpdateOpSchema.safeParse(op).success).toBe(true);
    }
  });

  it("rejects an unknown op and a reorder without a position", () => {
    const recommendationId = newId(ID_PREFIXES.recommendation);
    expect(
      PlanUpdateOpSchema.safeParse({ op: "shuffle", recommendation_id: recommendationId }).success,
    ).toBe(false);
    expect(
      PlanUpdateOpSchema.safeParse({ op: "reorder", recommendation_id: recommendationId }).success,
    ).toBe(false);
  });
});
