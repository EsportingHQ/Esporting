import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";

type AdminClient = ReturnType<typeof createAdminClient>;
type RoleRow = { roles: { name: string } | { name: string }[] | null };
type CompetitionRow = { id: string; name: string; organiser_id: string | null };

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing Authorization header" }, 401);
    }

    const { email, display_name, comp_instance_id } = await req.json();

    if (!email) {
      return json({ error: "email is required" }, 400);
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return json({ error: "Invalid email format" }, 400);
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

    const isAdmin = await hasGlobalAdminRole(adminClient, user.id);
    const competitionId = comp_instance_id ? String(comp_instance_id) : null;

    if (!isAdmin && !competitionId) {
      return json(
        {
          error:
            "comp_instance_id is required for organiser contributor invites",
        },
        400,
      );
    }

    let instance: CompetitionRow | null = null;
    if (competitionId) {
      const { data } = await adminClient
        .from("comp_instances")
        .select("id, name, organiser_id")
        .eq("id", competitionId)
        .single();

      if (!data) {
        return json({ error: "Competition not found" }, 404);
      }

      instance = data as CompetitionRow;

      if (!isAdmin && instance.organiser_id !== user.id) {
        return json(
          { error: "You are not the organiser of this competition" },
          403,
        );
      }
    }

    if (!isAdmin && instance?.organiser_id !== user.id) {
      return json(
        { error: "You are not allowed to invite contributors here" },
        403,
      );
    }

    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (authUser: { email?: string }) =>
        authUser.email?.toLowerCase() === normalizedEmail,
    );

    const redirectTo = `${Deno.env.get("SITE_URL") ?? req.headers.get("origin") ?? "http://localhost:3000"}/callback`;
    const scopeLabel = instance ? instance.name : "all competitions";

    if (existingUser?.email_confirmed_at) {
      await assignContributorRole(adminClient, {
        userId: existingUser.id,
        compInstanceId: competitionId,
        grantedBy: user.id,
      });

      return json({
        success: true,
        mode: "existing_user_assigned",
        contributor_scope: competitionId ? "competition" : "global",
        message: `${normalizedEmail} already has an account and was added as a contributor for ${scopeLabel}`,
      });
    }

    if (existingUser && !existingUser.email_confirmed_at) {
      const { error: resendError } =
        await adminClient.auth.admin.inviteUserByEmail(normalizedEmail, {
          data: {
            display_name: display_name ?? null,
            invited_as: "contributor",
            invited_by: user.id,
            comp_instance_id: competitionId,
          },
          redirectTo,
        });

      if (resendError) throw resendError;

      await assignContributorRole(adminClient, {
        userId: existingUser.id,
        compInstanceId: competitionId,
        grantedBy: user.id,
      });

      return json({
        success: true,
        mode: "invite_resent",
        contributor_scope: competitionId ? "competition" : "global",
        message: `A new invite link was sent to ${normalizedEmail}`,
      });
    }

    const { data: inviteData, error: inviteError } =
      await adminClient.auth.admin.inviteUserByEmail(normalizedEmail, {
        data: {
          display_name: display_name ?? null,
          invited_as: "contributor",
          invited_by: user.id,
          comp_instance_id: competitionId,
        },
        redirectTo,
      });

    if (inviteError) {
      if (inviteError.message?.includes("rate limit")) {
        return json(
          { error: "Too many invites sent. Please wait before trying again." },
          429,
        );
      }
      throw inviteError;
    }

    if (inviteData.user?.id) {
      await assignContributorRole(adminClient, {
        userId: inviteData.user.id,
        compInstanceId: competitionId,
        grantedBy: user.id,
      });
    }

    return json({
      success: true,
      mode: "invited",
      contributor_scope: competitionId ? "competition" : "global",
      invited_user: {
        id: inviteData.user.id,
        email: inviteData.user.email,
      },
      message: `Invite sent to ${normalizedEmail} for ${scopeLabel}`,
    });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("invite-contributor error:", error);
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

async function assignContributorRole(
  adminClient: AdminClient,
  {
    userId,
    compInstanceId,
    grantedBy,
  }: {
    userId: string;
    compInstanceId: string | null;
    grantedBy: string;
  },
) {
  const { data: contributorRole } = await adminClient
    .from("roles")
    .select("id")
    .eq("name", "contributor")
    .single();

  if (!contributorRole?.id) {
    throw new Error("Contributor role not found");
  }

  const { error } = await adminClient.from("user_role_assignments").insert({
    user_id: userId,
    role_id: contributorRole.id,
    comp_instance_id: compInstanceId,
    granted_by: grantedBy,
  });

  if (error && error.code !== "23505") {
    throw error;
  }
}
