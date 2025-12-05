"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function BottomNav() {
  const pathname = usePathname();

  const isDiscover = pathname === "/" || pathname === "/explore";
  const isTrending = pathname === "/trending";
  const isRewards = pathname === "/rewards";
  const isProfile = pathname === "/profile" || pathname === "/portfolio";

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50 safe-bottom">
      <div className="max-w-lg mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Discover */}
          <Link
            href="/"
            className={`flex flex-col items-center gap-1 min-w-[44px] ${
              isDiscover ? "text-primary-dark" : "text-gray-400"
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={isDiscover ? 2.5 : 2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <span className="text-[10px] font-medium">Discover</span>
          </Link>

          {/* Trending */}
          <Link
            href="/trending"
            className={`flex flex-col items-center gap-1 min-w-[44px] ${
              isTrending ? "text-primary-dark" : "text-gray-400"
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={isTrending ? 2.5 : 2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <span className="text-[10px] font-medium">Trending</span>
          </Link>

          {/* Create Button - Center */}
          <Link
            href="/create"
            className="relative -mt-8"
          >
            <div className="w-14 h-14 btn-primary rounded-full flex items-center justify-center shadow-lg shadow-[var(--primary-dark)]/30">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-medium text-gray-500">Create</span>
          </Link>

          {/* Rewards */}
          <Link
            href="/rewards"
            className={`flex flex-col items-center gap-1 min-w-[44px] ${
              isRewards ? "text-primary-dark" : "text-gray-400"
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={isRewards ? 2.5 : 2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-[10px] font-medium">Rewards</span>
          </Link>

          {/* You */}
          <Link
            href="/profile"
            className={`flex flex-col items-center gap-1 min-w-[44px] ${
              isProfile ? "text-primary-dark" : "text-gray-400"
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={isProfile ? 2.5 : 2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-[10px] font-medium">You</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
