import { describe, expect, it } from "vitest";
import { EventSchema, MatchStateSchema } from "../lib/schemas";
import { appendSyntheticTick, calculateMetrics, createInitialState } from "../lib/simulation";

describe("synthetic match simulation", () => {
  it("creates a repeatable level match with two fictional teams and 22 players", () => {
    const first = createInitialState();
    const second = createInitialState();
    expect(first.match.homeScore).toBe(first.match.awayScore);
    expect(first.players).toHaveLength(22);
    expect(first.events).toHaveLength(14);
    expect(first.events.filter((event) => event.type === "goal")).toHaveLength(2);
    expect(first.events.map((event) => event.id)).toEqual(second.events.map((event) => event.id));
    expect(first.events.every((event) => event.synthetic)).toBe(true);
    expect(MatchStateSchema.safeParse(first).success).toBe(true);
  });

  it("generates more than 150 repeatable event opportunities", () => {
    let state = createInitialState();
    state = { ...state, running: true, match: { ...state.match, status: "live" } };
    for (let index = 0; index < 160; index += 1) state = appendSyntheticTick(state);
    expect(state.events.length).toBeGreaterThanOrEqual(160);
    expect(state.events.every((event, index) => event.id === `evt_${String(index + 1).padStart(4, "0")}`)).toBe(true);
  });

  it("keeps every generated event inside the strict event contract", () => {
    const state = createInitialState();
    expect(state.events.every((item) => EventSchema.safeParse(item).success)).toBe(true);
  });

  it("calculates bounded possession, territory, and shot proxies", () => {
    const metrics = calculateMetrics(createInitialState().events);
    expect(metrics.possession.northbridge + metrics.possession.harbor).toBe(100);
    expect(metrics.territory.harbor).toBeGreaterThanOrEqual(0);
    expect(metrics.shotQualityProxy.harbor).toBeGreaterThan(0);
    expect(metrics.momentum).toBeGreaterThanOrEqual(-100);
    expect(metrics.momentum).toBeLessThanOrEqual(100);
  });
});
