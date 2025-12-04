"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function BottomNav() {
  const pathname = usePathname();

  const isDiscover = pathname === "/" || pathname === "/explore";
  const isProfile = pathname === "/profile" || pathname === "/portfolio";

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50 safe-bottom">
      <div className="max-w-lg mx-auto px-8 py-3">
        <div className="flex items-center justify-between">
          {/* Discover */}
          <Link
            href="/"
            className={`flex flex-col items-center gap-1 ${
              isDiscover ? "text-primary-dark" : "text-gray-400"
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={isDiscover ? 2.5 : 2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <span className="text-xs font-medium">Discover</span>
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
            <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-xs font-medium text-gray-500">Create</span>
          </Link>

          {/* You */}
          <Link
            href="/profile"
            className={`flex flex-col items-center gap-1 ${
              isProfile ? "text-primary-dark" : "text-gray-400"
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={isProfile ? 2.5 : 2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-xs font-medium">You</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
