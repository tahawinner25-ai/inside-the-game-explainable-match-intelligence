import { z } from "zod";
import {
  AgentTraceSchema,
  EventSchema,
  TacticalInsightSchema,
  type AgentTrace,
  type MatchEvent,
  type MatchState,
  type TacticalInsight,
  type ViewerProfile,
} from "@/lib/schemas";
import { calculateMetrics } from "@/lib/simulation";
import { getConfiguredProvider, LocalInsightProvider } from "@/lib/providers";

const EventIntelligenceSchema = z.object({
  eventIds: z.array(EventSchema.shape.id),
  metrics: z.object({
    possession: z.object({ northbridge: z.number(), harbor: z.number() }),
    shots: z.object({ northbridge: z.number(), harbor: z.number() }),
    shotQualityProxy: z.object({ northbridge: z.number(), harbor: z.number() }),
    pressureActions: z.object({ northbridge: z.number(), harbor: z.number() }),
    territory: z.object({ northbridge: z.number(), harbor: z.number() }),
    momentum: z.number(),
  }),
  pattern: z.object({
    teamId: z.string(),
    supportingEventIds: z.array(EventSchema.shape.id),
    summary: z.string(),
  }),
});

export async function runInsightWorkflow(
  state: MatchState,
  viewer: ViewerProfile,
  requestedEventIds?: string[],
): Promise<{ insight: TacticalInsight; trace: AgentTrace }> {
  const validatedEvents = z.array(EventSchema).parse(state.events);
  const eventWindow = requestedEventIds?.length
    ? validatedEvents.filter((item) => requestedEventIds.includes(item.id))
    : validatedEvents.slice(-16);
  if (!eventWindow.length) throw new Error("No valid match events are available to analyze.");

  const metrics = calculateMetrics(validatedEvents);
  const candidates = eventWindow.filter((item) =>
    ["pressure", "interception", "progressive_pass"].includes(item.type),
  );
  const harborCandidates = candidates.filter((item) => item.teamId === "team_harbor");
  const northbridgeCandidates = candidates.filter((item) => item.teamId === "team_northbridge");
  const patternEvents = (harborCandidates.length >= northbridgeCandidates.length
    ? harborCandidates
    : northbridgeCandidates).slice(-5);
  if (!patternEvents.length) throw new Error("No evidence-supported pattern was found in the selected event window.");
  const patternTeamId = patternEvents[0].teamId;
  const patternTeam = state.match.homeTeam.id === patternTeamId ? state.match.homeTeam : state.match.awayTeam;

  const eventIntel = EventIntelligenceSchema.parse({
    eventIds: eventWindow.map((item) => item.id),
    metrics,
    pattern: {
      teamId: patternTeamId,
      supportingEventIds: patternEvents.map((item) => item.id),
      summary: `${patternEvents.length} pressure, recovery, or forward-progress event(s) appear in the selected window.`,
    },
  });

  const favouritePlayer = state.players.find((player) => player.id === viewer.favouritePlayerId);
  const confidence = Math.min(92, 56 + eventIntel.pattern.supportingEventIds.length * 7);
  const tacticalCandidate = {
    id: `insight_${state.traces.length + 1}`,
    category: "Tactical pattern" as const,
    headline: `${patternTeam.name} are finding ways to progress through pressure`,
    confidence,
    evidence: eventIntel.pattern.supportingEventIds.map((eventId) => ({
      eventId,
      label: validatedEvents.find((item) => item.id === eventId)?.description ?? "Verified synthetic event",
    })),
    whyItMatters: "Repeated high recoveries followed by forward progression can create dangerous attacks before the defence resets.",
    analystExplanation: `${eventIntel.pattern.summary} This is consistent with an effective high press, but the sample is limited.`,
    fanExplanation: `${patternTeam.name} are winning the ball higher up and moving forward quickly. That can put the other team under pressure.`,
    commentary: `${patternTeam.name} win it high and move forward again.`,
    caveat: "This is an interpretation of a short synthetic event window, not a confirmed tactical instruction or causal finding.",
    badge: "AI interpretation" as const,
    supportingEventIds: eventIntel.pattern.supportingEventIds,
    alternativeExplanation: "The pattern may reflect a brief spell of possession or the chosen synthetic scenario rather than a sustained tactical change.",
    favouritePlayerId: favouritePlayer?.teamId === viewer.favouriteTeamId ? favouritePlayer.id : null,
  };
  let validatedInsight = TacticalInsightSchema.parse(tacticalCandidate);
  let providerName: "local" | "foundry" = "local";

  try {
    const provider = getConfiguredProvider();
    const narrative = await provider.writeNarrative(validatedInsight, favouritePlayer?.name ?? null);
    validatedInsight = TacticalInsightSchema.parse({
      ...validatedInsight,
      headline: narrative.headline,
      analystExplanation: narrative.analystExplanation,
      fanExplanation: narrative.fanExplanation,
      whyItMatters: narrative.whyItMatters,
      commentary: narrative.commentary,
    });
    providerName = provider.name;
  } catch (error) {
    if (process.env.NODE_ENV !== "test") {
      const diagnostic = error instanceof Error ? error.name : "UnknownError";
      console.warn(`Narrative provider unavailable; using deterministic local output (${diagnostic}).`);
    }
    const fallback = await new LocalInsightProvider().writeNarrative(validatedInsight, favouritePlayer?.name ?? null);
    validatedInsight = TacticalInsightSchema.parse({
      ...validatedInsight,
      headline: fallback.headline,
      analystExplanation: fallback.analystExplanation,
      fanExplanation: fallback.fanExplanation,
      whyItMatters: fallback.whyItMatters,
      commentary: fallback.commentary,
    });
  }

  const createdAt = new Date().toISOString();
  const trace = AgentTraceSchema.parse({
    id: `trace_${state.traces.length + 1}`,
    createdAt,
    eventInputIds: eventIntel.eventIds,
    calculatedEvidence: eventIntel.metrics,
    tacticalInterpretation: {
      summary: eventIntel.pattern.summary,
      confidence,
      supportingEventIds: eventIntel.pattern.supportingEventIds,
      alternativeExplanation: validatedInsight.alternativeExplanation,
    },
    personalizedOutput: {
      headline: validatedInsight.headline,
      analyst: validatedInsight.analystExplanation,
      fan: validatedInsight.fanExplanation,
      commentary: validatedInsight.commentary,
    },
    insight: validatedInsight,
    provider: providerName,
  });
  return { insight: validatedInsight, trace };
}
