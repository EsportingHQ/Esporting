import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

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
      // Competition to register into (required)
      comp_instance_id,

      // Team — either existing or new
      team_id, // pass this to register an existing team
      team_name, // pass this to create a new team
      team_short_code,
      team_logo_url,
      team_country,

      // Players to register (optional at registration time)
      // Array of player objects:
      // {
      //   player_id,        // existing player (optional)
      //   gamertag,         // required if no player_id
      //   real_name,        // optional
      //   country,          // optional
      //   game_title_slugs  // which games this player competes in
      //                     // e.g. ['codm-mp', 'codm-br']
      // }
      players,
    } = await req.json();

    // 3. Validate required fields
    if (!comp_instance_id) {
      return new Response(
        JSON.stringify({ error: "comp_instance_id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!team_id && !team_name) {
      return new Response(
        JSON.stringify({ error: "Either team_id or team_name is required" }),
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

    // 5. Check permission — organiser of this comp or super_admin
    const { data: roleData } = await adminClient
      .from("user_role_assignments")
      .select("roles(name)")
      .eq("user_id", user.id)
      .is("revoked_at", null)
      .is("comp_instance_id", null);

    const userRoles =
      (roleData as { roles: { name: string } }[] | null)?.map(
        (r) => r.roles?.name,
      ) ?? [];

    const isAdmin = userRoles.includes("super_admin");
    const isOrganiser = userRoles.includes("organiser");

    if (!isAdmin && !isOrganiser) {
      return new Response(
        JSON.stringify({
          error: "Only organisers and admins can register teams",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 6. Fetch and validate the competition instance
    const { data: instance, error: instanceError } = await adminClient
      .from("comp_instances")
      .select("id, name, status, organiser_id")
      .eq("id", comp_instance_id)
      .is("deleted_at", null)
      .single();

    if (instanceError || !instance) {
      return new Response(JSON.stringify({ error: "Competition not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Organisers can only register teams in their own competitions
    if (isOrganiser && !isAdmin && instance.organiser_id !== user.id) {
      return new Response(
        JSON.stringify({
          error: "You are not the organiser of this competition",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Competition must be in draft or registration status
    if (!["draft", "registration"].includes(instance.status)) {
      return new Response(
        JSON.stringify({
          error: `Cannot register teams in a '${instance.status}' competition`,
          hint: "Competition must be in 'draft' or 'registration' status",
        }),
        {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 7. Resolve the team
    let resolvedTeamId = team_id;

    if (!team_id && team_name) {
      const teamSlug = slugify(team_name);

      // Check if team already exists by slug
      const { data: existingTeam } = await adminClient
        .from("teams")
        .select("id, name, slug")
        .eq("slug", teamSlug)
        .is("deleted_at", null)
        .single();

      if (existingTeam) {
        // Team exists — use it
        resolvedTeamId = existingTeam.id;
      } else {
        // Create a new team
        const { data: newTeam, error: teamError } = await adminClient
          .from("teams")
          .insert({
            name: team_name,
            slug: teamSlug,
            short_code: team_short_code ?? null,
            logo_url: team_logo_url ?? null,
            country: team_country ?? null,
            created_by: user.id,
          })
          .select()
          .single();

        if (teamError) throw teamError;
        resolvedTeamId = newTeam.id;
      }
    }

    // 8. Verify team exists if team_id was passed directly
    if (team_id) {
      const { data: teamCheck } = await adminClient
        .from("teams")
        .select("id")
        .eq("id", team_id)
        .is("deleted_at", null)
        .single();

      if (!teamCheck) {
        return new Response(JSON.stringify({ error: "Team not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // 9. Check team isn't already registered in this competition
    const { data: existingReg } = await adminClient
      .from("comp_registrations")
      .select("id, status")
      .eq("comp_instance_id", comp_instance_id)
      .eq("team_id", resolvedTeamId)
      .single();

    if (existingReg) {
      return new Response(
        JSON.stringify({
          error: "Team is already registered in this competition",
          registration_status: existingReg.status,
        }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 10. Register the team into the competition
    const { data: registration, error: regError } = await adminClient
      .from("comp_registrations")
      .insert({
        comp_instance_id,
        team_id: resolvedTeamId,
        status: "approved", // auto-approve since organiser is registering
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (regError) throw regError;

    // 11. Get the game titles covered in this competition
    const { data: compGames } = await adminClient
      .from("comp_game_titles")
      .select("game_title_id, game_titles(id, slug, name)")
      .eq("comp_instance_id", comp_instance_id);

    type GameTitle = { id: string; slug: string; name: string };

    const compGameMap = new Map<string, GameTitle>(
      (compGames ?? []).map(
        (cg: { game_title_id: string; game_titles: GameTitle }) => [
          cg.game_titles.slug,
          cg.game_titles,
        ],
      ),
    );

    // 12. Process players if provided
    const processedPlayers = [];

    if (players && Array.isArray(players) && players.length > 0) {
      for (const playerInput of players) {
        const {
          player_id,
          gamertag,
          real_name,
          country,
          game_title_slugs: playerGameSlugs,
        } = playerInput;

        if (!player_id && !gamertag) {
          continue; // skip invalid player entries
        }

        // Resolve or create the player
        let resolvedPlayerId = player_id;

        if (!player_id && gamertag) {
          // Check if player with this gamertag already exists
          const { data: existingPlayer } = await adminClient
            .from("players")
            .select("id, gamertag")
            .eq("gamertag", gamertag)
            .is("deleted_at", null)
            .single();

          if (existingPlayer) {
            resolvedPlayerId = existingPlayer.id;
          } else {
            // Create new player
            const { data: newPlayer, error: playerError } = await adminClient
              .from("players")
              .insert({
                gamertag,
                real_name: real_name ?? null,
                country: country ?? null,
              })
              .select()
              .single();

            if (playerError) throw playerError;
            resolvedPlayerId = newPlayer.id;
          }
        }

        // Add player to team roster if not already on it
        const { data: existingRoster } = await adminClient
          .from("team_rosters")
          .select("id")
          .eq("team_id", resolvedTeamId)
          .eq("player_id", resolvedPlayerId)
          .is("left_at", null)
          .single();

        if (!existingRoster) {
          await adminClient.from("team_rosters").insert({
            team_id: resolvedTeamId,
            player_id: resolvedPlayerId,
            role: "player",
            joined_at: new Date().toISOString(),
          });
        }

        // Assign player to game titles within this competition
        const gameAssignments = [];

        if (playerGameSlugs && Array.isArray(playerGameSlugs)) {
          for (const gameSlug of playerGameSlugs) {
            const gameTitle = compGameMap.get(gameSlug) as
              GameTitle | undefined;

            if (!gameTitle) {
              // Game not covered in this competition — skip silently
              continue;
            }

            // Check if assignment already exists
            const { data: existingAssignment } = await adminClient
              .from("player_game_assignments")
              .select("id")
              .eq("comp_instance_id", comp_instance_id)
              .eq("team_id", resolvedTeamId)
              .eq("player_id", resolvedPlayerId)
              .eq("game_title_id", gameTitle.id)
              .single();

            if (!existingAssignment) {
              gameAssignments.push({
                comp_instance_id,
                team_id: resolvedTeamId,
                player_id: resolvedPlayerId,
                game_title_id: gameTitle.id,
                assigned_by: user.id,
              });
            }
          }

          if (gameAssignments.length > 0) {
            await adminClient
              .from("player_game_assignments")
              .insert(gameAssignments);
          }
        }

        processedPlayers.push({
          player_id: resolvedPlayerId,
          gamertag: gamertag ?? "existing player",
          game_assignments: playerGameSlugs ?? [],
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        registration: {
          id: registration.id,
          comp_instance_id,
          team_id: resolvedTeamId,
          status: registration.status,
        },
        players_registered: processedPlayers,
        message: `Team registered successfully in '${instance.name}'`,
      }),
      {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("register-team error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", detail: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
