import { describe, expect, it } from "vitest";
import { EventSchema, TacticalInsightSchema } from "../lib/schemas";
import { createInitialState } from "../lib/simulation";

describe("API contract schemas", () => {
  it("rejects non-synthetic event data and malformed event identifiers", () => {
    const event = createInitialState().events[0];
    expect(EventSchema.safeParse({ ...event, synthetic: false }).success).toBe(false);
    expect(EventSchema.safeParse({ ...event, id: "evt-1" }).success).toBe(false);
  });

  it("does not accept confidence outside the documented 0-100 range", () => {
    const event = createInitialState().events[1];
    const invalid = {
      id: "test",
      category: "Tactical pattern",
      headline: "Test insight",
      confidence: 101,
      evidence: [{ eventId: event.id, label: "Pressure event" }],
      whyItMatters: "A test explanation.",
      analystExplanation: "A cautious test interpretation.",
      fanExplanation: "A simple explanation.",
      commentary: "A line.",
      caveat: "Synthetic sample.",
      badge: "AI interpretation",
      supportingEventIds: [event.id],
      alternativeExplanation: null,
      favouritePlayerId: null,
    };
    expect(TacticalInsightSchema.safeParse(invalid).success).toBe(false);
  });
});
