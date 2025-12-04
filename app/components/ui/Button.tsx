"use client";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "danger";
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  icon,
  children,
  className = "",
  ...props
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center gap-2 font-semibold rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary: "btn-primary",
    secondary: "bg-gray-200 hover:bg-gray-300 text-gray-800",
    outline:
      "bg-transparent border-2 border-gray-300 hover:border-gray-400 text-gray-700",
    danger:
      "bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-5 py-2.5 text-sm",
    lg: "px-6 py-3 text-base",
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
