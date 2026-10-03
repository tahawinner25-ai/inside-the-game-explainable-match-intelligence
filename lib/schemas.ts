import { z } from "zod";

export const TeamSchema = z.object({
  id: z.string().regex(/^team_[a-z]+$/),
  name: z.string().min(1),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});
export type Team = z.infer<typeof TeamSchema>;

export const PlayerSchema = z.object({
  id: z.string().regex(/^player_[a-z]+_[0-9]{2}$/),
  name: z.string().min(1),
  teamId: TeamSchema.shape.id,
  position: z.enum(["GK", "DF", "MF", "FW"]),
  number: z.number().int().min(1).max(99),
});
export type Player = z.infer<typeof PlayerSchema>;

export const MatchSchema = z.object({
  id: z.string(),
  homeTeam: TeamSchema,
  awayTeam: TeamSchema,
  homeScore: z.number().int().nonnegative(),
  awayScore: z.number().int().nonnegative(),
  minute: z.number().int().min(0).max(120),
  status: z.enum(["paused", "live", "finished"]),
});
export type Match = z.infer<typeof MatchSchema>;

export const EventTypeSchema = z.enum([
  "pass",
  "progressive_pass",
  "carry",
  "tackle",
  "interception",
  "pressure",
  "shot",
  "save",
  "goal",
  "foul",
  "substitution",
  "possession_change",
  "stoppage",
]);
export type EventType = z.infer<typeof EventTypeSchema>;

export const EventSchema = z.object({
  id: z.string().regex(/^evt_[0-9]{4}$/),
  minute: z.number().int().min(0).max(120),
  teamId: TeamSchema.shape.id,
  playerId: PlayerSchema.shape.id,
  type: EventTypeSchema,
  description: z.string().min(1),
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  outcome: z.enum(["successful", "unsuccessful", "neutral"]),
  synthetic: z.literal(true),
});
export type MatchEvent = z.infer<typeof EventSchema>;

export const EventWindowSchema = z.object({
  fromMinute: z.number().int().min(0),
  toMinute: z.number().int().max(120),
  events: z.array(EventSchema),
});
export type EventWindow = z.infer<typeof EventWindowSchema>;

export const CalculatedMetricsSchema = z.object({
  possession: z.object({ northbridge: z.number().min(0).max(100), harbor: z.number().min(0).max(100) }),
  shots: z.object({ northbridge: z.number().int().nonnegative(), harbor: z.number().int().nonnegative() }),
  shotQualityProxy: z.object({ northbridge: z.number().min(0), harbor: z.number().min(0) }),
  pressureActions: z.object({ northbridge: z.number().int().nonnegative(), harbor: z.number().int().nonnegative() }),
  territory: z.object({ northbridge: z.number().min(0).max(100), harbor: z.number().min(0).max(100) }),
  momentum: z.number().min(-100).max(100),
});
export type CalculatedMetrics = z.infer<typeof CalculatedMetricsSchema>;

export const EvidenceReferenceSchema = z.object({
  eventId: EventSchema.shape.id,
  label: z.string().min(1),
});
export type EvidenceReference = z.infer<typeof EvidenceReferenceSchema>;

export const ViewerProfileSchema = z.object({
  favouriteTeamId: TeamSchema.shape.id,
  favouritePlayerId: PlayerSchema.shape.id,
});
export type ViewerProfile = z.infer<typeof ViewerProfileSchema>;

export const TacticalInsightSchema = z.object({
  id: z.string(),
  category: z.enum(["Momentum shift", "Tactical pattern", "Key player influence", "Dangerous sequence"]),
  headline: z.string().min(1).max(140),
  confidence: z.number().int().min(0).max(100),
  evidence: z.array(EvidenceReferenceSchema).min(1),
  whyItMatters: z.string().min(1),
  analystExplanation: z.string().min(1),
  fanExplanation: z.string().min(1),
  commentary: z.string().min(1),
  caveat: z.string().min(1),
  badge: z.enum(["Fact", "Calculated", "AI interpretation"]),
  supportingEventIds: z.array(EventSchema.shape.id),
  alternativeExplanation: z.string().nullable(),
  favouritePlayerId: PlayerSchema.shape.id.nullable(),
});
export type TacticalInsight = z.infer<typeof TacticalInsightSchema>;

export const AgentTraceSchema = z.object({
  id: z.string(),
  createdAt: z.string().datetime(),
  eventInputIds: z.array(EventSchema.shape.id),
  calculatedEvidence: CalculatedMetricsSchema,
  tacticalInterpretation: z.object({
    summary: z.string(),
    confidence: z.number().int().min(0).max(100),
    supportingEventIds: z.array(EventSchema.shape.id),
    alternativeExplanation: z.string().nullable(),
  }),
  personalizedOutput: z.object({
    headline: z.string(),
    analyst: z.string(),
    fan: z.string(),
    commentary: z.string(),
  }),
  insight: TacticalInsightSchema,
  provider: z.enum(["local", "foundry"]),
});
export type AgentTrace = z.infer<typeof AgentTraceSchema>;

export const MatchStateSchema = z.object({
  match: MatchSchema,
  players: z.array(PlayerSchema),
  events: z.array(EventSchema),
  metrics: CalculatedMetricsSchema,
  insights: z.array(TacticalInsightSchema).max(3),
  traces: z.array(AgentTraceSchema),
  running: z.boolean(),
  tickCount: z.number().int().nonnegative(),
});
export type MatchState = z.infer<typeof MatchStateSchema>;

export const EventsResponseSchema = z.object({ events: z.array(EventSchema) });
export const PlayerMatchStatsResponseSchema = z.object({
  stats: z.object({
    player: PlayerSchema,
    eventInvolvements: z.number().int().nonnegative(),
    successfulActions: z.number().int().nonnegative(),
    progressivePasses: z.number().int().nonnegative(),
    pressureActions: z.number().int().nonnegative(),
    recoveries: z.number().int().nonnegative(),
    shots: z.number().int().nonnegative(),
    goals: z.number().int().nonnegative(),
    lastEventMinute: z.number().int().min(0).nullable(),
  }),
});
export const InsightsResponseSchema = z.object({ insights: z.array(TacticalInsightSchema).max(3) });
export const TracesResponseSchema = z.object({ traces: z.array(AgentTraceSchema) });
export const AnalyzeResponseSchema = z.object({
  insight: TacticalInsightSchema,
  trace: AgentTraceSchema,
});
export const HealthResponseSchema = z.object({
  status: z.literal("ok"),
  mode: z.enum(["demo", "foundry-configured-with-local-fallback"]),
  syntheticDataOnly: z.literal(true),
});
export const AnalyzeRequestSchema = z.object({
  eventIds: z.array(EventSchema.shape.id).optional(),
  viewer: ViewerProfileSchema,
});
export const SimulationRequestSchema = z.object({
  viewer: ViewerProfileSchema.optional(),
}).default({});
export const SpeedSchema = z.union([z.literal(1), z.literal(2), z.literal(5)]);
export const ApiErrorSchema = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
});
