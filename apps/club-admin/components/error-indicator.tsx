// components/error-indicator.tsx
"use client";

export function ErrorIndicator() {
  return (
    <span className="relative inline-block ml-2 h-2 w-2">
      <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping"></span>
      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
    </span>
  );
}
