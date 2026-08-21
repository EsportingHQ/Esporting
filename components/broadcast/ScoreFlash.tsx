"use client";

import { useEffect, useRef, useState } from "react";
import { RollDigit } from "./roll-digit";

interface ScoreFlashProps {
  value: number | string;
  isLive?: boolean;
  teamName?: string;
  className?: string;
}

export function ScoreFlash({
  value,
  isLive = false,
  teamName = "",
  className = "",
}: ScoreFlashProps) {
  const prevValueRef = useRef(value);
  const [isFlashing, setIsFlashing] = useState(false);
  const [srAnnouncement, setSrAnnouncement] = useState("");

  useEffect(() => {
    if (prevValueRef.current !== value) {
      if (isLive) {
        setIsFlashing(true);
        const announceText = teamName
          ? `${teamName} score updated to ${value}`
          : `Score updated to ${value}`;
        setSrAnnouncement(announceText);

        const timer = setTimeout(() => {
          setIsFlashing(false);
        }, 600);
        prevValueRef.current = value;
        return () => clearTimeout(timer);
      }
      prevValueRef.current = value;
    }
  }, [value, isLive, teamName]);

  return (
    <div className="relative inline-flex items-center">
      {/* Screen reader live region for score changes */}
      <span className="sr-only" role="alert" aria-live="assertive">
        {srAnnouncement}
      </span>

      <div
        className={`px-1.5 py-0.5 rounded transition-all duration-300 ${
          isFlashing ? "score-flash font-bold text-accent-signal" : ""
        } ${className}`}
      >
        <RollDigit
          value={value}
          className={isLive && !isFlashing ? "text-accent-signal" : ""}
        />
      </div>
    </div>
  );
}
