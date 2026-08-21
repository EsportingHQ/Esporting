import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";

const VALID_TRANSITIONS: Record<string, string[]> = {
  scheduled: ["delayed", "live", "cancelled"],
  delayed: ["live", "cancelled"],
  live: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Get auth header
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
    const { match_id, new_status, reason } = await req.json();

    if (!match_id || !new_status) {
      return new Response(
        JSON.stringify({ error: "match_id and new_status are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 3. Use admin client for everything
    const adminClient = createAdminClient();

    // 4. Verify user via Supabase auth API directly
    // This bypasses JWT algorithm verification entirely
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await adminClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({
          error: "Invalid or expired token",
          detail: userError?.message,
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 5. Fetch the match
    const { data: match, error: matchError } = await adminClient
      .from("matches")
      .select("id, status, contrib_id, comp_instance_id")
      .eq("id", match_id)
      .single();

    if (matchError || !match) {
      return new Response(JSON.stringify({ error: "Match not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6. Check permission
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

    // 7. Validate transition
    const allowedNext = VALID_TRANSITIONS[match.status] ?? [];
    if (!allowedNext.includes(new_status)) {
      return new Response(
        JSON.stringify({
          error: `Cannot transition from '${match.status}' to '${new_status}'`,
          current_status: match.status,
          allowed_transitions: allowedNext,
        }),
        {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 8. Build update
    const updateData: Record<string, unknown> = { status: new_status };
    if (new_status === "live") updateData.started_at = new Date().toISOString();
    if (new_status === "completed")
      updateData.ended_at = new Date().toISOString();

    // 9. Update match
    const { error: updateError } = await adminClient
      .from("matches")
      .update(updateData)
      .eq("id", match_id);

    if (updateError) throw updateError;

    // 10. Log status change
    const { error: logError } = await adminClient
      .from("match_status_log")
      .insert({
        match_id,
        old_status: match.status,
        new_status,
        triggered_by: user.id,
        reason: reason ?? null,
      });

    if (logError) throw logError;

    // 11. Success
    return new Response(
      JSON.stringify({
        success: true,
        match_id,
        old_status: match.status,
        new_status,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("trigger-match-status error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", detail: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
