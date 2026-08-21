"use client";

import { useState } from "react";
import { PublicNav } from "@/components/layout/public-nav";
import { NotificationToggle } from "@/components/ui/NotificationToggle";
import { ScoreToast, ToastMessage } from "@/components/ui/ScoreToast";
import { useNotificationPrefs } from "@/hooks/useNotificationPrefs";
import { Bell, ShieldCheck, Check, Sparkles } from "lucide-react";

export default function NotificationSettingsPage() {
  const { prefs, updatePrefs, isLoaded } = useNotificationPrefs();
  const [testToasts, setTestToasts] = useState<ToastMessage[]>([]);
  const [savedFeedback, setSavedFeedback] = useState(false);

  const handleToggle = (key: keyof typeof prefs, val: boolean) => {
    updatePrefs({ [key]: val });
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2000);
  };

  const triggerTestToast = () => {
    const id = `test-toast-${Date.now()}`;
    const newToast: ToastMessage = {
      id,
      gameCode: "FC26",
      homeTeam: "KUTI",
      awayTeam: "BELLO",
      newScore: "2 - 1",
      eventType: "Team Kuti scored!",
      matchId: "1",
      competitionSlug: "ui-esports-league",
    };
    setTestToasts((prev) => [...prev, newToast]);
  };

  const dismissTestToast = (id: string) => {
    setTestToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="flex-1 flex flex-col bg-bg-void text-text-primary">
      <PublicNav />

      {/* Test Toast Overlay */}
      <ScoreToast toasts={testToasts} onDismiss={dismissTestToast} />

      <main className="max-w-4xl w-full mx-auto px-4 py-8 flex-1 space-y-8">
        {/* Header */}
        <div className="border-b border-border-line pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Bell className="w-6 h-6 text-accent-readout" />
              <h1 className="font-display font-black text-3xl tracking-wider uppercase">
                ALERT PREFERENCES
              </h1>
            </div>
            <p className="text-xs text-text-muted font-data mt-1">
              CONFIGURE IN-APP LIVE SCORE TOASTS AND BROADCAST ANNOUNCEMENT
              NOTIFICATIONS
            </p>
          </div>

          {savedFeedback && (
            <span className="text-xs font-data text-state-win flex items-center gap-1.5 bg-state-win/10 px-3 py-1.5 rounded border border-state-win/30">
              <Check className="w-4 h-4" />
              <span>PREFERENCES SAVED</span>
            </span>
          )}
        </div>

        {/* Master Switch Panel */}
        <div className="bg-bg-surface border border-accent-readout/30 rounded p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-border-line pb-4">
            <div>
              <h2 className="font-display font-bold text-base text-accent-readout uppercase">
                FAVORITE SQUADS FILTER
              </h2>
              <p className="text-xs text-text-muted font-body mt-0.5">
                When enabled, live score toasts are strictly limited to squads
                and competitions on your favorites list.
              </p>
            </div>
          </div>

          <NotificationToggle
            id="favorite-teams-only"
            label="FAVORITE SQUADS ONLY"
            description="Suppress alerts for matches not involving your starred teams or leagues"
            checked={prefs.favoriteTeamsOnly}
            onChange={(val) => handleToggle("favoriteTeamsOnly", val)}
          />
        </div>

        {/* Alert Trigger Rules */}
        <div className="bg-bg-surface border border-border-line rounded p-6 space-y-6">
          <h2 className="font-display font-bold text-sm uppercase tracking-wider text-text-primary border-b border-border-line pb-3">
            NOTIFICATION EVENT TRIGGERS
          </h2>

          <div className="divide-y divide-border-line">
            <NotificationToggle
              id="goal-scored"
              label="GOALS & SCORE UPDATES"
              description="Trigger real-time score toasts whenever a goal, point, or map win is recorded in live matches"
              checked={prefs.goalScored}
              onChange={(val) => handleToggle("goalScored", val)}
            />

            <NotificationToggle
              id="match-start"
              label="MATCH KICK-OFF ALERTS"
              description="Notify when a scheduled match shifts status to LIVE"
              checked={prefs.matchStart}
              onChange={(val) => handleToggle("matchStart", val)}
            />

            <NotificationToggle
              id="match-end"
              label="FINAL RESULTS ALERTS"
              description="Receive notifications summarizing final match scores when matches reach COMPLETED status"
              checked={prefs.matchEnd}
              onChange={(val) => handleToggle("matchEnd", val)}
            />

            <NotificationToggle
              id="status-change"
              label="BROADCAST DELAYS & ANNOUNCEMENTS"
              description="Alert on match delays, technical timeouts, and official organizer notes"
              checked={prefs.statusChange}
              onChange={(val) => handleToggle("statusChange", val)}
            />
          </div>
        </div>

        {/* Test Toast Preview Box */}
        <div className="bg-bg-surface border border-border-line rounded p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <div className="flex items-center gap-2 justify-center sm:justify-start">
              <Sparkles className="w-4 h-4 text-accent-favorite" />
              <h3 className="font-display font-bold text-sm uppercase">
                PREVIEW NOTIFICATION TOAST
              </h3>
            </div>
            <p className="text-xs text-text-muted font-body">
              Click the button to send a simulated score toast overlay.
            </p>
          </div>

          <button
            type="button"
            onClick={triggerTestToast}
            className="px-4 py-2 bg-bg-void border border-accent-readout/40 hover:bg-accent-readout/10 text-accent-readout font-display font-bold text-xs uppercase tracking-wider rounded transition-all focus-ring shrink-0"
          >
            TEST TOAST NOTIFICATION
          </button>
        </div>
      </main>
    </div>
  );
}
