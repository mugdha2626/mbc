"use client";

interface PriceChangeProps {
  value: number;
  showIcon?: boolean;
  size?: "sm" | "md";
}

export function PriceChange({ value, showIcon = true, size = "md" }: PriceChangeProps) {
  const isPositive = value >= 0;
  const formatted = `${isPositive ? "+" : ""}${value.toFixed(1)}%`;

  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm",
  };

  return (
    <span className={`inline-flex items-center gap-1 font-medium ${sizeClasses[size]} ${isPositive ? "text-[var(--accent-mint)]" : "text-primary-dark"}`}>
      {showIcon && (
        <span>{isPositive ? "↑" : "↓"}</span>
      )}
      {formatted}
    </span>
  );
}
