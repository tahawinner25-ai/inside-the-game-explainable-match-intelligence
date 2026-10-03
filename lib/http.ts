import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ApiErrorSchema } from "@/lib/schemas";

export function apiError(status: number, code: string, message: string): NextResponse {
  return NextResponse.json(ApiErrorSchema.parse({ error: { code, message } }), { status });
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new SyntaxError("Request body must be valid JSON.");
  }
}

export function validationError(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    return apiError(400, "INVALID_REQUEST", error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; "));
  }
  if (error instanceof SyntaxError) return apiError(400, "INVALID_JSON", error.message);
  return apiError(500, "INTERNAL_ERROR", "The request could not be completed.");
}
