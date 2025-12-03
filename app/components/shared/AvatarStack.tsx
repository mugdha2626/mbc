"use client";

interface AvatarStackProps {
  avatars: string[];
  max?: number;
  size?: "sm" | "md";
}

export function AvatarStack({ avatars, max = 3, size = "sm" }: AvatarStackProps) {
  const displayed = avatars.slice(0, max);
  const remaining = avatars.length - max;

  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
  };

  return (
    <div className="flex items-center -space-x-2">
      {displayed.map((avatar, index) => (
        <img
          key={index}
          src={avatar}
          alt=""
          className={`${sizeClasses[size]} rounded-full border-2 border-zinc-900`}
        />
      ))}
      {remaining > 0 && (
        <div className={`${sizeClasses[size]} rounded-full bg-zinc-700 border-2 border-zinc-900 flex items-center justify-center`}>
          <span className="text-xs text-zinc-300">+{remaining}</span>
        </div>
      )}
    </div>
  );
}
