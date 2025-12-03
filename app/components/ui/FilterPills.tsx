"use client";

import { useState } from "react";

interface Filter {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface FilterPillsProps {
  filters: Filter[];
  defaultActive?: string;
  onFilterChange?: (filterId: string) => void;
}

export function FilterPills({ filters, defaultActive, onFilterChange }: FilterPillsProps) {
  const [active, setActive] = useState(defaultActive || filters[0]?.id);

  const handleClick = (filterId: string) => {
    setActive(filterId);
    onFilterChange?.(filterId);
  };

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
      {filters.map((filter) => (
        <button
          key={filter.id}
          onClick={() => handleClick(filter.id)}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
            active === filter.id
              ? "bg-purple-600 text-white"
              : "bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700/50 hover:text-zinc-300"
          }`}
        >
          {filter.icon}
          {filter.label}
        </button>
      ))}
    </div>
  );
}

// Pre-built filter sets
export const mapFilters: Filter[] = [
  {
    id: "near",
    label: "Near me",
    icon: <span className="text-green-400">●</span>
  },
  {
    id: "top",
    label: "Top dishes",
    icon: <span>⭐</span>
  },
  {
    id: "performing",
    label: "Highest performing",
    icon: <span>📈</span>
  },
];
