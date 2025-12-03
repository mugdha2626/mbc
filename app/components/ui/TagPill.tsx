"use client";

interface TagPillProps {
  label: string;
  variant?: "default" | "success" | "warning" | "info";
}

export function TagPill({ label, variant = "default" }: TagPillProps) {
  const variants = {
    default: "bg-zinc-800/50 text-zinc-300 border-zinc-700/50",
    success: "bg-green-500/20 text-green-400 border-green-500/30",
    warning: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    info: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  };

  return (
    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${variants[variant]}`}>
      {label}
    </span>
  );
}
