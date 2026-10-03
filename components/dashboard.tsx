"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { EventType, MatchState, TacticalInsight, ViewerProfile } from "@/lib/schemas";
import { EventTypeSchema } from "@/lib/schemas";
import { teams } from "@/lib/simulation";
import { calculatePlayerStats, createMatchReport } from "@/lib/analytics";

const defaultViewer: ViewerProfile = {
  favouriteTeamId: "team_harbor",
  favouritePlayerId: "player_harbor_10",
};

type ViewMode = "analyst" | "fan";
type Speed = 1 | 2 | 5;

async function readError(response: Response): Promise<string> {
  const payload: unknown = await response.json().catch(() => null);
  if (typeof payload === "object" && payload !== null && "error" in payload) {
    const maybe = payload.error;
    if (typeof maybe === "object" && maybe !== null && "message" in maybe && typeof maybe.message === "string") return maybe.message;
  }
  return `Request failed (${response.status}).`;
}

export default function Dashboard() {
  const [state, setState] = useState<MatchState | null>(null);
  const [mode, setMode] = useState<ViewMode>("analyst");
  const [speed, setSpeed] = useState<Speed>(1);
  const [viewer, setViewer] = useState<ViewerProfile>(defaultViewer);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [eventSearch, setEventSearch] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState<EventType | "all">("all");
  const [eventTeamFilter, setEventTeamFilter] = useState("all");
  const [favouriteOnly, setFavouriteOnly] = useState(false);
  const [visibleEvents, setVisibleEvents] = useState(24);
  const [providerMode, setProviderMode] = useState("demo");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/match", { cache: "no-store" });
    if (!response.ok) throw new Error(await readError(response));
    setState(await response.json() as MatchState);
  }, []);

  useEffect(() => {
    void load().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Unable to load match."));
    void fetch("/api/health").then(async (response) => {
      if (!response.ok) throw new Error(await readError(response));
      const health = await response.json() as { mode?: string };
      setProviderMode(health.mode?.startsWith("foundry") ? "foundry" : "demo");
    }).catch((cause: unknown) => {
      setProviderMode("demo");
      setError(cause instanceof Error ? cause.message : "Unable to determine provider mode.");
    });
  }, [load]);

  const request = useCallback(async (path: string, body?: object) => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body ?? {}),
      });
      if (!response.ok) throw new Error(await readError(response));
      setState(await response.json() as MatchState);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The request failed.");
    } finally {
      setBusy(false);
    }
  }, []);

  const analyzeNow = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/insights/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ viewer }),
      });
      if (!response.ok) throw new Error(await readError(response));
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to analyze the current match.");
    } finally {
      setBusy(false);
    }
  }, [load, viewer]);

  useEffect(() => {
    if (!state?.running || busy) return;
    const timer = window.setInterval(() => {
      void request("/api/simulation/tick", { viewer });
    }, 3000 / speed);
    return () => window.clearInterval(timer);
  }, [state?.running, busy, request, speed, viewer]);

  const playerOptions = useMemo(
    () => state?.players.filter((player) => player.teamId === viewer.favouriteTeamId) ?? [],
    [state?.players, viewer.favouriteTeamId],
  );
  const selectedEvent = state?.events.find((item) => item.id === selectedEventId);
  const focusedPlayer = state?.players.find((player) => player.id === viewer.favouritePlayerId);
  const focusedPlayerStats = focusedPlayer && state
    ? calculatePlayerStats(focusedPlayer, state.events)
    : null;
  const selectedTrace = selectedEvent
    ? state?.traces.find((trace) => trace.eventInputIds.includes(selectedEvent.id))
    : state?.traces[0];
  const chartData = useMemo(() => {
    if (!state) return [];
    const byMinute = new Map<number, { minute: number; Northbridge: number; Harbor: number }>();
    for (const item of state.events.slice(-36)) {
      const row = byMinute.get(item.minute) ?? { minute: item.minute, Northbridge: 0, Harbor: 0 };
      if (item.teamId === "team_northbridge") row.Northbridge += 1;
      else row.Harbor += 1;
      byMinute.set(item.minute, row);
    }
    return [...byMinute.values()].sort((a, b) => a.minute - b.minute);
  }, [state]);
  const filteredEvents = useMemo(() => {
    if (!state) return [];
    const query = eventSearch.trim().toLocaleLowerCase();
    return [...state.events].reverse().filter((event) => {
      const player = state.players.find((candidate) => candidate.id === event.playerId);
      const matchesText = !query || `${event.id} ${event.description} ${player?.name ?? ""}`.toLocaleLowerCase().includes(query);
      return matchesText
        && (eventTypeFilter === "all" || event.type === eventTypeFilter)
        && (eventTeamFilter === "all" || event.teamId === eventTeamFilter)
        && (!favouriteOnly || event.playerId === viewer.favouritePlayerId);
    });
  }, [eventSearch, eventTeamFilter, eventTypeFilter, favouriteOnly, state, viewer.favouritePlayerId]);

  function updateFavouriteTeam(teamId: string) {
    const nextPlayer = state?.players.find((player) => player.teamId === teamId);
    setViewer({ favouriteTeamId: teamId, favouritePlayerId: nextPlayer?.id ?? "" });
  }

  function downloadReport() {
    if (!state) return;
    const report = createMatchReport(
      state.events,
      state.match.homeTeam.name,
      state.match.awayTeam.name,
      state.match.homeScore,
      state.match.awayScore,
    );
    const url = URL.createObjectURL(new Blob([report], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${match.id}-synthetic-report.csv`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  if (!state) {
    return <main className="loading-shell"><div className="spinner" aria-hidden="true" /><p>Loading synthetic match…</p>{error && <p role="alert">{error}</p>}</main>;
  }

  const { match, metrics } = state;
  const teamFor = (teamId: string) => teams.find((team) => team.id === teamId)?.name ?? "Unknown team";
  const timeLabel = `${String(match.minute).padStart(2, "0")}:00`;
  const selectedPlayer = state.players.find((player) => player.id === viewer.favouritePlayerId);

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Inside the Game home">
          <span className="brand-mark" aria-hidden="true">IG</span>
          <span><strong>Inside the Game</strong><small>EXPLAINABLE MATCH INTELLIGENCE</small></span>
        </a>
        <div className="live-tag"><span className={state.running ? "pulse-dot" : "quiet-dot"} /> SYNTHETIC MATCH <b>•</b> {state.running ? "LIVE SIMULATION" : "PAUSED SIMULATION"}</div>
        <div className="topbar-right">
          <span className="mode-tag">{providerMode === "foundry" ? "FOUNDRY + FALLBACK" : "DEMO MODE"}</span>
          <span className="synthetic-label">SYNTHETIC DATA / HACKATHON PROTOTYPE</span>
        </div>
      </header>

      <section className="control-row" aria-label="Match controls and viewer preferences">
        <div className="control-buttons">
          {!state.running
            ? <button className="button-primary" onClick={() => void request("/api/simulation/start", { viewer })} disabled={busy}>▶ <span>Start</span></button>
            : <button className="button-secondary" onClick={() => void request("/api/simulation/pause")} disabled={busy}>Ⅱ <span>Pause</span></button>}
          <button className="button-quiet" onClick={() => { setSelectedEventId(null); void request("/api/match/reset"); }} disabled={busy}>↺ <span>Reset</span></button>
          <button className="button-quiet" onClick={downloadReport} disabled={busy} aria-label="Download synthetic match report as CSV">⇩ <span>Export CSV</span></button>
          <button className="button-quiet" onClick={() => void analyzeNow()} disabled={busy}>✳ <span>Analyze now</span></button>
          <label className="speed-control">Speed
            <select value={speed} onChange={(event) => setSpeed(Number(event.target.value) as Speed)} aria-label="Simulation speed">
              <option value={1}>1×</option><option value={2}>2×</option><option value={5}>5×</option>
            </select>
          </label>
        </div>
        <div className="preference-controls">
          <div className="segmented" role="group" aria-label="Dashboard view">
            <button className={mode === "analyst" ? "active" : ""} onClick={() => setMode("analyst")} aria-pressed={mode === "analyst"}>Analyst View</button>
            <button className={mode === "fan" ? "active" : ""} onClick={() => setMode("fan")} aria-pressed={mode === "fan"}>Fan View</button>
          </div>
          <label className="select-control">Favourite team
            <select value={viewer.favouriteTeamId} onChange={(event) => updateFavouriteTeam(event.target.value)}>
              {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
            </select>
          </label>
          <label className="select-control">Player to watch
            <select value={viewer.favouritePlayerId} onChange={(event) => setViewer({ ...viewer, favouritePlayerId: event.target.value })}>
              {playerOptions.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}
            </select>
          </label>
        </div>
      </section>

      {error && <div className="error-banner" role="alert"><strong>Service warning.</strong> {error}</div>}

      <section className="scoreboard panel" aria-label="Match overview">
        <div className="team-side home">
          <span className="team-icon north-icon">N</span><div><small>HOME</small><strong>{match.homeTeam.name}</strong></div>
        </div>
        <div className="score-center">
          <div className="scoreline"><span>{match.homeScore}</span><i>:</i><span>{match.awayScore}</span></div>
          <div className="match-clock"><span className={state.running ? "pulse-dot" : "quiet-dot"} /> {timeLabel} <span className="second-half">2ND HALF</span></div>
        </div>
        <div className="team-side away">
          <div><small>AWAY</small><strong>{match.awayTeam.name}</strong></div><span className="team-icon harbor-icon">H</span>
        </div>
        <div className="score-stats">
          <div><span>POSSESSION · EVENT SHARE</span><strong>{metrics.possession.northbridge}% <i>—</i> {metrics.possession.harbor}%</strong></div>
          <div><span>SHOTS</span><strong>{metrics.shots.northbridge} <i>—</i> {metrics.shots.harbor}</strong></div>
          <div><span>xG-STYLE PROXY</span><strong>{metrics.shotQualityProxy.northbridge.toFixed(2)} <i>—</i> {metrics.shotQualityProxy.harbor.toFixed(2)}</strong></div>
          <div><span>MOMENTUM</span><strong className={metrics.momentum >= 0 ? "metric-up" : "metric-down"}>{metrics.momentum >= 0 ? "↗" : "↘"} {Math.abs(metrics.momentum)}</strong></div>
        </div>
      </section>

      <div className="section-caption"><span>LIVE MATCH CENTRE</span><span className="caption-rule" /><span className="clock-state">{state.running ? "EVENTS UPDATING" : "READY WHEN YOU ARE"}</span></div>

      <div className={`dashboard-grid ${mode === "fan" ? "fan-mode" : ""}`}>
        <section className="column-main">
          <section className="panel insight-panel">
            <div className="panel-heading"><div><div className="eyebrow">WHAT THE MATCH IS TELLING US</div><h1>{mode === "fan" ? "The story so far" : "Priority insights"}</h1></div><span className="count-pill">{Math.min(3, state.insights.length)} / 3</span></div>
            {state.insights.length === 0 ? (
              <div className="empty-state"><span className="empty-icon">✳</span><div><strong>Waiting for the first signal</strong><p>Start the simulation to turn synthetic match events into evidence-backed insight.</p></div><button className="text-button" onClick={() => void request("/api/simulation/start", { viewer })}>Run simulation →</button></div>
            ) : (
              <div className="insight-list">
                {state.insights.slice(0, 3).map((insight) => (
                  <InsightCard key={`${insight.id}-${insight.headline}`} insight={insight} mode={mode} onSelect={() => setSelectedEventId(insight.supportingEventIds[0] ?? null)} />
                ))}
              </div>
            )}
            {mode === "fan" && state.insights[0] && (
              <div className="commentary-strip"><span className="commentary-icon">❝</span><div><small>LIVE COMMENTARY</small><p>“{state.insights[0].commentary}”</p></div></div>
            )}
          </section>

          {mode === "analyst" && (
            <section className="panel analyst-panel">
              <div className="panel-heading"><div><div className="eyebrow">SPATIAL &amp; SEQUENCE VIEW</div><h2>Match analysis</h2></div><span className="proxy-tag">CALCULATED FROM SYNTHETIC EVENTS</span></div>
              <div className="analysis-columns">
                <div className="pitch-wrap">
                  <div className="pitch-label">EVENT MAP · ATTACK DIRECTION →</div>
                  <div className="pitch" role="img" aria-label="Synthetic event map with team-colored event markers">
                    <span className="pitch-halfway" /><span className="pitch-circle" /><span className="pitch-box pitch-left" /><span className="pitch-box pitch-right" />
                    {state.events.slice(-22).map((event) => <span key={event.id} className={`event-dot ${event.teamId === "team_harbor" ? "dot-harbor" : "dot-north"} ${event.type === "shot" || event.type === "goal" ? "dot-shot" : ""}`} style={{ left: `${event.x}%`, top: `${event.y}%` }} title={`${event.id}: ${event.description}`} />)}
                  </div>
                  <div className="pitch-legend"><span><i className="legend-north" /> Northbridge</span><span><i className="legend-harbor" /> Harbor City</span></div>
                </div>
                <div className="chart-wrap">
                  <div className="chart-title"><strong>Event activity</strong><span>Last event windows</span></div>
                  <div className="chart-box">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 8, right: 2, left: -24, bottom: 0 }}>
                        <CartesianGrid stroke="#23344a" vertical={false} />
                        <XAxis dataKey="minute" tick={{ fill: "#8290a2", fontSize: 10 }} tickLine={false} axisLine={false} unit="′" />
                        <YAxis allowDecimals={false} tick={{ fill: "#8290a2", fontSize: 10 }} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ background: "#101c2c", border: "1px solid #293c54", borderRadius: 8, fontSize: 12 }} />
                        <Bar dataKey="Northbridge" fill="#35c4aa" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="Harbor" fill="#55a8ff" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="metric-pills"><span>PRESSURE <b>{metrics.pressureActions.northbridge} — {metrics.pressureActions.harbor}</b></span><span>TERRITORY <b>{metrics.territory.northbridge}% — {metrics.territory.harbor}%</b></span></div>
                </div>
              </div>
              <div className="analyst-note"><span className="note-mark">i</span><p><strong>Reading the pattern</strong> These are deterministic counts and location proxies from generated events. They describe this demo sequence only; they do not prove a tactical instruction or predict a result.</p></div>
            </section>
          )}

          {mode === "fan" && selectedPlayer && (
            <section className="panel favourite-panel">
              <div className="eyebrow">YOUR PLAYER TO WATCH</div>
              <h2>{selectedPlayer.name} <span>#{selectedPlayer.number}</span></h2>
              <p>{state.events.filter((item) => item.playerId === selectedPlayer.id).slice(-2).map((item) => item.description).join(" · ") || "No recorded synthetic events for this player yet."}</p>
              <small>Fictional player · {teamFor(selectedPlayer.teamId)}</small>
              {focusedPlayerStats && <PlayerStats stats={focusedPlayerStats} />}
            </section>
          )}
          {mode === "analyst" && focusedPlayerStats && (
            <section className="panel player-stats-panel">
              <div className="panel-heading"><div><div className="eyebrow">PLAYER INVOLVEMENT · SYNTHETIC EVENT COUNTS</div><h2>{focusedPlayerStats.player.name}</h2></div><span className="timeline-count">#{focusedPlayerStats.player.number} · {focusedPlayerStats.player.position}</span></div>
              <PlayerStats stats={focusedPlayerStats} />
            </section>
          )}
        </section>

        <aside className="column-side">
          <section className="panel timeline-panel">
            <div className="panel-heading"><div><div className="eyebrow">SYNTHETIC EVENT FEED</div><h2>Live timeline</h2></div><span className="timeline-count">{state.events.length} EVENTS</span></div>
            <div className="event-filters">
              <label className="search-label">Search events
                <input value={eventSearch} onChange={(event) => { setEventSearch(event.target.value); setVisibleEvents(24); }} placeholder="Event, action or player…" />
              </label>
              <div className="filter-row">
                <label>Event type
                  <select value={eventTypeFilter} onChange={(event) => { setEventTypeFilter(event.target.value as EventType | "all"); setVisibleEvents(24); }}>
                    <option value="all">All event types</option>
                    {EventTypeSchema.options.map((type) => <option key={type} value={type}>{type.replaceAll("_", " ")}</option>)}
                  </select>
                </label>
                <label>Team
                  <select value={eventTeamFilter} onChange={(event) => { setEventTeamFilter(event.target.value); setVisibleEvents(24); }}>
                    <option value="all">All teams</option>
                    {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
                  </select>
                </label>
              </div>
              <label className="check-filter"><input type="checkbox" checked={favouriteOnly} onChange={(event) => { setFavouriteOnly(event.target.checked); setVisibleEvents(24); }} /> Player to watch only</label>
            </div>
            <div className="timeline-list" aria-label="Match events">
              {filteredEvents.slice(0, visibleEvents).map((event) => {
                const eventPlayer = state.players.find((player) => player.id === event.playerId);
                return (
                  <button className={`timeline-event ${selectedEventId === event.id ? "selected-event" : ""}`} key={event.id} onClick={() => setSelectedEventId(selectedEventId === event.id ? null : event.id)} aria-label={`Event ${event.id}, ${event.minute} minutes, ${event.description}`}>
                    <span className="event-time">{event.minute}′</span><span className={`event-symbol symbol-${event.type}`}>{symbolFor(event.type)}</span>
                    <span className="event-copy"><strong>{event.description}</strong><small>{eventPlayer?.name ?? "Unknown player"} · {teamFor(event.teamId)}</small></span><span className="event-arrow">›</span>
                  </button>
                );
              })}
              {filteredEvents.length === 0 && <p className="no-events">No events match these filters.</p>}
            </div>
            {filteredEvents.length > visibleEvents && <button className="load-more" onClick={() => setVisibleEvents((count) => count + 24)}>Show 24 older events ({filteredEvents.length - visibleEvents} remaining)</button>}
          </section>

          <section className="panel trace-panel">
            <div className="panel-heading"><div><div className="eyebrow">TRANSPARENT BY DESIGN</div><h2>{selectedEvent ? `Evidence · ${selectedEvent.id}` : "Agent trace"}</h2></div><span className="trace-lock" aria-label="User-safe rationale only">◎</span></div>
            {selectedEvent ? (
              <div className="evidence-detail">
                <span className="fact-badge">FACT · SYNTHETIC EVENT</span>
                <p className="selected-description">{selectedEvent.description}</p>
                <div className="detail-row"><span>TIME</span><b>{selectedEvent.minute}′</b></div>
                <div className="detail-row"><span>TEAM</span><b>{teamFor(selectedEvent.teamId)}</b></div>
                <div className="detail-row"><span>LOCATION</span><b>{selectedEvent.x}, {selectedEvent.y} (normalized pitch)</b></div>
                {selectedTrace
                  ? <TraceSteps trace={selectedTrace} mode={mode} />
                  : <p className="safe-rationale">No generated insight trace includes this event yet. Select an evidence-linked event to inspect its analysis.</p>}
              </div>
            ) : selectedTrace ? (
              <TraceSteps trace={selectedTrace} mode={mode} />
            ) : (
              <div className="trace-empty"><span>⌁</span><p>Agent trace appears when an insight is generated.</p></div>
            )}
          </section>
        </aside>
      </div>
      <footer className="footer"><span>INSIDE THE GAME <i>·</i> SYNTHETIC DEMO</span><span>Every insight links back to generated events. Interpretations are not match facts.</span></footer>
    </main>
  );
}

function InsightCard({ insight, mode, onSelect }: { insight: TacticalInsight; mode: ViewMode; onSelect: () => void }) {
  return (
    <article className="insight-card">
      <div className="insight-topline"><span className="insight-category"><i />{insight.category}</span><span className="badge-interpretation">{insight.badge}</span></div>
      <h3>{insight.headline}</h3>
      <p className="insight-summary">{mode === "fan" ? insight.fanExplanation : insight.analystExplanation}</p>
      <div className="confidence"><span>CONFIDENCE <b>{insight.confidence}%</b></span><span className="confidence-track"><i style={{ width: `${insight.confidence}%` }} /></span></div>
      <div className="evidence-block"><strong>Evidence</strong><ul>{insight.evidence.slice(0, 3).map((item) => <li key={item.eventId}><button onClick={onSelect}>{item.eventId}</button> {item.label}</li>)}</ul></div>
      <div className="why-box"><strong>Why it matters</strong><p>{insight.whyItMatters}</p></div>
      <details className="caveat"><summary>Interpretation &amp; caveat</summary><p>{insight.caveat}</p>{insight.alternativeExplanation && <p>Alternative: {insight.alternativeExplanation}</p>}</details>
    </article>
  );
}

function PlayerStats({ stats }: { stats: ReturnType<typeof calculatePlayerStats> }) {
  const statItems = [
    ["Involvements", stats.eventInvolvements],
    ["Successful actions", stats.successfulActions],
    ["Progressive passes", stats.progressivePasses],
    ["Pressures / tackles / interceptions", stats.pressureActions],
    ["Recoveries", stats.recoveries],
    ["Shots / goals", `${stats.shots} / ${stats.goals}`],
  ] as const;
  return (
    <div className="player-stat-grid">
      {statItems.map(([label, value]) => <div className="player-stat" key={label}><span>{label}</span><strong>{value}</strong></div>)}
      <p className="player-stat-note">Counts are calculated only from this player's logged synthetic events; they are not a performance rating.</p>
    </div>
  );
}

function TraceSteps({ trace, mode }: { trace: MatchState["traces"][number]; mode: ViewMode }) {
  const stages = [
    { step: "01", title: "Event Intelligence Agent", note: `${trace.eventInputIds.length} validated events · deterministic metrics` },
    { step: "02", title: "Tactical Analysis Agent", note: `${trace.tacticalInterpretation.confidence}% confidence · ${trace.tacticalInterpretation.supportingEventIds.length} supporting events` },
    { step: "03", title: "Narrative & Personalization Agent", note: `${trace.provider === "foundry" ? "Foundry" : "Local demo"} narrative · user-safe summary` },
  ];
  return (
    <div className="trace-steps">
      {stages.map((stage, index) => <div className="trace-step" key={stage.step}><span className={`step-number ${index === 2 ? "step-final" : ""}`}>{stage.step}</span><div><strong>{stage.title}</strong><small>{stage.note}</small></div></div>)}
      <div className="trace-evidence"><strong>Supporting event IDs</strong><p>{trace.tacticalInterpretation.supportingEventIds.join(" · ")}</p></div>
      <div className="trace-calc"><strong>Calculated momentum proxy</strong><span>{trace.calculatedEvidence.momentum}</span></div>
      <div className="trace-explanation"><strong>{mode === "fan" ? "Fan explanation" : "Analyst explanation"}</strong><p>{mode === "fan" ? trace.insight.fanExplanation : trace.insight.analystExplanation}</p></div>
      <p className="safe-rationale">This trace shows evidence and concise rationale only—not hidden chain-of-thought.</p>
    </div>
  );
}

function symbolFor(type: string): string {
  const symbols: Record<string, string> = {
    pass: "↗", progressive_pass: "⇢", carry: "↗", tackle: "⊘", interception: "✳",
    pressure: "⌁", shot: "◎", save: "◉", goal: "✦", foul: "⚑",
    substitution: "⇄", possession_change: "↻", stoppage: "Ⅱ",
  };
  return symbols[type] ?? "·";
}
