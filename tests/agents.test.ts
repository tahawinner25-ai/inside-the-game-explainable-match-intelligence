import { afterEach, describe, expect, it, vi } from "vitest";
import { runInsightWorkflow } from "../lib/agents";
import { LocalInsightProvider, getConfiguredProvider } from "../lib/providers";
import { createInitialState } from "../lib/simulation";

const envKeys = ["FOUNDRY_ENDPOINT", "FOUNDRY_DEPLOYMENT", "FOUNDRY_API_KEY"] as const;
const savedEnv = new Map(envKeys.map((key) => [key, process.env[key]]));

afterEach(() => {
  vi.unstubAllGlobals();
  for (const key of envKeys) {
    const value = savedEnv.get(key);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("agent workflow and provider fallback", () => {
  it("uses the local provider when Foundry credentials are absent", () => {
    for (const key of envKeys) delete process.env[key];
    expect(getConfiguredProvider()).toBeInstanceOf(LocalInsightProvider);
  });

  it("returns a schema-valid insight and a three-stage user-safe trace", async () => {
    for (const key of envKeys) delete process.env[key];
    const { insight, trace } = await runInsightWorkflow(createInitialState(), {
      favouriteTeamId: "team_harbor",
      favouritePlayerId: "player_harbor_10",
    });
    expect(insight.evidence.length).toBeGreaterThan(0);
    expect(insight.confidence).toBeGreaterThan(0);
    expect(trace.eventInputIds).toContain(insight.supportingEventIds[0]);
    expect(trace.provider).toBe("local");
    expect(trace.tacticalInterpretation.alternativeExplanation).toBeTruthy();
  });

  it("keeps the interpreted team aligned with evidence rather than the favourite selection", async () => {
    for (const key of envKeys) delete process.env[key];
    const { insight } = await runInsightWorkflow(createInitialState(), {
      favouriteTeamId: "team_northbridge",
      favouritePlayerId: "player_northbridge_06",
    });
    expect(insight.headline).toContain("Harbor City");
    expect(insight.favouritePlayerId).toBe("player_northbridge_06");
  });

  it("falls back to local narrative when a configured Foundry request fails", async () => {
    process.env.FOUNDRY_ENDPOINT = "https://foundry.example";
    process.env.FOUNDRY_DEPLOYMENT = "demo-model";
    process.env.FOUNDRY_API_KEY = "test-only";
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 503 })));
    const { trace } = await runInsightWorkflow(createInitialState(), {
      favouriteTeamId: "team_harbor",
      favouritePlayerId: "player_harbor_10",
    });
    expect(trace.provider).toBe("local");
    expect(trace.personalizedOutput.commentary.length).toBeGreaterThan(0);
  });
});
