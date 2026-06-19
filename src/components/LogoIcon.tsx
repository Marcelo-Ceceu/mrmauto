import React from "react";

export function LogoIcon({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <div
      className={`shrink-0 rounded-full border border-red-600/30 bg-cover bg-no-repeat shadow-sm ${className}`}
      style={{
        backgroundImage: "url('/mrm-banner.png')",
        backgroundPosition: "center 25%", // Foca exatamente no MRM
      }}
    />
  );
}
