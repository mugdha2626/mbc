"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { OnboardingFlow } from "@/app/components/onboarding/OnboardingFlow";

const ONBOARDING_STORAGE_KEY = "tmap_onboarding_completed";

interface OnboardingContextType {
  hasCompletedOnboarding: boolean;
  showOnboarding: boolean;
  triggerOnboarding: () => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
}

const OnboardingContext = createContext<OnboardingContextType>({
  hasCompletedOnboarding: true,
  showOnboarding: false,
  triggerOnboarding: () => {},
  completeOnboarding: () => {},
  resetOnboarding: () => {},
});

export function useOnboarding() {
  return useContext(OnboardingContext);
}

interface OnboardingProviderProps {
  children: React.ReactNode;
  userName?: string;
  isNewUser?: boolean;
}

export function OnboardingProvider({
  children,
  userName,
  isNewUser = false,
}: OnboardingProviderProps) {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Check localStorage on mount
  useEffect(() => {
    setIsClient(true);
    const completed = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    const hasCompleted = completed === "true";
    setHasCompletedOnboarding(hasCompleted);

    // Show onboarding for new users who haven't completed it
    if (isNewUser && !hasCompleted) {
      setShowOnboarding(true);
    }
  }, [isNewUser]);

  const completeOnboarding = useCallback(() => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
    setHasCompletedOnboarding(true);
    setShowOnboarding(false);
  }, []);

  const triggerOnboarding = useCallback(() => {
    setShowOnboarding(true);
  }, []);

  const resetOnboarding = useCallback(() => {
    localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    setHasCompletedOnboarding(false);
    setShowOnboarding(true);
  }, []);

  return (
    <OnboardingContext.Provider
      value={{
        hasCompletedOnboarding,
        showOnboarding,
        triggerOnboarding,
        completeOnboarding,
        resetOnboarding,
      }}
    >
      {children}
      {isClient && showOnboarding && (
        <OnboardingFlow onComplete={completeOnboarding} userName={userName} />
      )}
    </OnboardingContext.Provider>
  );
}
