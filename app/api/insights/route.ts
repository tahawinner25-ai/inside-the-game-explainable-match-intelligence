import { InsightsResponseSchema } from "@/lib/schemas";
import { readState } from "@/lib/store";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(InsightsResponseSchema.parse({ insights: readState().insights }));
}
