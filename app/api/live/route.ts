import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
const API = "https://api.football-data.org/v4";

type Match = {
  id: number;
  utcDate: string;
  status: string;
  homeTeam: { id: number; name: string; shortName?: string; crest?: string };
  awayTeam: { id: number; name: string; shortName?: string; crest?: string };
  score: { winner?: string | null; fullTime?: { home?: number | null; away?: number | null }; halfTime?: { home?: number | null; away?: number | null } };
  competition: { name: string; emblem?: string };
  venue?: string;
};

function dateOnly(offsetDays = 0) {
  return new Date(Date.now() + offsetDays * 86400000).toISOString().slice(0, 10);
}

export async function GET() {
  const token = process.env.FOOTBALL_DATA_API_TOKEN;
  if (!token) return NextResponse.json({ mode: "demo", configured: false, message: "Add FOOTBALL_DATA_API_TOKEN to enable live football data.", matches: [] });

  try {
    const url = `${API}/matches?dateFrom=${dateOnly(-1)}&dateTo=${dateOnly(1)}`;
    const response = await fetch(url, { headers: { "X-Auth-Token": token, Accept: "application/json" }, next: { revalidate: 30 } });
    if (!response.ok) return NextResponse.json({ mode: "error", configured: true, message: `Football data provider returned ${response.status}.`, matches: [] }, { status: 502 });
    const payload = await response.json() as { matches?: Match[] };
    const live = (status: string) => ["LIVE", "IN_PLAY", "PAUSED"].includes(status) ? 0 : 1;
    const matches = (payload.matches ?? []).filter((m) => ["LIVE", "IN_PLAY", "PAUSED", "FINISHED", "TIMED", "SCHEDULED"].includes(m.status)).sort((a, b) => live(a.status) - live(b.status) || new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()).slice(0, 24);
    return NextResponse.json({ mode: "live", configured: true, fetchedAt: new Date().toISOString(), matches });
  } catch {
    return NextResponse.json({ mode: "error", configured: true, message: "Unable to reach the live football data provider.", matches: [] }, { status: 502 });
  }
}
