"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Icon components with filled/outline variants
const DiscoverIcon = ({ active }: { active: boolean }) => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
    {active ? (
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
    ) : (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
      </>
    )}
  </svg>
);

const TrendingIcon = ({ active }: { active: boolean }) => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
    {active ? (
      <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z" />
    ) : (
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4 4L21.75 6M21.75 6H15.75M21.75 6v6" />
    )}
  </svg>
);

const StarIcon = ({ active }: { active: boolean }) => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
    {active ? (
      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
    ) : (
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    )}
  </svg>
);

const ProfileIcon = ({ active }: { active: boolean }) => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
    {active ? (
      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
    ) : (
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    )}
  </svg>
);

// Nav item with built-in highlight
const NavItem = ({ 
  href, 
  label, 
  active, 
  children 
}: { 
  href: string; 
  label: string; 
  active: boolean; 
  children: React.ReactNode;
}) => (
  <Link
    href={href}
    className="relative flex flex-col items-center justify-center py-2 transition-all duration-300 group"
  >
    {/* Background highlight - only visible when active */}
    <div 
      className={`absolute inset-0 rounded-3xl bg-gradient-to-br from-[var(--primary)]/25 to-[var(--primary-dark)]/15 transition-all duration-300 ${
        active ? "opacity-100 scale-100" : "opacity-0 scale-90"
      }`}
    />
    
    {/* Icon */}
    <div className={`relative z-10 transition-all duration-300 ${
      active 
        ? "text-[var(--primary-dark)] scale-110" 
        : "text-[var(--muted)] group-hover:text-[var(--primary-text)] group-hover:scale-105 group-active:scale-95"
    }`}>
      {children}
    </div>
    
    {/* Label */}
    <span className={`relative z-10 text-[10px] font-semibold mt-1 transition-all duration-300 ${
      active 
        ? "text-[var(--primary-dark)] opacity-100" 
        : "text-[var(--muted)] opacity-70 group-hover:opacity-100"
    }`}>
      {label}
    </span>
  </Link>
);

export function BottomNav() {
  const pathname = usePathname();

  const isDiscover = pathname === "/" || pathname === "/explore";
  const isTrending = pathname === "/trending";
  const isRewards = pathname === "/rewards";
  const isProfile = pathname === "/profile" || pathname === "/portfolio";

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-bottom pointer-events-none">
      <div className="max-w-lg mx-auto px-4 pb-3">
        {/* Floating container */}
        <div className="pointer-events-auto relative pt-6">
          {/* Main nav bar - floating pill */}
          <div className="relative bg-white/80 backdrop-blur-xl border border-white/60 rounded-[27px] shadow-[0_8px_32px_rgba(155,135,197,0.18),0_4px_16px_rgba(0,0,0,0.06)]">
            {/* Animated gradient background */}
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--primary-light)]/20 via-transparent to-[var(--accent-mint)]/20 opacity-60 rounded-[28px]" />
            
            <div className="relative grid grid-cols-5 py-1 px-1">
              {/* Discover */}
              <NavItem href="/" label="Discover" active={isDiscover}>
                <DiscoverIcon active={isDiscover} />
              </NavItem>

              {/* Trending */}
              <NavItem href="/trending" label="Trending" active={isTrending}>
                <TrendingIcon active={isTrending} />
              </NavItem>

              {/* Center Create Button */}
              <div className="relative flex flex-col items-center justify-center">
                <Link
                  href="/create"
                  className="group relative block -mt-7"
                >
                  {/* Outer glow ring */}
                  <div className="absolute -inset-1 bg-gradient-to-br from-[var(--primary)] via-[var(--accent-purple)] to-[var(--accent-peach)] rounded-full opacity-60 blur-md group-hover:opacity-80 group-active:opacity-100 transition-all duration-300" />
                  
                  {/* Button */}
                  <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-[var(--primary-dark)] via-[var(--primary)] to-[var(--accent-purple)] flex items-center justify-center shadow-lg shadow-[var(--primary-dark)]/30 group-hover:shadow-xl group-hover:shadow-[var(--primary-dark)]/40 transition-all duration-300 group-hover:scale-105 group-active:scale-95">
                    {/* Inner shine */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-t from-transparent via-white/10 to-white/30" />
                    
                    {/* Icon */}
                    <svg 
                      className="w-7 h-7 text-white relative z-10 transition-transform duration-300 group-hover:rotate-90" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24" 
                      strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                </Link>
                {/* Label */}
                <span className="text-[10px] font-semibold text-[var(--primary-text)] mt-1">
                  Create
                </span>
              </div>

              {/* Rewards */}
              <NavItem href="/rewards" label="Rewards" active={isRewards}>
                <StarIcon active={isRewards} />
              </NavItem>

              {/* You */}
              <NavItem href="/profile" label="You" active={isProfile}>
                <ProfileIcon active={isProfile} />
              </NavItem>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
