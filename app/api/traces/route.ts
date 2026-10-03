import { TracesResponseSchema } from "@/lib/schemas";
import { readState } from "@/lib/store";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(TracesResponseSchema.parse({ traces: readState().traces }));
}
