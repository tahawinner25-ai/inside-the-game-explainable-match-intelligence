import { describe, expect, it } from "vitest";
import { calculatePlayerStats, createMatchReport } from "../lib/analytics";
import { createInitialState } from "../lib/simulation";

describe("match-center analytics", () => {
  it("calculates player involvement only from that player's synthetic event records", () => {
    const state = createInitialState();
    const striker = state.players.find((player) => player.id === "player_harbor_11");
    expect(striker).toBeDefined();
    if (!striker) throw new Error("Seeded Harbor City striker is missing.");
    const stats = calculatePlayerStats(striker, state.events);
    expect(stats.goals).toBe(1);
    expect(stats.eventInvolvements).toBe(1);
    expect(stats.lastEventMinute).toBe(34);
  });

  it("exports a CSV report with escaped descriptions and explicit synthetic fields", () => {
    const state = createInitialState();
    const report = createMatchReport(
      state.events,
      state.match.homeTeam.name,
      state.match.awayTeam.name,
      state.match.homeScore,
      state.match.awayScore,
    );
    expect(report).toContain("event_id,minute,team_id,player_id,type,outcome,x,y,description,synthetic");
    expect(report).toContain("evt_0001");
    expect(report).toContain('"match_summary",,,,,,,,"Northbridge FC 1 - 1 Harbor City",synthetic');
  });
});
