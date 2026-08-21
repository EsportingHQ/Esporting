"use client";

import { createClient } from "@/lib/supabase/client";
import { AlertCircle, CheckCircle, Mail, Shield, User } from "lucide-react";
import { useState } from "react";

type CompetitionOption = {
  id: string;
  name: string;
};

type ContributorRow = {
  user_id: string;
  granted_at: string;
  comp_instance_id: string | null;
  scope_name: string;
  profiles: {
    username: string;
    display_name: string | null;
  } | null;
};

type Props = {
  isAdmin: boolean;
  competitions: CompetitionOption[];
  existingContributors: ContributorRow[];
};

export default function InviteContributorClient({
  isAdmin,
  competitions,
  existingContributors,
}: Props) {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [competitionId, setCompetitionId] = useState(
    isAdmin ? "" : (competitions[0]?.id ?? ""),
  );
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

    if (!isAdmin && !competitionId) {
      setError("Choose a competition for this contributor");
      return;
    }

    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Session expired, please log in again");
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/invite-contributor`,
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
            comp_instance_id: competitionId || null,
          }),
        },
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to send invite");
      }

      setSuccess(data.message ?? `Invite sent to ${email}`);
      setEmail("");
      setDisplayName("");
      if (!isAdmin) setCompetitionId(competitions[0]?.id ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-8 font-body">
      <div>
        <h2 className="font-display font-black text-2xl tracking-wider text-text-primary uppercase">
          Invite Contributor
        </h2>
        <p className="text-xs text-text-muted font-data mt-1 uppercase">
          PROVISION MATCH EVENT OPERATORS
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

      <div className="bg-bg-surface border border-border-line rounded p-6 space-y-4">
        <div className="space-y-1">
          <label className="block text-[10px] font-display font-bold text-text-muted uppercase tracking-wider">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 w-4 h-4 text-text-muted/50" />
            <input
              type="email"
              placeholder="contributor@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full bg-bg-void border border-border-line rounded pl-10 pr-4 py-2 text-sm text-text-primary placeholder-text-muted/30 focus:outline-none focus:border-accent-readout transition-colors"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-[10px] font-display font-bold text-text-muted uppercase tracking-wider">
            Display Name
          </label>
          <div className="relative">
            <User className="absolute left-3 top-3 w-4 h-4 text-text-muted/50" />
            <input
              placeholder="e.g. Match Desk Operator"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className="w-full bg-bg-void border border-border-line rounded pl-10 pr-4 py-2 text-sm text-text-primary placeholder-text-muted/30 focus:outline-none focus:border-accent-readout transition-colors"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-[10px] font-display font-bold text-text-muted uppercase tracking-wider">
            Contributor Scope
          </label>
          <div className="relative">
            <Shield className="absolute left-3 top-3 w-4 h-4 text-text-muted/50" />
            <select
              value={competitionId}
              onChange={(event) => setCompetitionId(event.target.value)}
              className="w-full bg-bg-void border border-border-line rounded pl-10 pr-4 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-readout transition-colors"
            >
              {isAdmin && <option value="">Global contributor</option>}
              {competitions.map((competition) => (
                <option key={competition.id} value={competition.id}>
                  {competition.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          disabled={loading}
          onClick={handleInvite}
          className="bg-accent-readout hover:bg-accent-readout/80 disabled:opacity-50 text-bg-void font-display font-black text-sm uppercase tracking-widest px-6 py-2.5 rounded transition-all cursor-pointer"
        >
          {loading ? "SENDING INVITE..." : "SEND INVITE"}
        </button>
      </div>

      <div className="space-y-4">
        <h3 className="font-display font-bold text-xs uppercase tracking-widest text-text-muted">
          Active Contributors
        </h3>
        <div className="space-y-2">
          {existingContributors.length === 0 && (
            <p className="text-xs text-text-muted italic">
              No contributors invited yet.
            </p>
          )}
          {existingContributors.map((contributor) => (
            <div
              key={`${contributor.user_id}-${contributor.comp_instance_id ?? "global"}`}
              className="bg-bg-surface border border-border-line rounded p-4 flex justify-between items-center text-xs"
            >
              <div>
                <p className="font-medium text-text-primary">
                  {contributor.profiles?.display_name ??
                    contributor.profiles?.username ??
                    "Unknown Contributor"}
                </p>
                <p className="font-data text-text-muted mt-1">
                  {contributor.scope_name}
                </p>
              </div>
              <div className="font-data text-text-muted">
                {new Date(contributor.granted_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
