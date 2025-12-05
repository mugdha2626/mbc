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
    <div className="glass-strong rounded-2xl p-5 border-card-border">
      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat, index) => (
          <div key={index}>
            <p className="text-xs text-primary-text mb-1">{stat.label}</p>
            <p className="text-xl font-bold text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>

      {trend && (
        <div className="mt-4 pt-4 border-t border-card-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            {trend.positive ? (
              <svg className="w-4 h-4 text-[var(--accent-mint)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
            ) : (
              <svg className="w-4 h-4 text-primary-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"/></svg>
            )}
            <span className={`font-semibold ${trend.positive ? "text-[var(--accent-mint)]" : "text-primary-dark"}`}>
              {trend.value}
            </span>
            {trend.label && (
              <span className="text-primary-text text-sm">{trend.label}</span>
            )}
          </div>

          {/* Mini chart placeholder */}
          <div className="flex items-end gap-0.5 h-8">
            {[40, 55, 45, 60, 50, 70, 65, 80].map((height, i) => (
              <div
                key={i}
                className={`w-1 rounded-full ${trend.positive ? "bg-[var(--accent-mint)]" : "bg-primary-dark"}`}
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
