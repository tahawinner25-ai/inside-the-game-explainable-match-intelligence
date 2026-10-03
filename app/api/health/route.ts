import { HealthResponseSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export function GET() {
  const configured = Boolean(process.env.FOUNDRY_ENDPOINT && process.env.FOUNDRY_DEPLOYMENT && process.env.FOUNDRY_API_KEY);
  return Response.json(HealthResponseSchema.parse({
    status: "ok",
    mode: configured ? "foundry-configured-with-local-fallback" : "demo",
    syntheticDataOnly: true,
  }));
}
