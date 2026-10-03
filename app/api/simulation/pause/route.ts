import { readState, writeState } from "@/lib/store";
import { MatchStateSchema } from "@/lib/schemas";

export function POST() {
  const current = readState();
  const updated = MatchStateSchema.parse({
    ...current,
    running: false,
    match: { ...current.match, status: "paused" },
  });
  writeState(updated);
  return Response.json(updated);
}
