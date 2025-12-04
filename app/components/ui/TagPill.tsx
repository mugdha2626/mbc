"use client";

interface TagPillProps {
  label: string;
  variant?: "default" | "success" | "warning" | "info";
}

export function TagPill({ label, variant = "default" }: TagPillProps) {
  const variants = {
    default: "bg-gray-100 text-gray-600 border-gray-200",
    success: "bg-green-50 text-green-600 border-green-200",
    warning: "bg-orange-50 text-orange-600 border-orange-200",
    info: "bg-primary-softer text-primary border-primary",
  };

  return (
    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${variants[variant]}`}>
      {label}
    </span>
  );
}
