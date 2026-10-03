import { readState } from "@/lib/store";
import { MatchStateSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(MatchStateSchema.parse(readState()));
}
