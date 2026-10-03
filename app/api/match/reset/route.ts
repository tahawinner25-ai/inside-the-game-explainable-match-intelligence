import { resetState } from "@/lib/store";
import { MatchStateSchema } from "@/lib/schemas";

export function POST() {
  return Response.json(MatchStateSchema.parse(resetState()));
}
