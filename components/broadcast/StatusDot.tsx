"use client";

interface StatusDotProps {
  status: "live" | "upcoming" | "completed" | "delayed" | "cancelled" | string;
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
}

export function StatusDot({
  status,
  size = "md",
  label,
  className = "",
}: StatusDotProps) {
  const normalized = status.toLowerCase();

  const sizeClasses = {
    sm: "w-1.5 h-1.5",
    md: "w-2.5 h-2.5",
    lg: "w-3.5 h-3.5",
  };

  const statusColors = {
    live: "bg-accent-signal",
    completed: "bg-state-win",
    upcoming: "bg-text-muted",
    delayed: "bg-amber-400",
    cancelled: "bg-state-alert",
  };

  const colorClass =
    statusColors[normalized as keyof typeof statusColors] || "bg-text-muted";
  const defaultLabel =
    normalized === "live" ? "Match is live" : `Status: ${normalized}`;
  const accessibleLabel = label || defaultLabel;

  return (
    <span
      role="status"
      aria-live="polite"
      aria-label={accessibleLabel}
      className={`relative inline-flex items-center justify-center shrink-0 ${sizeClasses[size]} ${className}`}
    >
      {normalized === "live" && (
        <span className="tally-pulse absolute inline-flex h-full w-full rounded-full bg-accent-signal opacity-75" />
      )}
      <span
        className={`relative inline-flex rounded-full h-full w-full ${colorClass}`}
      />
      <span className="sr-only">{accessibleLabel}</span>
    </span>
  );
}
