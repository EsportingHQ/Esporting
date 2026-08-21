"use client";

import { motion } from "framer-motion";

interface NotificationToggleProps {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function NotificationToggle({
  id,
  label,
  description,
  checked,
  onChange,
  disabled = false,
  className = "",
}: NotificationToggleProps) {
  return (
    <div
      className={`flex items-center justify-between gap-4 py-3 select-none ${className}`}
    >
      <div className="space-y-0.5 max-w-md">
        <label
          htmlFor={id}
          className="font-display font-semibold text-sm text-text-primary uppercase cursor-pointer"
        >
          {label}
        </label>
        {description && (
          <p className="text-xs text-text-muted font-body leading-relaxed">
            {description}
          </p>
        )}
      </div>

      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-ring ${
          checked ? "bg-accent-readout" : "bg-bg-void border-border-line"
        } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
      >
        <motion.span
          animate={{ x: checked ? 20 : 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className={`pointer-events-none inline-block h-5 w-5 rounded-full shadow-lg transform ring-0 ${
            checked ? "bg-bg-void" : "bg-text-muted"
          }`}
        />
      </button>
    </div>
  );
}
