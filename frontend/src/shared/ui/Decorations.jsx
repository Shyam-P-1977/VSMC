import React from 'react';

export function Squiggle({ className = "w-28 text-yellow-signal" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 140 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M3 14C22.5 4.5 42 16.5 61.5 8C81 -0.5 100.5 13.5 120 7C127.5 4.5 133 8.5 137 11"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Sparkle({ className = "w-6 h-6 text-yellow-signal" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
    </svg>
  );
}

export function DottedLine({ orientation = "horizontal", className = "" }) {
  if (orientation === "vertical") {
    return (
      <div className={`w-0.5 border-l-2 border-dashed border-teal-300 dark:border-teal-700 ${className}`} />
    );
  }
  return (
    <div className={`h-0.5 border-t-2 border-dashed border-teal-300 dark:border-teal-700 ${className}`} />
  );
}

export function DottedGrid({ className = "opacity-20" }) {
  return (
    <div
      className={`absolute inset-0 pointer-events-none squiggle-accent ${className}`}
    />
  );
}
