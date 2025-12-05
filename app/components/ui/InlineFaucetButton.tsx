"use client";

import { useState, useEffect } from "react";

interface InlineFaucetButtonProps {
  walletAddress: string;
  onSuccess?: () => void;
}

type FaucetState = "idle" | "checking" | "claiming" | "success" | "error" | "rate_limited" | "not_configured";

export function InlineFaucetButton({
  walletAddress,
  onSuccess,
}: InlineFaucetButtonProps) {
  const [state, setState] = useState<FaucetState>("checking");
  const [canClaim, setCanClaim] = useState(false);

  // Check if user can claim
  useEffect(() => {
    if (!walletAddress) return;

    const checkEligibility = async () => {
      setState("checking");
      try {
        const res = await fetch(`/api/faucet?walletAddress=${walletAddress}`);
        const data = await res.json();

        if (data.configured === false) {
          setState("not_configured");
          setCanClaim(false);
          return;
        }

        setCanClaim(data.canClaim);
        if (!data.canClaim) {
          setState("rate_limited");
        } else {
          setState("idle");
        }
      } catch (err) {
        console.error("Error checking faucet eligibility:", err);
        setState("idle");
        setCanClaim(true);
      }
    };

    checkEligibility();
  }, [walletAddress]);

  const handleClaim = async () => {
    if (!walletAddress || !canClaim) return;

    setState("claiming");

    try {
      const res = await fetch("/api/faucet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          setState("rate_limited");
          setCanClaim(false);
        } else {
          setState("error");
        }
        return;
      }

      setState("success");
      setCanClaim(false);

      // Callback for parent to refresh balance
      if (onSuccess) {
        setTimeout(onSuccess, 500);
      }

      // Reset to show success briefly then hide
      setTimeout(() => {
        setState("idle");
      }, 2000);
    } catch (err) {
      console.error("Faucet claim error:", err);
      setState("error");
    }
  };

  // Don't render if not configured or still checking
  if (state === "not_configured" || state === "checking") {
    return null;
  }

  // Rate limited - show when next claim is available
  if (state === "rate_limited") {
    return null; // Hide for now, user already has funds
  }

  // Success state - show checkmark briefly
  if (state === "success") {
    return (
      <span className="inline-flex items-center gap-1 text-green-600 text-sm font-medium">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        +$5
      </span>
    );
  }

  // Error state - show retry
  if (state === "error") {
    return (
      <button
        onClick={handleClaim}
        className="text-red-500 hover:text-red-600 text-sm font-medium"
      >
        Retry
      </button>
    );
  }

  // Claiming state
  if (state === "claiming") {
    return (
      <span className="inline-flex items-center gap-1 text-blue-500 text-sm">
        <div className="w-3 h-3 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
      </span>
    );
  }

  // Idle state - show get button
  return (
    <button
      onClick={handleClaim}
      disabled={!canClaim}
      className="text-blue-500 hover:text-blue-600 disabled:text-gray-400 text-sm font-medium transition-colors"
    >
      Get $5
    </button>
  );
}
