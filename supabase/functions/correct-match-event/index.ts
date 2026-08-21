import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";

type AdminClient = ReturnType<typeof createAdminClient>;

type MatchRow = {
  id: string;
  status: string;
  contrib_id: string | null;
  match_format: string;
  team_home_id: string | null;
  team_away_id: string | null;
};

type RoleRow = { roles: { name: string } | { name: string }[] | null };

const ALLOWED_REPLACEMENT_EVENTS = [
  "goal",
  "own_goal",
  "penalty_goal",
  "penalty_miss",
  "yellow_card",
  "red_card",
  "half_time",
  "full_time",
  "extra_time",
  "score_update",
  "round_end",
  "map_end",
  "map_selected",
  "mode_selected",
];

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing Authorization header" }, 401);
    }

    const {
      match_id,
      corrected_event_id,
      reason,
      replacement_event_type,
      replacement_team_id,
      replacement_player_id,
      replacement_value,
      replacement_meta,
      replacement_match_map_id,
    } = await req.json();

    if (!match_id || !corrected_event_id) {
      return json(
        { error: "match_id and corrected_event_id are required" },
        400,
      );
    }

    const adminClient = createAdminClient();
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await adminClient.auth.getUser(token);

    if (userError || !user) {
      return json({ error: "Invalid or expired token" }, 401);
    }

    const { data: match, error: matchError } = await adminClient
      .from("matches")
      .select(
        "id, status, contrib_id, match_format, team_home_id, team_away_id",
      )
      .eq("id", match_id)
      .single();

    if (matchError || !match) {
      return json({ error: "Match not found" }, 404);
    }

    const typedMatch = match as MatchRow;
    const hasAccess =
      typedMatch.contrib_id === user.id ||
      (await hasGlobalAdminRole(adminClient, user.id));

    if (!hasAccess) {
      return json({ error: "You are not assigned to this match" }, 403);
    }

    const { data: wrongEvent, error: eventError } = await adminClient
      .from("match_events")
      .select("id, match_id, event_type, is_void, is_correction")
      .eq("id", corrected_event_id)
      .single();

    if (eventError || !wrongEvent) {
      return json({ error: "Event to correct not found" }, 404);
    }

    if (wrongEvent.match_id !== match_id) {
      return json({ error: "Event does not belong to this match" }, 422);
    }

    if (wrongEvent.is_void) {
      return json({ error: "This event has already been voided" }, 422);
    }

    if (wrongEvent.is_correction) {
      return json({ error: "Cannot correct a correction event" }, 422);
    }

    const replacementError = await validateReplacementEvent({
      adminClient,
      match: typedMatch,
      eventType: replacement_event_type ?? null,
      teamId: replacement_team_id ?? null,
      playerId: replacement_player_id ?? null,
      value: replacement_value ?? null,
      matchMapId: replacement_match_map_id ?? null,
    });

    if (replacementError) {
      return json({ error: replacementError }, 422);
    }

    const { data: correctionEvent, error: correctionError } = await adminClient
      .from("match_events")
      .insert({
        match_id,
        event_type: "correction",
        is_correction: true,
        corrected_event_id,
        triggered_by: user.id,
        meta: {
          reason: reason ?? "No reason provided",
          corrected_event_type: wrongEvent.event_type,
        },
        is_void: false,
      })
      .select()
      .single();

    if (correctionError) throw correctionError;

    const { error: voidError } = await adminClient
      .from("match_events")
      .update({ is_void: true })
      .eq("id", corrected_event_id)
      .eq("match_id", match_id);

    if (voidError) throw voidError;

    let replacementEvent = null;
    if (replacement_event_type) {
      const { data: repEvent, error: repError } = await adminClient
        .from("match_events")
        .insert({
          match_id,
          match_map_id: replacement_match_map_id ?? null,
          event_type: replacement_event_type,
          team_id: replacement_team_id ?? null,
          player_id: replacement_player_id ?? null,
          value: replacement_value ?? null,
          meta: replacement_meta ?? {},
          triggered_by: user.id,
          is_correction: false,
          is_void: false,
        })
        .select()
        .single();

      if (repError) throw repError;
      replacementEvent = repEvent;
    }

    await recalculateMatchState(typedMatch, adminClient);

    return json({
      success: true,
      correction_event_id: correctionEvent.id,
      voided_event_id: corrected_event_id,
      replacement_event_id: replacementEvent?.id ?? null,
      match_id,
      timestamp: correctionEvent.created_at,
    });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("correct-match-event error:", error);
    return json({ error: "Internal server error", detail: error.message }, 500);
  }
});

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function hasGlobalAdminRole(adminClient: AdminClient, userId: string) {
  const { data: roleData } = await adminClient
    .from("user_role_assignments")
    .select("roles(name)")
    .eq("user_id", userId)
    .is("revoked_at", null)
    .is("comp_instance_id", null);

  return ((roleData ?? []) as RoleRow[]).some((row) => {
    const roles = Array.isArray(row.roles) ? row.roles : [row.roles];
    return roles.some((role) => role?.name === "super_admin");
  });
}

