import { runInsightWorkflow } from "@/lib/agents";
import { AnalyzeRequestSchema, AnalyzeResponseSchema, MatchStateSchema } from "@/lib/schemas";
import { readState, writeState } from "@/lib/store";
import { apiError, readJson, validationError } from "@/lib/http";

export async function POST(request: Request) {
  try {
    const input = AnalyzeRequestSchema.parse(await readJson(request));
    const current = readState();
    const availableEventIds = new Set(current.events.map((event) => event.id));
    const unknownEventIds = input.eventIds?.filter((eventId) => !availableEventIds.has(eventId)) ?? [];
    if (unknownEventIds.length) {
      return apiError(400, "UNKNOWN_EVENT_ID", `Unknown event ID(s): ${unknownEventIds.join(", ")}.`);
    }
    const { insight, trace } = await runInsightWorkflow(current, input.viewer, input.eventIds);
    const updated = MatchStateSchema.parse({
      ...current,
      insights: [insight, ...current.insights.filter((item) => item.id !== insight.id)].slice(0, 3),
      traces: [trace, ...current.traces].slice(0, 20),
    });
    writeState(updated);
    return Response.json(AnalyzeResponseSchema.parse({ insight, trace }));
  } catch (error) {
    return validationError(error);
  }
}
