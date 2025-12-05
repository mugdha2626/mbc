"use client";

import { useEffect, useState, createContext, useContext } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import { OnboardingProvider } from "./OnboardingProvider";

interface FarcasterUser {
  fid: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
  walletAddress?: string;
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

export function FarcasterProvider({ children }: { children: React.ReactNode }) {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [user, setUser] = useState<FarcasterUser | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        await sdk.actions.ready();
        const context = await sdk.context;

        if (context?.user) {
          let walletAddress: string | undefined;

          try {
            const ethProvider = sdk.wallet.ethProvider;
            if (ethProvider) {
              const accounts = await ethProvider.request({
                method: "eth_requestAccounts",
              });
              if (accounts && accounts.length > 0) {
                walletAddress = accounts[0];
              }
            }
          } catch (err) {
            console.error("Failed to get wallet address:", err);
          }

          const userData = {
            fid: context.user.fid,
            username: context.user.username,
            displayName: context.user.displayName,
            pfpUrl: context.user.pfpUrl,
            walletAddress,
          };
          setUser(userData);

          try {
            const response = await fetch("/api/auth/sync", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                fid: userData.fid,
                username: userData.username,
                walletAddress: userData.walletAddress,
                pfpUrl: userData.pfpUrl,
                displayName: userData.displayName,
              }),
            });

            // Check if this is a new user from the API response
            if (response.ok) {
              const data = await response.json();
              if (data.isNewUser) {
                setIsNewUser(true);
              }
            }
          } catch (err) {
            console.error("Failed to save user to database:", err);
          }
        }

        setIsSDKLoaded(true);
      } catch (error) {
        console.error("Failed to load Farcaster SDK:", error);
        setIsSDKLoaded(true);
      }
    };

    load();
  }, []);

  if (!isSDKLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 rounded-full border-2 border-gray-200 border-t-gray-500 animate-spin" />
          <p className="text-gray-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <FarcasterContext.Provider value={{ user, isLoaded: isSDKLoaded }}>
      <OnboardingProvider
        userName={user?.displayName || user?.username}
        isNewUser={isNewUser}
      >
        {children}
      </OnboardingProvider>
    </FarcasterContext.Provider>
  );
}
