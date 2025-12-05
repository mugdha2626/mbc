"use client";

import { useState, useEffect } from "react";

interface FaucetButtonProps {
  walletAddress: string;
  onSuccess?: () => void;
  className?: string;
  showWhenBalanceAbove?: number; // Hide button if balance is above this amount
  currentBalance?: number;
}

type FaucetState = "idle" | "checking" | "claiming" | "success" | "error" | "rate_limited" | "not_configured";

export function FaucetButton({
  walletAddress,
  onSuccess,
  className = "",
  showWhenBalanceAbove = 5, // Show when balance < $5
  currentBalance,
}: FaucetButtonProps) {
  const [state, setState] = useState<FaucetState>("checking");
  const [message, setMessage] = useState("");
  const [canClaim, setCanClaim] = useState(false);
  const [nextClaimTime, setNextClaimTime] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

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
        if (!data.canClaim && data.nextClaimTime) {
          setNextClaimTime(data.nextClaimTime);
          setState("rate_limited");
        } else {
          setState("idle");
        }
      } catch (err) {
        console.error("Error checking faucet eligibility:", err);
        setState("idle");
        setCanClaim(true); // Allow trying even if check fails
      }
    };

    checkEligibility();
  }, [walletAddress]);

  // Hide if balance is above threshold
  if (currentBalance !== undefined && currentBalance >= showWhenBalanceAbove) {
    return null;
  }

  const handleClaim = async () => {
    if (!walletAddress) return;

    setState("claiming");
    setMessage("");
    setTxHash(null);

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
          setNextClaimTime(data.nextClaimTime);
          setMessage(data.error);
        } else if (res.status === 503) {
          setState("not_configured");
          setMessage(data.error || "Faucet not available");
        } else {
          setState("error");
          setMessage(data.error || "Failed to claim USDC");
        }
        return;
      }

      setState("success");
      setTxHash(data.txHash);
      setMessage("Successfully received 5 USDC!");
      setCanClaim(false);

      // Callback for parent to refresh balance
      if (onSuccess) {
        setTimeout(onSuccess, 1000);
      }
    } catch (err) {
      console.error("Faucet claim error:", err);
      setState("error");
      setMessage("Network error. Please try again.");
    }
  };

  const getTimeRemaining = () => {
    if (!nextClaimTime) return "";
    const remaining = new Date(nextClaimTime).getTime() - Date.now();
    if (remaining <= 0) return "now";
    const hours = Math.floor(remaining / (60 * 60 * 1000));
    const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <div className={`${className}`}>
      {state === "checking" ? (
        <div className="w-full py-3 px-4 bg-gray-100 rounded-xl flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          <span className="text-gray-500 text-sm">Checking faucet...</span>
        </div>
      ) : state === "success" ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3">
          <div className="flex items-center gap-2 text-green-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">{message}</span>
          </div>
          {txHash && (
            <a
              href={`https://sepolia.basescan.org/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-green-600 hover:underline mt-1 block"
            >
              View transaction →
            </a>
          )}
        </div>
      ) : state === "rate_limited" ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <div className="flex items-center gap-2 text-amber-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm">
              Next claim available in <span className="font-medium">{getTimeRemaining()}</span>
            </span>
          </div>
        </div>
      ) : state === "not_configured" ? (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
          <div className="flex items-center gap-2 text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm">Test USDC faucet coming soon!</span>
          </div>
          <p className="text-xs text-gray-500 mt-1 ml-7">
            Get Base Sepolia USDC from a faucet to test minting.
          </p>
        </div>
      ) : state === "error" ? (
        <div className="space-y-2">
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <div className="flex items-center gap-2 text-red-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span className="text-sm">{message}</span>
            </div>
          </div>
          <button
            onClick={handleClaim}
            className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors"
          >
            Try Again
          </button>
        </div>
      ) : (
        <button
          onClick={handleClaim}
          disabled={state === "claiming" || !canClaim}
          className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2 shadow-sm"
        >
          {state === "claiming" ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Sending USDC...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Get $5 Test USDC</span>
            </>
          )}
        </button>
      )}

      {state === "idle" && canClaim && (
        <p className="text-xs text-gray-500 text-center mt-2">
          Free testnet USDC to try minting
        </p>
      )}
    </div>
  );
}
