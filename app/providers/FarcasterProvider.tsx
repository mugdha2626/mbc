"use client";

import { useEffect, useState, createContext, useContext } from "react";
import { sdk } from "@farcaster/miniapp-sdk";

interface FarcasterUser {
  fid: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
}

interface FarcasterContextType {
  user: FarcasterUser | null;
  isLoaded: boolean;
}

const FarcasterContext = createContext<FarcasterContextType>({
  user: null,
  isLoaded: false,
});

export function useFarcaster() {
  return useContext(FarcasterContext);
}

export function FarcasterProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [user, setUser] = useState<FarcasterUser | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        // IMPORTANT: Call ready() FIRST to hide splash screen
        await sdk.actions.ready();

        // Then get context from SDK
        const context = await sdk.context;

        // Extract user info if available
        if (context?.user) {
          const userData = {
            fid: context.user.fid,
            username: context.user.username,
            displayName: context.user.displayName,
            pfpUrl: context.user.pfpUrl,
          };
          setUser(userData);

          // Sync user to our MongoDB (Farcaster handles auth, we just store app data)
          try {
            await fetch("/api/auth/sync", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                fid: userData.fid,
                username: userData.username,
              }),
            });
          } catch (err) {
            console.error("Failed to save user to database:", err);
          }
        }

        setIsSDKLoaded(true);
      } catch (error) {
        console.error("Failed to load Farcaster SDK:", error);
        // Still mark as loaded so app doesn't hang forever
        setIsSDKLoaded(true);
      }
    };

    load();
  }, []);

  if (!isSDKLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-center text-white">
          <div className="text-xl font-semibold">Loading tmap...</div>
        </div>
      </div>
    );
  }

  return (
    <FarcasterContext.Provider value={{ user, isLoaded: isSDKLoaded }}>
      {children}
    </FarcasterContext.Provider>
  );
}
