// Series rules for head-to-head matches played as a best-of series
// (Bo1 up to Bo99), one "game" per match_maps row.
//
//  1. Before any game starts, the mode (and the map, when the title has a map
//     pool) must be set for EVERY game still to be played.
//  2. Games start in order. Game N can only start once every earlier game has
//     ended.
//  3. Only one game can be live at a time.
//  4. A live game can only end once a score has been entered for BOTH teams.
//
// The edge functions (select-map-mode, post-match-event) enforce the same rules
// on the server. This file drives what the contributor screen enables, locks,
// and explains.

export type SeriesSlot = {
  id: string;
  map_number: number;
  map_id: string | null;
  mode_id: string | null;
  status: string; // 'pending' | 'live' | 'completed' | 'skipped'
  map_winner?: string | null; // 'home' | 'away' | 'draw' | null
};

export type SeriesEvent = {
  match_map_id: string | null;
  event_type: string;
  team_id: string | null;
  is_void?: boolean | null;
};

export type SlotControls = {
  /** Start is enabled for this game. */
  canStart: boolean;
  /** Why Start is locked, in plain words. Null when it is not locked. */
  startLockedReason: string | null;
  /** End is enabled for this game. */
  canEnd: boolean;
  /** Why End is locked, in plain words. Null when it is not locked. */
  endLockedReason: string | null;
  /** Both teams have a saved score for this game. */
  scoresEntered: boolean;
  /** This game has its mode (and map, if required) set. */
  configured: boolean;
};

export type SeriesState = {
  /** Games not yet completed or skipped. */
  remaining: SeriesSlot[];
  /** Remaining games that still lack a mode (or a map when one is required). */
  unconfigured: SeriesSlot[];
  /** Every remaining game is configured. */
  setupComplete: boolean;
  /** The game currently being played, if any. */
  liveSlot: SeriesSlot | null;
  /** Controls for each game, keyed by slot id. */
  controls: Record<string, SlotControls>;
  homeWins: number;
  awayWins: number;
  /** One side has won more than half of the series (e.g. 2 of a best of 3). */
  decided: boolean;
};

export function isDone(slot: Pick<SeriesSlot, 'status'>): boolean {
  return slot.status === 'completed' || slot.status === 'skipped';
}

export function isConfigured(
  slot: Pick<SeriesSlot, 'map_id' | 'mode_id'>,
  needsMap: boolean,
): boolean {
  return Boolean(slot.mode_id) && (!needsMap || Boolean(slot.map_id));
}

/** Both teams have a non-voided score_update saved for this game. */
export function hasBothScores(
  slotId: string,
  events: SeriesEvent[],
  homeTeamId: string | null,
  awayTeamId: string | null,
): boolean {
  if (!homeTeamId || !awayTeamId) return false;
  const scored = new Set(
    events
      .filter(
        (e) =>
          e.match_map_id === slotId &&
          e.event_type === 'score_update' &&
          !e.is_void,
      )
      .map((e) => e.team_id),
  );
  return scored.has(homeTeamId) && scored.has(awayTeamId);
}

export function getSeriesState(input: {
  slots: SeriesSlot[];
  events: SeriesEvent[];
  homeTeamId: string | null;
  awayTeamId: string | null;
  bestOf: number;
  /** True when the game title has a map pool, so every game needs a map too. */
  needsMap: boolean;
  /** MOBA (MLBB): no map/mode choice, the winner is picked at game end and scores are optional. */
  winnerBased?: boolean;
}): SeriesState {
  const { events, homeTeamId, awayTeamId, bestOf, needsMap } = input;
  const winnerBased = input.winnerBased === true;
  const slots = [...input.slots].sort((a, b) => a.map_number - b.map_number);

  const remaining = slots.filter((s) => !isDone(s));
  const unconfigured = winnerBased ? [] : remaining.filter((s) => !isConfigured(s, needsMap));
  const setupComplete = unconfigured.length === 0;
  const liveSlot = slots.find((s) => s.status === 'live') ?? null;

  const homeWins = slots.filter((s) => s.status === 'completed' && s.map_winner === 'home').length;
  const awayWins = slots.filter((s) => s.status === 'completed' && s.map_winner === 'away').length;
  const needed = Math.floor(bestOf / 2) + 1;
  const decided = bestOf > 1 && (homeWins >= needed || awayWins >= needed);

  const controls: Record<string, SlotControls> = {};

  for (const slot of slots) {
    const configured = winnerBased || isConfigured(slot, needsMap);
    const scoresEntered = hasBothScores(slot.id, events, homeTeamId, awayTeamId);
    const firstUnfinishedEarlier = slots.find(
      (s) => s.map_number < slot.map_number && !isDone(s),
    );

    // ---- Start ----
    let canStart = false;
    let startLockedReason: string | null = null;
    if (slot.status === 'pending') {
      if (decided) {
        startLockedReason = 'The series is already decided, so this game is not needed';
      } else if (!setupComplete) {
        const n = unconfigured.length;
        startLockedReason = `Set the ${needsMap ? 'map and mode' : 'mode'} for every game first (${n} still to do)`;
      } else if (firstUnfinishedEarlier) {
        startLockedReason = `Finish Game ${firstUnfinishedEarlier.map_number} first`;
      } else if (liveSlot && liveSlot.id !== slot.id) {
        startLockedReason = `Game ${liveSlot.map_number} is live`;
      } else {
        canStart = true;
      }
    }

    // ---- End ----
    let canEnd = false;
    let endLockedReason: string | null = null;
    if (slot.status === 'live') {
      if (!winnerBased && !scoresEntered) {
        endLockedReason = 'Enter and save the score for both teams to end this game';
      } else {
        canEnd = true;
      }
    }

    controls[slot.id] = {
      canStart,
      startLockedReason,
      canEnd,
      endLockedReason,
      scoresEntered,
      configured,
    };
  }


  return {
    remaining,
    unconfigured,
    setupComplete,
    liveSlot,
    controls,
    homeWins,
    awayWins,
    decided,
  };
}
