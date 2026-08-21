import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 2. Parse body
    const {
      match_id,
      match_map_id, // which map slot (Map 1, Map 2, etc.)
      map_id, // the actual map selected (e.g. Nuketown)
      mode_id, // the mode selected (e.g. Hardpoint)
      start_map, // boolean — set map status to 'live' immediately
    } = await req.json();

    // 3. Validate
    if (!match_id || !match_map_id) {
      return new Response(
        JSON.stringify({ error: "match_id and match_map_id are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!map_id && !mode_id) {
      return new Response(
        JSON.stringify({
          error: "At least one of map_id or mode_id must be provided",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const adminClient = createAdminClient();

    // 4. Verify user
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await adminClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 5. Fetch the match
    const { data: match, error: matchError } = await adminClient
      .from("matches")
      .select("id, status, contrib_id, game_title_id")
      .eq("id", match_id)
      .single();

    if (matchError || !match) {
      return new Response(JSON.stringify({ error: "Match not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6. Match must be scheduled, delayed, or live — not completed
    if (["completed", "cancelled"].includes(match.status)) {
      return new Response(
        JSON.stringify({
          error: `Cannot select map/mode on a ${match.status} match`,
        }),
        {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 7. Check permission
    const isAssigned = match.contrib_id === user.id;
    if (!isAssigned) {
      const { data: roleData } = await adminClient
        .from("user_role_assignments")
        .select("roles(name)")
        .eq("user_id", user.id)
        .is("revoked_at", null)
        .is("comp_instance_id", null);

      const isAdmin = (roleData as { roles: { name: string } }[] | null)?.some(
        (r) => r.roles?.name === "super_admin",
      );

      if (!isAdmin) {
        return new Response(
          JSON.stringify({ error: "You are not assigned to this match" }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    // 8. Fetch the match map slot
    const { data: matchMap, error: mapError } = await adminClient
      .from("match_maps")
      .select("id, map_number, map_id, mode_id, status, match_id")
      .eq("id", match_map_id)
      .single();

    if (mapError || !matchMap) {
      return new Response(
        JSON.stringify({ error: "Match map slot not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 9. Verify map slot belongs to this match
    if (matchMap.match_id !== match_id) {
      return new Response(
        JSON.stringify({ error: "Map slot does not belong to this match" }),
        {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 10. Cannot change a completed or skipped map
    if (["completed", "skipped"].includes(matchMap.status)) {
      return new Response(
        JSON.stringify({
          error: `Cannot modify a ${matchMap.status} map slot`,
        }),
        {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 11. If map_id provided — validate it belongs to this game title
    if (map_id) {
      const { data: mapData } = await adminClient
        .from("maps")
        .select("id, game_title_id, is_active, is_approved")
        .eq("id", map_id)
        .single();

      if (!mapData) {
        return new Response(JSON.stringify({ error: "Map not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (mapData.game_title_id !== match.game_title_id) {
        return new Response(
          JSON.stringify({ error: "Map does not belong to this game title" }),
          {
            status: 422,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      if (!mapData.is_active || !mapData.is_approved) {
        return new Response(
          JSON.stringify({ error: "Map is not active or not yet approved" }),
          {
            status: 422,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    // 12. If mode_id provided — validate it belongs to this game title
    if (mode_id) {
      const { data: modeData } = await adminClient
        .from("modes")
        .select("id, game_title_id, is_active")
        .eq("id", mode_id)
        .single();

      if (!modeData) {
        return new Response(JSON.stringify({ error: "Mode not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (modeData.game_title_id !== match.game_title_id) {
        return new Response(
          JSON.stringify({ error: "Mode does not belong to this game title" }),
          {
            status: 422,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      if (!modeData.is_active) {
        return new Response(JSON.stringify({ error: "Mode is not active" }), {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // 13. If both map and mode provided — validate they are linked
    if (map_id && mode_id) {
      const { data: linkData } = await adminClient
        .from("map_mode_links")
        .select("map_id")
        .eq("map_id", map_id)
        .eq("mode_id", mode_id)
        .single();

      if (!linkData) {
        return new Response(
          JSON.stringify({
            error: "This map and mode combination is not valid",
          }),
          {
            status: 422,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    // 14. Build the update payload
    const updatePayload: Record<string, unknown> = {};
    if (map_id) updatePayload.map_id = map_id;
    if (mode_id) updatePayload.mode_id = mode_id;

    // If start_map is true, mark the map as live
    if (start_map === true) {
      // Make sure no other map is currently live for this match
      const { data: liveMaps } = await adminClient
        .from("match_maps")
        .select("id, map_number")
        .eq("match_id", match_id)
        .eq("status", "live");

      if (liveMaps && liveMaps.length > 0) {
        return new Response(
          JSON.stringify({
            error: "Another map is already live for this match",
            live_map_number: liveMaps[0].map_number,
          }),
          {
            status: 422,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      updatePayload.status = "live";
      updatePayload.started_at = new Date().toISOString();
    }

    // 15. Update the match map slot
    const { error: updateError } = await adminClient
      .from("match_maps")
      .update(updatePayload)
      .eq("id", match_map_id);

    if (updateError) throw updateError;

    // 16. Log events for map/mode selection
    const eventInserts = [];

    if (map_id) {
      eventInserts.push({
        match_id,
        match_map_id,
        event_type: "map_selected",
        triggered_by: user.id,
        meta: { map_id, map_number: matchMap.map_number },
      });
    }

    if (mode_id) {
      eventInserts.push({
        match_id,
        match_map_id,
        event_type: "mode_selected",
        triggered_by: user.id,
        meta: { mode_id, map_number: matchMap.map_number },
      });
    }

    if (eventInserts.length > 0) {
      await adminClient.from("match_events").insert(eventInserts);
    }

    // 17. Fetch updated map slot to return
    const { data: updatedMap } = await adminClient
      .from("match_maps")
      .select("id, map_number, map_id, mode_id, status, started_at")
      .eq("id", match_map_id)
      .single();

    return new Response(
      JSON.stringify({
        success: true,
        match_map: updatedMap,
        message: start_map
          ? `Map ${matchMap.map_number} is now live`
          : `Map ${matchMap.map_number} updated`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("select-map-mode error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", detail: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
