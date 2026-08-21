"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface DateSwitcherProps {
  value?: string;
  onChange?: (value: string) => void;
}

export function DateSwitcher({ value, onChange }: DateSwitcherProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Local date in YYYY-MM-DD (avoid UTC jumps)
  const localToday = new Date();
  const today = [
    localToday.getFullYear(),
    String(localToday.getMonth() + 1).padStart(2, "0"),
    String(localToday.getDate()).padStart(2, "0"),
  ].join("-");

  const activeValue = value ?? today;

  // Parse as local date
  const [year, month, day] = activeValue.split("-").map(Number);

  const current = new Date(year, month - 1, day);

  const format = (date: Date) =>
    [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");

  const navigateTo = (nextValue: string) => {
    if (onChange) {
      onChange(nextValue);
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.set("date", nextValue);
    window.location.assign(url.toString());
  };

  const go = (days: number) => {
    const next = new Date(current);
    next.setDate(next.getDate() + days);
    navigateTo(format(next));
  };

  // Friendly labels
  const startOfToday = new Date(
    localToday.getFullYear(),
    localToday.getMonth(),
    localToday.getDate(),
  );

  const dayDiff = Math.round(
    (current.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24),
  );

  let label = current.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  if (dayDiff === 0) label = "Today";
  else if (dayDiff === 1) label = "Tomorrow";
  else if (dayDiff === -1) label = "Yesterday";

  const openPicker = () => {
    if (inputRef.current?.showPicker) {
      inputRef.current.showPicker();
    } else {
      inputRef.current?.click();
    }
  };

  return (
    <div className="w-full">
      <div className="grid grid-cols-[56px_1fr_56px] items-stretch rounded-xl border border-border-line overflow-hidden bg-bg-surface h-12">
        {/* Previous */}
        <button
          type="button"
          onClick={() => go(-1)}
          className="flex items-center justify-center border-r border-border-line hover:bg-bg-void transition-colors"
          aria-label="Previous day"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Center label + date picker */}
        <button
          type="button"
          onClick={openPicker}
          className="flex items-center justify-center gap-2 px-4 text-sm font-display font-semibold hover:bg-bg-void transition-colors focus:outline-none focus:ring-2 focus:ring-accent-readout/40"
          aria-label="Choose date"
        >
          <span>{label}</span>

          <input
            ref={inputRef}
            type="date"
            value={activeValue}
            onChange={(e) => navigateTo(e.target.value)}
            className="sr-only"
          />
        </button>

        {/* Next */}
        <button
          type="button"
          onClick={() => go(1)}
          className="flex items-center justify-center border-l border-border-line hover:bg-bg-void transition-colors"
          aria-label="Next day"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
