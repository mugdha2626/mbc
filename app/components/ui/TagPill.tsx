"use client";

interface TagPillProps {
  label: string;
  variant?: "default" | "success" | "warning" | "info";
}

export function TagPill({ label, variant = "default" }: TagPillProps) {
  const variants = {
    default: "glass-soft text-primary-text border-card-border",
    success: "glass-mint text-[#5a9a8a] border-[rgba(192,232,216,0.4)]",
    warning: "glass-peach text-[#8b6a5a] border-[rgba(240,200,184,0.4)]",
    info: "glass-primary text-primary-dark border-[rgba(184,168,216,0.4)]",
  };

  return (
    <span
      className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${variants[variant]}`}
    >
      {label}
    </span>
  );
}
