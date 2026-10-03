import {
  CalculatedMetricsSchema,
  EventSchema,
  MatchStateSchema,
  type CalculatedMetrics,
  type EventType,
  type MatchEvent,
  type MatchState,
  type Player,
} from "@/lib/schemas";

export const teams = [
  { id: "team_northbridge", name: "Northbridge FC", color: "#35c4aa" },
  { id: "team_harbor", name: "Harbor City", color: "#55a8ff" },
] as const;

const firstNames = ["Ari", "Beck", "Cato", "Dara", "Eli", "Finn", "Gray", "Hale", "Ivo", "Jules", "Kai"];
const lastNames = ["Ashford", "Bell", "Cedar", "Dawson", "Ellery", "Farrow", "Grove", "Hollis", "Ivory", "Juniper", "Kendall"];
const positions = ["GK", "DF", "DF", "DF", "DF", "MF", "MF", "MF", "MF", "FW", "FW"] as const;

export const players: Player[] = teams.flatMap((team, teamIndex) =>
  firstNames.map((first, index) => ({
    id: `player_${teamIndex === 0 ? "northbridge" : "harbor"}_${String(index + 1).padStart(2, "0")}`,
    name: `${first} ${lastNames[(index + teamIndex * 3) % lastNames.length]}`,
    teamId: team.id,
    position: positions[index],
    number: index + 1,
  })),
);

const harborId = teams[1].id;
const northId = teams[0].id;
const harborPlayers = players.filter((player) => player.teamId === harborId);
const northPlayers = players.filter((player) => player.teamId === northId);

function event(
  id: number,
  minute: number,
  teamId: string,
  player: Player,
  type: EventType,
  description: string,
  x: number,
  y: number,
  outcome: MatchEvent["outcome"] = "neutral",
): MatchEvent {
  return EventSchema.parse({
    id: `evt_${String(id).padStart(4, "0")}`,
    minute,
    teamId,
    playerId: player.id,
    type,
    description,
    x,
    y,
    outcome,
    synthetic: true,
  });
}

const openingEvents: MatchEvent[] = [
  event(1, 17, northId, northPlayers[10], "goal", "Northbridge score in the first half", 98, 48, "successful"),
  event(2, 34, harborId, harborPlayers[10], "goal", "Harbor City equalize before the break", 98, 52, "successful"),
  event(3, 38, northId, northPlayers[5], "pass", "Short pass into midfield", 43, 50, "successful"),
  event(4, 39, harborId, harborPlayers[6], "pressure", "Pressure applied in the middle third", 52, 43),
  event(5, 40, northId, northPlayers[7], "carry", "Carries the ball toward the right channel", 57, 34, "successful"),
  event(6, 41, harborId, harborPlayers[2], "tackle", "Wins a challenge near the touchline", 61, 26, "successful"),
  event(7, 42, harborId, harborPlayers[5], "progressive_pass", "Progressive pass breaks into the final third", 71, 45, "successful"),
  event(8, 43, harborId, harborPlayers[9], "shot", "Shot from the edge of the area", 86, 47, "unsuccessful"),
  event(9, 44, northId, northPlayers[0], "save", "Goalkeeper gathers the attempt", 94, 50, "successful"),
  event(10, 45, northId, northPlayers[6], "pass", "Northbridge retain possession under pressure", 48, 55, "successful"),
  event(11, 46, harborId, harborPlayers[7], "pressure", "Harbor City presses high after losing the ball", 69, 61),
  event(12, 46, harborId, harborPlayers[4], "interception", "Intercepts a pass in the attacking half", 72, 57, "successful"),
  event(13, 46, harborId, harborPlayers[8], "progressive_pass", "Forward pass finds space between the lines", 78, 42, "successful"),
  event(14, 46, northId, northPlayers[2], "foul", "Northbridge stop the developing counter", 80, 45),
];

