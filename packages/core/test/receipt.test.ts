import { describe, expect, it } from "vitest";
import {
  CUEBACK_VERSION,
  type ConsumptionReceipt,
  ConsumptionReceiptSchema,
  ID_PREFIXES,
  StructuredFeedbackSchema,
  newId,
} from "../src/index.js";

/**
 * A receipt in the exact ConsumptionReceipt shape (SPEC.md §16): `episode`
 * becomes `content_title`, the deterministic numbers live in the
 * `consumption` block, and the envelope fields the protocol requires are
 * present
 * (cueback_version, receipt_id, content_type, content_id, source_title,
 * created_at).
 */
const receiptExample = {
  cueback_version: CUEBACK_VERSION,
  receipt_id: newId(ID_PREFIXES.receipt),
  content_type: "podcast_episode",
  content_id: newId(ID_PREFIXES.episode),
  content_title: "The Economics of AI Inference",
  source_title: "AI Infrastructure Weekly",
  recommended_for: "Evaluate AI infrastructure opportunities",
  consumption: {
    outcome: "partial",
    progress_percent: 78,
    time_spent_minutes: 46,
  },
  structured_feedback: {
    value: "worth_my_time",
    difficulty: "slightly_basic",
    tags: ["good operator perspective", "more infrastructure economics"],
  },
  user_feedback: [
    {
      text: "The bit about GPU amortization finally made this click for me.",
      occurred_at: "2026-07-30T17:52:00Z",
    },
    {
      text: "Skipped the sponsor read, not the argument — I'd listen to more of this show.",
      occurred_at: "2026-07-30T17:58:00Z",
    },
  ],
  created_at: "2026-07-30T18:00:00Z",
};

describe("ConsumptionReceipt", () => {
  it("parses the specification's example receipt shape", () => {
    const receipt = ConsumptionReceiptSchema.parse(receiptExample);
    expect(receipt.content_type).toBe("podcast_episode");
    expect(receipt.consumption.progress_percent).toBe(78);
    expect(receipt.consumption.time_spent_minutes).toBe(46);
    expect(receipt.consumption.outcome).toBe("partial");
    expect(receipt.structured_feedback?.value).toBe("worth_my_time");
    expect(receipt.structured_feedback?.difficulty).toBe("slightly_basic");
  });

  it("round-trips a full receipt (with verbatim user_feedback) through JSON", () => {
    const parsed: ConsumptionReceipt = ConsumptionReceiptSchema.parse(receiptExample);
    const reparsed = ConsumptionReceiptSchema.parse(JSON.parse(JSON.stringify(parsed)));
    expect(reparsed).toEqual(parsed);
    expect(reparsed.user_feedback).toHaveLength(2);
    // Verbatim: preserved exactly as typed, in chronological order.
    expect(reparsed.user_feedback?.[0]?.text).toBe(receiptExample.user_feedback[0]?.text);
    expect(reparsed.user_feedback?.[1]?.occurred_at).toBe(
      receiptExample.user_feedback[1]?.occurred_at,
    );
  });

  it("parses a bare receipt with neither feedback field", () => {
    const { structured_feedback: _structured, user_feedback: _verbatim, ...bare } = receiptExample;
    expect(ConsumptionReceiptSchema.safeParse(bare).success).toBe(true);
  });

  it("rejects a progress percent above 100", () => {
    expect(
      ConsumptionReceiptSchema.safeParse({
        ...receiptExample,
        consumption: { ...receiptExample.consumption, progress_percent: 101 },
      }).success,
    ).toBe(false);
  });

  it("rejects an empty user_feedback entry and a flat (pre-0.2) receipt", () => {
    expect(
      ConsumptionReceiptSchema.safeParse({
        ...receiptExample,
        user_feedback: [{ text: "", occurred_at: "2026-07-30T17:52:00Z" }],
      }).success,
    ).toBe(false);
    const { consumption: _consumption, ...flat } = receiptExample;
    expect(
      ConsumptionReceiptSchema.safeParse({
        ...flat,
        progress_percent: 78,
        time_spent_minutes: 46,
        outcome: "partial",
      }).success,
    ).toBe(false);
  });
});

describe("StructuredFeedback", () => {
  it("requires at least one populated field", () => {
    expect(StructuredFeedbackSchema.safeParse({}).success).toBe(false);
    expect(StructuredFeedbackSchema.safeParse({ tags: [] }).success).toBe(false);
    expect(StructuredFeedbackSchema.safeParse({ flags: ["too_promotional"] }).success).toBe(true);
  });
});
