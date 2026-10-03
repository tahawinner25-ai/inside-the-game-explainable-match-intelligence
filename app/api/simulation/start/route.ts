import { runInsightWorkflow } from "@/lib/agents";
import { MatchStateSchema, SimulationRequestSchema } from "@/lib/schemas";
import { appendSyntheticTick } from "@/lib/simulation";
import { readState, writeState } from "@/lib/store";
import { validationError, readJson } from "@/lib/http";

export async function POST(request: Request) {
  let body: unknown = {};
  try {
    body = await readJson(request);
    const input = SimulationRequestSchema.parse(body);
    const profile = input.viewer ?? {
      favouriteTeamId: "team_harbor",
      favouritePlayerId: "player_harbor_10",
    };
    const current = readState();
    const live = MatchStateSchema.parse({
      ...current,
      match: { ...current.match, status: "live" },
      running: true,
    });
    const withEvent = appendSyntheticTick(live);
    const { insight, trace } = await runInsightWorkflow(withEvent, profile);
    const updated = MatchStateSchema.parse({
      ...withEvent,
      insights: [insight, ...withEvent.insights.filter((item) => item.id !== insight.id)].slice(0, 3),
      traces: [trace, ...withEvent.traces].slice(0, 20),
    });
    writeState(updated);
    return Response.json(updated);
  } catch (error) {
    return validationError(error);
  }
}
