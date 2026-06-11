import React, { useState, useEffect } from "react";
import { X } from "lucide-react";

interface FeatureHintProps {
  /** Unique key used for localStorage persistence, e.g. "create_recipe_hint" */
  hintKey: string;
  /** The message to display */
  message: string;
  /** Position relative to container */
  position?: "top" | "bottom";
  /** Additional CSS classes */
  className?: string;
  /** Delay before showing (ms) */
  delay?: number;
}

/**
 * A lightweight, dismissible hint bubble for first-time feature introduction.
 * Renders nothing if the user has already dismissed it (tracked in localStorage).
 *
 * Usage:
 *   <FeatureHint hintKey="create_recipe_scaling" message={t('hints.scalingTip')} />
 */
export default function FeatureHint({
  hintKey,
  message,
  position = "bottom",
  className = "",
  delay = 600,
}: FeatureHintProps) {
  const storageKey = `seen_${hintKey}`;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(storageKey) === "true") return;
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [storageKey, delay]);

  const dismiss = () => {
    localStorage.setItem(storageKey, "true");
    setVisible(false);
  };

  if (!visible) return null;

  const arrow =
    position === "top"
      ? "after:absolute after:top-full after:left-6 after:border-8 after:border-transparent after:border-t-[#ab3500]"
      : "after:absolute after:bottom-full after:left-6 after:border-8 after:border-transparent after:border-b-[#ab3500]";

  return (
    <div
      className={`relative z-30 animate-fade-in ${className}`}
      role="tooltip"
    >
      <div
        className={`relative bg-[#ab3500] text-white text-xs px-3 py-2 rounded-xl shadow-lg max-w-xs leading-relaxed ${arrow}`}
      >
        <button
          onClick={dismiss}
          className="absolute top-1 right-1 p-0.5 rounded-full hover:bg-white/20 transition"
          aria-label="dismiss"
        >
          <X className="w-3 h-3" />
        </button>
        <span className="pr-4">{message}</span>
      </div>
    </div>
  );
}

/**
 * Reset a specific hint so it shows again.
 */
export function resetHint(hintKey: string) {
  localStorage.removeItem(`seen_${hintKey}`);
}

/**
 * Reset all feature hints.
 */
export function resetAllHints() {
  const keys = Object.keys(localStorage);
  for (const key of keys) {
    if (key.startsWith("seen_")) {
      localStorage.removeItem(key);
    }
  }
}