const sequence: Array<{
  team: 0 | 1;
  player: number;
  type: EventType;
  description: string;
  x: number;
  y: number;
  outcome?: MatchEvent["outcome"];
}> = [
  { team: 1, player: 7, type: "pressure", description: "Harbor City trigger a coordinated high press", x: 68, y: 45 },
  { team: 1, player: 3, type: "interception", description: "Harbor City recover possession high up the pitch", x: 75, y: 55, outcome: "successful" },
  { team: 1, player: 8, type: "progressive_pass", description: "A forward pass advances play into the danger area", x: 82, y: 49, outcome: "successful" },
  { team: 1, player: 9, type: "shot", description: "Harbor City test the goalkeeper from a promising position", x: 89, y: 48, outcome: "unsuccessful" },
  { team: 0, player: 0, type: "save", description: "Northbridge goalkeeper turns the shot away", x: 96, y: 50, outcome: "successful" },
  { team: 1, player: 5, type: "pressure", description: "Harbor City win the ball back quickly", x: 73, y: 43 },
  { team: 1, player: 8, type: "progressive_pass", description: "Another progressive pass reaches the attacking channel", x: 84, y: 39, outcome: "successful" },
  { team: 1, player: 10, type: "goal", description: "Harbor City finish a synthetic attacking sequence", x: 98, y: 52, outcome: "successful" },
  { team: 0, player: 6, type: "possession_change", description: "Northbridge restart from the centre after the goal", x: 50, y: 50 },
  { team: 0, player: 7, type: "carry", description: "Northbridge carry into the middle third", x: 57, y: 47, outcome: "successful" },
  { team: 1, player: 6, type: "tackle", description: "Harbor City challenge for the ball in midfield", x: 61, y: 52, outcome: "successful" },
  { team: 0, player: 5, type: "pass", description: "Northbridge switch play toward the left", x: 45, y: 34, outcome: "successful" },
  { team: 0, player: 9, type: "shot", description: "Northbridge try a long-range effort", x: 76, y: 56, outcome: "unsuccessful" },
  { team: 1, player: 0, type: "save", description: "Harbor City goalkeeper collects the attempt", x: 96, y: 50, outcome: "successful" },
  { team: 0, player: 4, type: "substitution", description: "Northbridge make a synthetic substitution", x: 43, y: 53 },
  { team: 1, player: 2, type: "foul", description: "Harbor City concede a free kick near midfield", x: 56, y: 48 },
  { team: 0, player: 8, type: "progressive_pass", description: "Northbridge move the ball through the centre", x: 67, y: 50, outcome: "successful" },
  { team: 0, player: 10, type: "shot", description: "Northbridge create a chance from the right channel", x: 87, y: 42, outcome: "unsuccessful" },
  { team: 1, player: 0, type: "save", description: "Harbor City goalkeeper makes a routine save", x: 97, y: 48, outcome: "successful" },
  { team: 1, player: 7, type: "pressure", description: "Harbor City close down the restart", x: 71, y: 51 },
  { team: 0, player: 2, type: "interception", description: "Northbridge intercept a pass in their own half", x: 37, y: 45, outcome: "successful" },
  { team: 0, player: 6, type: "pass", description: "Northbridge keep the ball moving across midfield", x: 49, y: 58, outcome: "successful" },
  { team: 1, player: 5, type: "tackle", description: "Harbor City recover possession in midfield", x: 57, y: 57, outcome: "successful" },
  { team: 1, player: 9, type: "carry", description: "Harbor City drive forward through the centre", x: 74, y: 50, outcome: "successful" },
  { team: 1, player: 10, type: "shot", description: "Harbor City shoot from inside the area", x: 91, y: 51, outcome: "unsuccessful" },
  { team: 0, player: 0, type: "save", description: "Northbridge goalkeeper saves low to the right", x: 96, y: 53, outcome: "successful" },
  { team: 0, player: 1, type: "stoppage", description: "Brief stoppage before play resumes", x: 42, y: 50 },
  { team: 0, player: 8, type: "progressive_pass", description: "Northbridge find a forward passing lane", x: 70, y: 42, outcome: "successful" },
  { team: 0, player: 10, type: "goal", description: "Northbridge score after a synthetic transition", x: 98, y: 49, outcome: "successful" },
  { team: 0, player: 6, type: "possession_change", description: "Harbor City restart after the equalizer", x: 50, y: 50 },
];

