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
      email, // email to invite
      display_name, // their name (pre-fills profile)
      organisation, // their org name (stored in metadata)
    } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: "email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: "Invalid email format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createAdminClient();

    // 3. Verify user
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

    // 4. Must be super_admin — only admins can invite organisers
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
        JSON.stringify({ error: "Only admins can invite organisers" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 5. Check if user already exists in auth
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u: { email?: string }) => u.email === email,
    );
    const isConfirmed = existingUser?.email_confirmed_at != null;

    if (existingUser && isConfirmed) {
      return new Response(
        JSON.stringify({
          error: `A user with email '${email}' already exists`,
          hint: "Use user management to assign the organiser role to an existing user",
        }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (existingUser && !isConfirmed) {
      // Resend the invite to this same pending user
      const { error: resendError } =
        await adminClient.auth.admin.inviteUserByEmail(email, {
          data: {
            display_name: display_name ?? null,
            organisation: organisation ?? null,
            invited_as: "organiser",
            invited_by: user.id,
          },
          redirectTo: "http://localhost:3000/callback",
        });

      if (resendError) {
        throw resendError;
      }

      return new Response(
        JSON.stringify({
          success: true,
          mode: "invite_resent",
          message: `A new invite link was sent to ${email}`,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 6. Send the invite email via Supabase Auth
    const { data: inviteData, error: inviteError } =
      await adminClient.auth.admin.inviteUserByEmail(email, {
        data: {
          display_name: display_name ?? null,
          organisation: organisation ?? null,
          invited_as: "organiser",
          invited_by: user.id,
        },
        redirectTo: "http://localhost:3000/callback",
      });

    if (inviteError) {
      // Handle rate limit
      if (inviteError.message?.includes("rate limit")) {
        return new Response(
          JSON.stringify({
            error: "Too many invites sent. Please wait before trying again.",
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      throw inviteError;
    }

    // 7. Pre-assign organiser role
    // The user exists in auth now but may not have a profile yet
    // (profile is created when they accept the invite and sign in)
    // We store the role assignment — the profile trigger will complete
    // the setup when they accept

    // Check if profile already exists (it may not until invite is accepted)
    const { data: profileCheck } = await adminClient
      .from("profiles")
      .select("id")
      .eq("id", inviteData.user.id)
      .single();

    if (profileCheck) {
      // Profile exists — assign role now
      const { error: roleAssignError } = await adminClient
        .from("user_role_assignments")
        .insert({
          user_id: inviteData.user.id,
          role_id: (
            await adminClient
              .from("roles")
              .select("id")
              .eq("name", "organiser")
              .single()
          ).data?.id,
          granted_by: user.id,
        });

      if (roleAssignError && roleAssignError.code !== "23505") {
        throw roleAssignError;
      }
    }

    // 8. Return success
    return new Response(
      JSON.stringify({
        success: true,
        invited_user: {
          id: inviteData.user.id,
          email: inviteData.user.email,
          display_name: display_name ?? null,
          organisation: organisation ?? null,
        },
        message: `Invite sent to ${email}. They will receive an email to set up their account.`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("invite-organiser error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", detail: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
