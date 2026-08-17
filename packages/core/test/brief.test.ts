import { describe, expect, it } from "vitest";
import { BriefSchema } from "../src/index.js";

/** The Brief JSON example from the specification (SPEC.md §7). */
const briefExample = {
  goal: "Understand the economics of AI coding agents",
  available_minutes: 120,
  knowledge_level: "intermediate",
  preferences: [
    "prefer practitioners",
    "avoid beginner AI explanations",
    "include one skeptical perspective",
  ],
  retention: "playlist_lifetime",
};

describe("Brief", () => {
  it("parses the specification's example brief verbatim", () => {
    const brief = BriefSchema.parse(briefExample);
    expect(brief.goal).toBe("Understand the economics of AI coding agents");
    expect(brief.available_minutes).toBe(120);
    expect(brief.knowledge_level).toBe("intermediate");
    expect(brief.preferences).toHaveLength(3);
    expect(brief.retention).toBe("playlist_lifetime");
  });

  it("parses a minimal brief (goal + retention only)", () => {
    expect(
      BriefSchema.safeParse({ goal: "startup fundraising", retention: "session" }).success,
    ).toBe(true);
  });

  it("rejects an unknown retention value", () => {
    expect(BriefSchema.safeParse({ ...briefExample, retention: "forever" }).success).toBe(false);
  });

  it("rejects a brief without a goal", () => {
    expect(BriefSchema.safeParse({ retention: "playlist_lifetime" }).success).toBe(false);
  });

  it("carries the goal display contract in the schema itself, without enforcing it", () => {
    // SPEC.md §7 "Display": `goal` is the headline a client renders,
    // so the one-line guidance travels with the schema (and into every published
    // JSON Schema) rather than living only in prose. It is guidance, not a cap —
    // a `.max()` would reject briefs mid-flight (a wire-breaking change), so a
    // long goal must still parse.
    const description = BriefSchema.shape.goal.description ?? "";
    expect(description).toMatch(/headline/i);
    expect(description).toMatch(/one scannable line/i);
    expect(BriefSchema.safeParse({ ...briefExample, goal: "x".repeat(400) }).success).toBe(true);
  });
});
