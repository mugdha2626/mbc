"use client";

import { SearchBar } from "../ui/SearchBar";

interface HeaderProps {
  showSearch?: boolean;
  title?: string;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

export function Header({ showSearch = true, title, onBack, rightAction }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-[#0a0a0f]/90 backdrop-blur-lg px-4 py-3">
      <div className="flex items-center gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="p-2 rounded-full bg-zinc-800/50 hover:bg-zinc-700/50 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {title ? (
          <h1 className="text-lg font-semibold flex-1">{title}</h1>
        ) : (
          <>
            {/* Logo */}
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center">
                <span className="text-sm font-bold">tmap</span>
              </div>
            </div>

            {/* Search */}
            {showSearch && (
              <div className="flex-1">
                <SearchBar />
              </div>
            )}
          </>
        )}

        {rightAction && (
          <div className="flex-shrink-0">
            {rightAction}
          </div>
        )}

        {!title && !rightAction && (
          <button className="p-2 rounded-full bg-zinc-800/50 hover:bg-zinc-700/50 transition-colors">
            <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </button>
        )}
      </div>
    </header>
  );
}
