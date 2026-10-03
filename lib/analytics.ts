import { z } from "zod";
import { EventSchema, PlayerSchema } from "@/lib/schemas";
import type { MatchEvent, Player } from "@/lib/schemas";

export const PlayerMatchStatsSchema = z.object({
  player: PlayerSchema,
  eventInvolvements: z.number().int().nonnegative(),
  successfulActions: z.number().int().nonnegative(),
  progressivePasses: z.number().int().nonnegative(),
  pressureActions: z.number().int().nonnegative(),
  recoveries: z.number().int().nonnegative(),
  shots: z.number().int().nonnegative(),
  goals: z.number().int().nonnegative(),
  lastEventMinute: z.number().int().min(0).nullable(),
});
export type PlayerMatchStats = z.infer<typeof PlayerMatchStatsSchema>;

export function calculatePlayerStats(player: Player, events: MatchEvent[]): PlayerMatchStats {
  const validatedPlayer = PlayerSchema.parse(player);
  const validatedEvents = z.array(EventSchema).parse(events);
  const playerEvents = validatedEvents.filter((event) => event.playerId === validatedPlayer.id);
  const count = (predicate: (event: MatchEvent) => boolean) => playerEvents.filter(predicate).length;
  return PlayerMatchStatsSchema.parse({
    player: validatedPlayer,
    eventInvolvements: playerEvents.length,
    successfulActions: count((event) => event.outcome === "successful"),
    progressivePasses: count((event) => event.type === "progressive_pass"),
    pressureActions: count((event) => ["pressure", "tackle", "interception"].includes(event.type)),
    recoveries: count((event) => event.type === "interception" && event.outcome === "successful"),
    shots: count((event) => event.type === "shot"),
    goals: count((event) => event.type === "goal"),
    lastEventMinute: playerEvents.at(-1)?.minute ?? null,
  });
}

export function createMatchReport(events: MatchEvent[], homeTeam: string, awayTeam: string, homeScore: number, awayScore: number): string {
  const rows = z.array(EventSchema).parse(events);
  const quote = (value: string) => `"${value.replaceAll('"', '""')}"`;
  const homeGoals = rows.filter((event) => event.teamId === "team_northbridge" && event.type === "goal").length;
  const awayGoals = rows.filter((event) => event.teamId === "team_harbor" && event.type === "goal").length;
  return [
    ["event_id", "minute", "team_id", "player_id", "type", "outcome", "x", "y", "description", "synthetic"].join(","),
    ...rows.map((event) =>
      [
        event.id,
        event.minute,
        event.teamId,
        event.playerId,
        event.type,
        event.outcome,
        event.x,
        event.y,
        quote(event.description),
        event.synthetic,
      ].join(","),
    ),
    [quote("match_summary"), "", "", "", "", "", "", "", quote(`${homeTeam} ${homeScore} - ${awayScore} ${awayTeam}`), "synthetic"].join(","),
    [quote("event_goal_count"), "", "", "", "", "", "", "", quote(`${homeTeam}: ${homeGoals}; ${awayTeam}: ${awayGoals}`), "synthetic"].join(","),
  ].join("\n");
}
