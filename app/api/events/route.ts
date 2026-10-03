import { EventsResponseSchema } from "@/lib/schemas";
import { readState } from "@/lib/store";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(EventsResponseSchema.parse({ events: readState().events }));
}
