'use client';

import { useState } from 'react';
import { PublicNav } from '@/components/layout/public-nav';
import { NotificationToggle } from '@/components/ui/NotificationToggle';
import { ScoreToast, ToastMessage } from '@/components/ui/ScoreToast';
import { useNotificationPrefs } from '@/hooks/useNotificationPrefs';
import { Bell, Check, Sparkles } from 'lucide-react';

export default function NotificationSettingsPage() {
  const { prefs, updatePrefs } = useNotificationPrefs();
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
      gameCode: 'FC26',
      homeTeam: 'KUTI',
      awayTeam: 'BELLO',
      newScore: '2 - 1',
      eventType: 'Team Kuti scored!',
      matchId: '1',
      competitionSlug: 'ui-esports-league',
    };
    setTestToasts((prev) => [...prev, newToast]);
  };

  const dismissTestToast = (id: string) => {
    setTestToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="flex-1 flex flex-col bg-bg-void text-text-primary min-h-screen relative overflow-x-hidden">
      {/* Ambient background glow */}
      <div className="gradient-mesh pointer-events-none" aria-hidden="true">
        <div className="mesh-orb" />
      </div>

      <PublicNav />

      {/* Test Toast Overlay */}
      <ScoreToast toasts={testToasts} onDismiss={dismissTestToast} />

      <main className="max-w-4xl w-full mx-auto px-4 sm:px-6 py-10 flex-1 space-y-8 relative z-10">
        {/* Header */}
        <div className="border-b border-white/[0.08] pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-primary/10 border border-accent-primary/25 text-accent-glow text-xs font-display font-semibold mb-2">
              <Bell className="w-3.5 h-3.5" />
              <span>NOTIFICATION PREFERENCES</span>
            </div>
            <h1 className="font-display font-black text-3xl sm:text-4xl text-white tracking-tight">
              Alert Settings
            </h1>
            <p className="text-sm text-text-muted font-body">
              Configure real-time score toasts, match start triggers, and official league bulletins.
            </p>
          </div>

          {savedFeedback && (
            <span className="text-xs font-display font-bold text-state-win flex items-center gap-1.5 bg-state-win/10 px-3.5 py-2 rounded-full border border-state-win/30 shadow-sm">
              <Check className="w-4 h-4" />
              <span>Preferences Saved</span>
            </span>
          )}
        </div>

        {/* Master Switch Panel */}
        <div className="glass-strong border border-accent-primary/30 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl backdrop-blur-xl">
          <div className="border-b border-white/[0.08] pb-4">
            <h2 className="font-display font-bold text-base text-accent-glow">
              Favorite Squads Filter
            </h2>
            <p className="text-xs text-text-muted font-body mt-1">
              When enabled, score toasts and alerts will only fire for teams and competitions on your starred list.
            </p>
          </div>

          <NotificationToggle
            id="favorite-teams-only"
            label="Favorite squads only"
            description="Suppress alerts for matches not involving your starred teams or leagues"
            checked={prefs.favoriteTeamsOnly}
            onChange={(val) => handleToggle('favoriteTeamsOnly', val)}
          />
        </div>

        {/* Alert Trigger Rules */}
        <div className="glass rounded-3xl border border-white/[0.08] p-6 sm:p-8 space-y-6 shadow-xl">
          <h2 className="font-display font-bold text-base text-white border-b border-white/[0.08] pb-4">
            Event Triggers
          </h2>

          <div className="divide-y divide-white/[0.06]">
            <NotificationToggle
              id="goal-scored"
              label="Goals & score updates"
              description="Trigger real-time score toasts whenever a goal, point, or map win is recorded in live matches"
              checked={prefs.goalScored}
              onChange={(val) => handleToggle('goalScored', val)}
            />

            <NotificationToggle
              id="match-start"
              label="Match kick-off alerts"
              description="Notify when a scheduled match shifts status to live"
              checked={prefs.matchStart}
              onChange={(val) => handleToggle('matchStart', val)}
            />

            <NotificationToggle
              id="match-end"
              label="Final results alerts"
              description="Receive notifications summarizing final match scores when matches reach completed status"
              checked={prefs.matchEnd}
              onChange={(val) => handleToggle('matchEnd', val)}
            />

            <NotificationToggle
              id="status-change"
              label="Broadcast delays & announcements"
              description="Alert on match delays, technical timeouts, and official organizer notes"
              checked={prefs.statusChange}
              onChange={(val) => handleToggle('statusChange', val)}
            />
          </div>
        </div>

        {/* Test Toast Preview Box */}
        <div className="glass rounded-3xl border border-white/[0.08] p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="space-y-1 text-center sm:text-left">
            <div className="flex items-center gap-2 justify-center sm:justify-start">
              <Sparkles className="w-4 h-4 text-accent-glow" />
              <h3 className="font-display font-bold text-base text-white">Preview Toast Notification</h3>
            </div>
            <p className="text-xs text-text-muted font-body">
              Click the button to test how real-time match events appear on your screen.
            </p>
          </div>

          <button
            type="button"
            onClick={triggerTestToast}
            className="btn-glass px-5 py-3 text-xs font-display font-bold tracking-wider rounded-xl hover:border-accent-primary/40 focus-ring shrink-0 text-white"
          >
            TEST TOAST OVERLAY
          </button>
        </div>
      </main>
    </div>
  );
}
