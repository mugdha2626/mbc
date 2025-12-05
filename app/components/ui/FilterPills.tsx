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
              ? "btn-primary"
              : "glass-soft text-primary-text hover:glass-primary hover:text-foreground"
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
    icon: <svg className="w-3 h-3 text-[var(--accent-green)]" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/></svg>
  },
  {
    id: "top",
    label: "Top dishes",
    icon: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
  },
  {
    id: "performing",
    label: "Highest performing",
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
  },
];
