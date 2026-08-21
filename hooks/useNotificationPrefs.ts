"use client";

import { useState, useEffect } from "react";

export interface NotificationPreferences {
  matchStart: boolean;
  goalScored: boolean;
  matchEnd: boolean;
  statusChange: boolean;
  favoriteTeamsOnly: boolean;
}

const defaultPrefs: NotificationPreferences = {
  matchStart: true,
  goalScored: true,
  matchEnd: true,
  statusChange: false,
  favoriteTeamsOnly: false,
};

export function useNotificationPrefs() {
  const [prefs, setPrefs] = useState<NotificationPreferences>(defaultPrefs);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("esporting_notification_prefs");
      if (stored) {
        setPrefs({ ...defaultPrefs, ...JSON.parse(stored) });
      }
    } catch (e) {
      console.error("Failed to load notification preferences", e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const updatePrefs = (newPrefs: Partial<NotificationPreferences>) => {
    setPrefs((prev) => {
      const updated = { ...prev, ...newPrefs };
      try {
        localStorage.setItem(
          "esporting_notification_prefs",
          JSON.stringify(updated),
        );
      } catch (e) {}
      return updated;
    });
  };

  return {
    prefs,
    isLoaded,
    updatePrefs,
  };
}