async function validateReplacementEvent({
  adminClient,
  match,
  eventType,
  teamId,
  playerId,
  value,
  matchMapId,
}: {
  adminClient: AdminClient;
  match: MatchRow;
  eventType: string | null;
  teamId: string | null;
  playerId: string | null;
  value: number | null;
  matchMapId: string | null;
}) {
  if (!eventType) return null;

  if (!ALLOWED_REPLACEMENT_EVENTS.includes(eventType)) {
    return `Invalid replacement_event_type: '${eventType}'`;
  }

  if (eventType === "correction") {
    return "A replacement event cannot be another correction";
  }

  if (
    [
      "goal",
      "own_goal",
      "penalty_goal",
      "penalty_miss",
      "yellow_card",
      "red_card",
    ].includes(eventType)
  ) {
    if (match.match_format !== "head_to_head")
      return "Football replacement events require a head_to_head match";
    if (!teamId) return `replacement_team_id is required for '${eventType}'`;
    if (teamId !== match.team_home_id && teamId !== match.team_away_id) {
      return "replacement_team_id does not belong to this match";
    }
  }

  if (["yellow_card", "red_card"].includes(eventType) && !playerId) {
    return `replacement_player_id is required for '${eventType}'`;
  }

  if (
    [
      "score_update",
      "round_end",
      "map_end",
      "map_selected",
      "mode_selected",
    ].includes(eventType)
  ) {
    if (!matchMapId)
      return `replacement_match_map_id is required for '${eventType}'`;

    const { data: matchMap } = await adminClient
      .from("match_maps")
      .select("id, match_id")
      .eq("id", matchMapId)
      .single();

    if (!matchMap || matchMap.match_id !== match.id) {
      return "replacement_match_map_id does not belong to this match";
    }
  }

  if (eventType === "score_update") {
    if (!teamId) return "replacement_team_id is required for score_update";
    if (teamId !== match.team_home_id && teamId !== match.team_away_id) {
      return "replacement_team_id does not belong to this match";
    }
    if (value === null || value < 0)
      return "replacement_value must be a non-negative number for score_update";
  }

  return null;
}

async function recalculateMatchState(
  match: MatchRow,
  adminClient: AdminClient,
) {
  if (match.match_format === "battle_royale") return;

  if (match.match_format === "head_to_head") {
    await recalculateFootballScore(match, adminClient);
    if (await hasShooterScoringEvents(match.id, adminClient)) {
      await recalculateShooterMaps(match, adminClient);
    }
  }
}

async function hasShooterScoringEvents(
  matchId: string,
  adminClient: AdminClient,
) {
  const { count } = await adminClient
    .from("match_events")
    .select("id", { count: "exact", head: true })
    .eq("match_id", matchId)
    .in("event_type", ["score_update", "map_end"])
    .eq("is_void", false);

  return (count ?? 0) > 0;
}

async function recalculateFootballScore(
  match: MatchRow,
  adminClient: AdminClient,
) {
  const { data: goalEvents } = await adminClient
    .from("match_events")
    .select("id, event_type, team_id, value, sequence_no")
    .eq("match_id", match.id)
    .in("event_type", ["goal", "penalty_goal", "own_goal"])
    .eq("is_void", false)
    .order("sequence_no", { ascending: true });

  let homeGoals = 0;
  let awayGoals = 0;

  for (const event of goalEvents ?? []) {
    const value = Number(event.value ?? 1);
    if (event.event_type === "own_goal") {
      if (event.team_id === match.team_home_id) awayGoals += value;
      if (event.team_id === match.team_away_id) homeGoals += value;
      continue;
    }

    if (event.team_id === match.team_home_id) homeGoals += value;
    if (event.team_id === match.team_away_id) awayGoals += value;
  }

  const { data: mapTotals } = await adminClient
    .from("match_maps")
    .select("id, map_winner, status")
    .eq("match_id", match.id)
    .eq("status", "completed");

  const homeMapsWon = (mapTotals ?? []).filter(
    (map) => map.map_winner === "home",
  ).length;
  const awayMapsWon = (mapTotals ?? []).filter(
    (map) => map.map_winner === "away",
  ).length;
  const lastEventId = await getLastNonVoidEventId(match.id, adminClient);

  await adminClient.from("match_scores").upsert(
    {
      match_id: match.id,
      home_current_score: homeGoals,
      away_current_score: awayGoals,
      home_maps_won: homeMapsWon,
      away_maps_won: awayMapsWon,
      score_breakdown: {
        home_goals: homeGoals,
        away_goals: awayGoals,
      },
      last_event_id: lastEventId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "match_id" },
  );

  if (match.status === "completed") {
    await adminClient
      .from("matches")
      .update({
        winner_team_id:
          homeGoals > awayGoals
            ? match.team_home_id
            : awayGoals > homeGoals
              ? match.team_away_id
              : null,
      })
      .eq("id", match.id);
  }
}

