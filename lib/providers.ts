import { z } from "zod";
import type { TacticalInsight } from "@/lib/schemas";

const NarrativeSchema = z.object({
  headline: z.string().min(1).max(140),
  analystExplanation: z.string().min(1),
  fanExplanation: z.string().min(1),
  whyItMatters: z.string().min(1),
  commentary: z.string().min(1),
});
export type Narrative = z.infer<typeof NarrativeSchema>;

export interface InsightModelProvider {
  readonly name: "local" | "foundry";
  writeNarrative(insight: TacticalInsight, favouritePlayerName: string | null): Promise<Narrative>;
}

export class LocalInsightProvider implements InsightModelProvider {
  readonly name = "local" as const;

  async writeNarrative(insight: TacticalInsight, favouritePlayerName: string | null): Promise<Narrative> {
    const playerMention = favouritePlayerName && insight.favouritePlayerId
      ? ` ${favouritePlayerName} is your selected player to watch.`
      : "";
    return NarrativeSchema.parse({
      headline: insight.headline,
      analystExplanation: insight.analystExplanation,
      fanExplanation: `${insight.fanExplanation}${playerMention}`,
      whyItMatters: insight.whyItMatters,
      commentary: insight.commentary,
    });
  }
}

export class MicrosoftFoundryProvider implements InsightModelProvider {
  readonly name = "foundry" as const;
  private readonly endpoint: string;
  private readonly deployment: string;
  private readonly apiKey: string;
  private readonly apiVersion: string;

  constructor(endpoint: string, deployment: string, apiKey: string, apiVersion: string) {
    this.endpoint = endpoint.replace(/\/+$/, "");
    this.deployment = deployment;
    this.apiKey = apiKey;
    this.apiVersion = apiVersion;
  }

  async writeNarrative(insight: TacticalInsight, favouritePlayerName: string | null): Promise<Narrative> {
    const url = new URL(
      `${this.endpoint}/openai/deployments/${encodeURIComponent(this.deployment)}/chat/completions`,
    );
    url.searchParams.set("api-version", this.apiVersion);
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "api-key": this.apiKey },
      signal: AbortSignal.timeout(8_000),
      body: JSON.stringify({
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: "Rewrite the supplied verified football insight for an analyst and casual fan. Use only its evidence and claims. Preserve confidence and caveats. Never add facts. Return JSON matching the given schema.",
          },
          {
            role: "user",
            content: JSON.stringify({ insight, favouritePlayerName }),
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "match_narrative",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                headline: { type: "string" },
                analystExplanation: { type: "string" },
                fanExplanation: { type: "string" },
                whyItMatters: { type: "string" },
                commentary: { type: "string" },
              },
              required: ["headline", "analystExplanation", "fanExplanation", "whyItMatters", "commentary"],
            },
          },
        },
      }),
    });
    if (!response.ok) throw new Error(`Foundry narrative request failed with status ${response.status}`);
    const payload: unknown = await response.json();
    const content = z.object({
      choices: z.array(z.object({
        message: z.object({ content: z.string() }),
      })).min(1),
    }).parse(payload).choices[0].message.content;
    return NarrativeSchema.parse(JSON.parse(content) as unknown);
  }
}

export function getConfiguredProvider(): InsightModelProvider {
  const endpoint = process.env.FOUNDRY_ENDPOINT;
  const deployment = process.env.FOUNDRY_DEPLOYMENT;
  const key = process.env.FOUNDRY_API_KEY;
  if (endpoint && deployment && key) {
    return new MicrosoftFoundryProvider(
      endpoint,
      deployment,
      key,
      process.env.FOUNDRY_API_VERSION ?? "2024-10-21",
    );
  }
  return new LocalInsightProvider();
}
