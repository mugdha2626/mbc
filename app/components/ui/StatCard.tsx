"use client";

interface Stat {
  label: string;
  value: string;
}

interface StatCardProps {
  stats: Stat[];
  trend?: {
    value: string;
    positive: boolean;
    label?: string;
  };
}

export function StatCard({ stats, trend }: StatCardProps) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat, index) => (
          <div key={index}>
            <p className="text-xs text-zinc-500 mb-1">{stat.label}</p>
            <p className="text-xl font-bold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {trend && (
        <div className="mt-4 pt-4 border-t border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={trend.positive ? "text-green-400" : "text-red-400"}>
              {trend.positive ? "📈" : "📉"}
            </span>
            <span className={`font-semibold ${trend.positive ? "text-green-400" : "text-red-400"}`}>
              {trend.value}
            </span>
            {trend.label && (
              <span className="text-zinc-500 text-sm">{trend.label}</span>
            )}
          </div>

          {/* Mini chart placeholder */}
          <div className="flex items-end gap-0.5 h-8">
            {[40, 55, 45, 60, 50, 70, 65, 80].map((height, i) => (
              <div
                key={i}
                className={`w-1 rounded-full ${trend.positive ? "bg-green-500" : "bg-red-500"}`}
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
