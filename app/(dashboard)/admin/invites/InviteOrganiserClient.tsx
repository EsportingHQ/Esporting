"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AlertCircle, CheckCircle, Mail, User, Shield } from "lucide-react";

export type OrganiserRow = {
  user_id: string;
  granted_at: string;
  profiles: { username: string; display_name: string | null } | null;
};

type Props = {
  existingOrganisers: OrganiserRow[];
};

export default function InviteOrganiserClient({ existingOrganisers }: Props) {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [organisation, setOrganisation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleInvite() {
    setError(null);
    setSuccess(null);

    if (!email) {
      setError("Email is required");
      return;
    }

    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token)
        throw new Error("Session expired, please log in again");

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/invite-organiser`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            display_name: displayName || null,
            organisation: organisation || null,
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send invite");

      setSuccess(`Invite sent successfully to ${email}`);
      setEmail("");
      setDisplayName("");
      setOrganisation("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl space-y-8 font-body">
      <div>
        <h2 className="font-display font-black text-2xl tracking-wider text-text-primary uppercase">
          Invite Organiser
        </h2>
        <p className="text-xs text-text-muted font-data mt-1 uppercase">
          PROVISION CREDENTIALS FOR TOURNAMENT ORGANISERS
        </p>
      </div>

      {error && (
        <div className="bg-state-loss/10 border border-state-loss/30 text-state-loss px-4 py-3 rounded text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="bg-state-win/10 border border-state-win/30 text-state-win px-4 py-3 rounded text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Invite Form */}
      <div className="bg-bg-surface border border-border-line rounded p-6 space-y-4">
        <div className="space-y-1">
          <label className="block text-[10px] font-display font-bold text-text-muted uppercase tracking-wider">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 w-4 h-4 text-text-muted/50" />
            <input
              type="email"
              placeholder="organiser@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-bg-void border border-border-line rounded pl-10 pr-4 py-2 text-sm text-text-primary placeholder-text-muted/30 focus:outline-none focus:border-accent-readout transition-colors"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-[10px] font-display font-bold text-text-muted uppercase tracking-wider">
            Display Name (Optional)
          </label>
          <div className="relative">
            <User className="absolute left-3 top-3 w-4 h-4 text-text-muted/50" />
            <input
              placeholder="e.g. Gbolahan Adekunle"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-bg-void border border-border-line rounded pl-10 pr-4 py-2 text-sm text-text-primary placeholder-text-muted/30 focus:outline-none focus:border-accent-readout transition-colors"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-[10px] font-display font-bold text-text-muted uppercase tracking-wider">
            Organisation (Optional)
          </label>
          <div className="relative">
            <Shield className="absolute left-3 top-3 w-4 h-4 text-text-muted/50" />
            <input
              placeholder="e.g. UI eSports Club"
              value={organisation}
              onChange={(e) => setOrganisation(e.target.value)}
              className="w-full bg-bg-void border border-border-line rounded pl-10 pr-4 py-2 text-sm text-text-primary placeholder-text-muted/30 focus:outline-none focus:border-accent-readout transition-colors"
            />
          </div>
        </div>

        <div className="pt-2">
          <button
            disabled={loading}
            onClick={handleInvite}
            className="bg-accent-readout hover:bg-accent-readout/80 disabled:opacity-50 text-bg-void font-display font-black text-sm uppercase tracking-widest px-6 py-2.5 rounded transition-all cursor-pointer"
          >
            {loading ? "SENDING TELEMETRY..." : "SEND INVITE"}
          </button>
        </div>
      </div>

      {/* Existing Organisers */}
      <div className="space-y-4">
        <h3 className="font-display font-bold text-xs uppercase tracking-widest text-text-muted">
          Active Organisers
        </h3>
        <div className="space-y-2">
          {existingOrganisers.length === 0 && (
            <p className="text-xs text-text-muted italic">
              No organisers invited yet.
            </p>
          )}
          {existingOrganisers.map((org) => (
            <div
              key={org.user_id}
              className="bg-bg-surface border border-border-line rounded p-4 flex justify-between items-center text-xs"
            >
              <div className="font-medium text-text-primary">
                {org.profiles?.display_name ??
                  org.profiles?.username ??
                  "Unknown Operator"}
              </div>
              <div className="font-data text-text-muted">
                {new Date(org.granted_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