async function recalculateShooterMaps(
  match: MatchRow,
  adminClient: AdminClient,
) {
  const { data: maps } = await adminClient
    .from("match_maps")
    .select("id, map_number, status, started_at")
    .eq("match_id", match.id)
    .order("map_number", { ascending: true });

  if (!maps || maps.length === 0) return;

  const scoreByMap = new Map<string, { home: number; away: number }>();
  for (const map of maps) {
    scoreByMap.set(map.id, { home: 0, away: 0 });
  }

  const { data: scoreEvents } = await adminClient
    .from("match_events")
    .select("match_map_id, team_id, value, sequence_no")
    .eq("match_id", match.id)
    .eq("event_type", "score_update")
    .eq("is_void", false)
    .order("sequence_no", { ascending: true });

  for (const event of scoreEvents ?? []) {
    if (!event.match_map_id) continue;
    const score = scoreByMap.get(event.match_map_id);
    if (!score) continue;

    if (event.team_id === match.team_home_id)
      score.home = Number(event.value ?? 0);
    if (event.team_id === match.team_away_id)
      score.away = Number(event.value ?? 0);
  }

  const { data: mapEndEvents } = await adminClient
    .from("match_events")
    .select("match_map_id, meta, created_at, sequence_no")
    .eq("match_id", match.id)
    .eq("event_type", "map_end")
    .eq("is_void", false)
    .order("sequence_no", { ascending: true });

  const mapEndByMap = new Map<
    string,
    { meta: Record<string, unknown>; created_at: string | null }
  >();
  for (const event of mapEndEvents ?? []) {
    if (event.match_map_id) {
      mapEndByMap.set(event.match_map_id, {
        meta: (event.meta ?? {}) as Record<string, unknown>,
        created_at: event.created_at,
      });
    }
  }

  let homeMapsWon = 0;
  let awayMapsWon = 0;
  let liveMapId: string | null = null;
  let displayScore = { home: 0, away: 0 };

  for (const map of maps) {
    const score = scoreByMap.get(map.id) ?? { home: 0, away: 0 };
    const endEvent = mapEndByMap.get(map.id);
    const mapWinner =
      score.home > score.away
        ? "home"
        : score.away > score.home
          ? "away"
          : "draw";

    const updatePayload: Record<string, unknown> = {
      home_score: score.home,
      away_score: score.away,
    };

    if (endEvent) {
      updatePayload.status = "completed";
      updatePayload.map_winner = mapWinner;
      updatePayload.ended_at = endEvent.created_at;
      updatePayload.duration_seconds = endEvent.meta.duration_seconds ?? null;
      if (mapWinner === "home") homeMapsWon += 1;
      if (mapWinner === "away") awayMapsWon += 1;
    } else if (map.status === "completed") {
      updatePayload.status = map.started_at ? "live" : "pending";
      updatePayload.map_winner = null;
      updatePayload.ended_at = null;
      updatePayload.duration_seconds = null;
    }

    if (
      updatePayload.status === "live" ||
      (!updatePayload.status && map.status === "live")
    ) {
      liveMapId = map.id;
      displayScore = score;
    }

    await adminClient.from("match_maps").update(updatePayload).eq("id", map.id);
  }

  if (!liveMapId) {
    const latestPlayedMap = [...maps].reverse().find((map) => {
      const score = scoreByMap.get(map.id);
      return score && (score.home > 0 || score.away > 0);
    });
    if (latestPlayedMap) {
      liveMapId = latestPlayedMap.id;
      displayScore = scoreByMap.get(latestPlayedMap.id) ?? displayScore;
    }
  }

  const lastEventId = await getLastNonVoidEventId(match.id, adminClient);

  await adminClient.from("match_scores").upsert(
    {
      match_id: match.id,
      current_map_id: liveMapId,
      home_current_score: displayScore.home,
      away_current_score: displayScore.away,
      home_maps_won: homeMapsWon,
      away_maps_won: awayMapsWon,
      score_breakdown: {
        home_score: displayScore.home,
        away_score: displayScore.away,
      },
      last_event_id: lastEventId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "match_id" },
  );

  const matchUpdate: Record<string, unknown> = {
    home_maps_won: homeMapsWon,
    away_maps_won: awayMapsWon,
  };

  if (match.status === "completed") {
    matchUpdate.winner_team_id =
      homeMapsWon > awayMapsWon
        ? match.team_home_id
        : awayMapsWon > homeMapsWon
          ? match.team_away_id
          : null;
  }

  await adminClient.from("matches").update(matchUpdate).eq("id", match.id);
}

async function getLastNonVoidEventId(
  matchId: string,
  adminClient: AdminClient,
) {
  const { data } = await adminClient
    .from("match_events")
    .select("id")
    .eq("match_id", matchId)
    .eq("is_void", false)
    .order("sequence_no", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.id ?? null;
}
