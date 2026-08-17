import { describe, expect, it } from "vitest";
import { AssistantHandoffSchema, CUEBACK_VERSION, ID_PREFIXES, newId } from "../src/index.js";

const handoffWire = {
  cueback_version: CUEBACK_VERSION,
  handoff_id: newId(ID_PREFIXES.handoff),
  content: {
    content_id: newId(ID_PREFIXES.episode),
    title: "The Economics of AI Inference",
    source_title: "AI Infrastructure Weekly",
    duration_seconds: 3120,
    published_at: "2026-07-21T06:00:00Z",
  },
  position_seconds: 1450,
  recommendation_reason: "Operator perspective on inference cost curves",
  user_question: "What did they mean by amortized GPU cost?",
  expires_at: "2026-07-30T18:30:00Z",
};

describe("AssistantHandoff", () => {
  it("carries only the permitted content subset", () => {
    const handoff = AssistantHandoffSchema.parse(handoffWire);
    expect(handoff.content.source_title).toBe("AI Infrastructure Weekly");
    expect(handoff.receipts).toBeUndefined();
  });

  it("rejects a handoff whose content still uses the pre-0.2 field names", () => {
    expect(
      AssistantHandoffSchema.safeParse({
        ...handoffWire,
        content: {
          episode_id: newId(ID_PREFIXES.episode),
          title: "The Economics of AI Inference",
          show_title: "AI Infrastructure Weekly",
          duration_seconds: 3120,
          published_at: "2026-07-21T06:00:00Z",
        },
      }).success,
    ).toBe(false);
  });
});
