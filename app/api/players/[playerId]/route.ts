import { calculatePlayerStats } from "@/lib/analytics";
import { PlayerSchema, PlayerMatchStatsResponseSchema } from "@/lib/schemas";
import { apiError } from "@/lib/http";
import { readState } from "@/lib/store";

export const dynamic = "force-dynamic";

export function GET(_request: Request, context: { params: { playerId: string } }) {
  const state = readState();
  const player = state.players.find((candidate) => candidate.id === context.params.playerId);
  if (!player) {
    return apiError(404, "PLAYER_NOT_FOUND", "No fictional match player matches that ID.");
  }
  const stats = calculatePlayerStats(PlayerSchema.parse(player), state.events);
  return Response.json(PlayerMatchStatsResponseSchema.parse({ stats }));
}