export function calculateMetrics(events: MatchEvent[]): CalculatedMetrics {
  const harbor = events.filter((item) => item.teamId === harborId);
  const north = events.filter((item) => item.teamId === northId);
  const count = (list: MatchEvent[], types: EventType[]) => list.filter((item) => types.includes(item.type)).length;
  const shotsNorth = count(north, ["shot"]);
  const shotsHarbor = count(harbor, ["shot"]);
  const high = (list: MatchEvent[]) => list.filter((item) => item.x >= 65).length;
  const pressureNorth = count(north, ["pressure", "tackle", "interception"]);
  const pressureHarbor = count(harbor, ["pressure", "tackle", "interception"]);
  const possessionTotal = north.length + harbor.length || 1;
  const harborAttack = count(harbor, ["pressure", "interception", "progressive_pass"]);
  const northAttack = count(north, ["pressure", "interception", "progressive_pass"]);
  const possessionNorth = Math.round((north.length / possessionTotal) * 100);
  const momentum = Math.max(-100, Math.min(100, (harborAttack - northAttack) * 6));
  return CalculatedMetricsSchema.parse({
    possession: { northbridge: possessionNorth, harbor: 100 - possessionNorth },
    shots: { northbridge: shotsNorth, harbor: shotsHarbor },
    shotQualityProxy: {
      northbridge: Number((north.filter((item) => item.type === "shot").reduce((total, item) => total + Math.max(0.1, item.x / 100), 0)).toFixed(2)),
      harbor: Number((harbor.filter((item) => item.type === "shot").reduce((total, item) => total + Math.max(0.1, item.x / 100), 0)).toFixed(2)),
    },
    pressureActions: { northbridge: pressureNorth, harbor: pressureHarbor },
    territory: {
      northbridge: Math.round((high(north) / (north.length || 1)) * 100),
      harbor: Math.round((high(harbor) / (harbor.length || 1)) * 100),
    },
    momentum,
  });
}

export function createInitialState(): MatchState {
  return MatchStateSchema.parse({
    match: {
      id: "match_demo_01",
      homeTeam: teams[0],
      awayTeam: teams[1],
      homeScore: 1,
      awayScore: 1,
      minute: 46,
      status: "paused",
    },
    players,
    events: openingEvents,
    metrics: calculateMetrics(openingEvents),
    insights: [],
    traces: [],
    running: false,
    tickCount: 0,
  });
}

export function appendSyntheticTick(state: MatchState): MatchState {
  if (state.match.status === "finished") return state;
  const nextTick = state.tickCount + 1;
  const staged = sequence[(nextTick - 1) % sequence.length];
  const roster = staged.team === 1 ? harborPlayers : northPlayers;
  const nextEvent = event(
    state.events.length + 1,
    Math.min(120, 46 + Math.floor(nextTick / 2)),
    staged.team === 1 ? harborId : northId,
    roster[staged.player],
    staged.type,
    staged.description,
    staged.x,
    staged.y,
    staged.outcome ?? "neutral",
  );
  const events = [...state.events, nextEvent];
  const isGoal = nextEvent.type === "goal";
  const match = {
    ...state.match,
    minute: nextEvent.minute,
    homeScore: state.match.homeScore + (isGoal && staged.team === 0 ? 1 : 0),
    awayScore: state.match.awayScore + (isGoal && staged.team === 1 ? 1 : 0),
    status: nextEvent.minute >= 120 ? "finished" as const : state.match.status,
  };
  return MatchStateSchema.parse({
    ...state,
    match,
    events,
    metrics: calculateMetrics(events),
    tickCount: nextTick,
    running: match.status === "live" && state.running,
  });
}
