import { runInsightWorkflow } from "@/lib/agents";
import { MatchStateSchema, SimulationRequestSchema } from "@/lib/schemas";
import { appendSyntheticTick } from "@/lib/simulation";
import { readState, writeState } from "@/lib/store";
import { apiError, readJson, validationError } from "@/lib/http";

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const input = SimulationRequestSchema.parse(body);
    const profile = input.viewer ?? {
      favouriteTeamId: "team_harbor",
      favouritePlayerId: "player_harbor_10",
    };
    const current = readState();
    if (!current.running) {
      return apiError(409, "SIMULATION_PAUSED", "Start the simulation before requesting a tick.");
    }
    const next = appendSyntheticTick(current);
    const { insight, trace } = await runInsightWorkflow(next, profile);
    const updated = MatchStateSchema.parse({
      ...next,
      insights: [insight, ...next.insights.filter((item) => item.id !== insight.id)].slice(0, 3),
      traces: [trace, ...next.traces].slice(0, 20),
    });
    writeState(updated);
    return Response.json(updated);
  } catch (error) {
    return validationError(error);
  }
}
