"use client";

import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { useAccount, useSendCalls, useCallsStatus } from "wagmi";
import getFid from "@/app/providers/Fid";
import { Fid } from "@/app/interface";
import {
  zeroAddress,
  encodeFunctionData,
  parseAbi,
  createPublicClient,
  http,
  type Hash,
  stringToBytes,
  pad,
  toHex,
} from "viem";
import { baseSepolia } from "viem/chains";
import {
  TMAP_DISHES_ADDRESS,
  USDC_ADDRESS,
  ERC20_ABI,
  TMAP_DISHES_ABI,
} from "@/lib/contracts";
import { useFarcaster } from "@/app/providers/FarcasterProvider";
import { sdk } from "@farcaster/miniapp-sdk";
import { navigateBack } from "@/lib/navigation";
import { InlineFaucetButton } from "@/app/components/ui/InlineFaucetButton";

// ABIs
const erc20Abi = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
]);

const tmapDishesAbi = parseAbi([
  "function mint(bytes32 dishId, uint256 usdcAmount, address referrer)",
  "function getRemainingAllowance(address user, bytes32 dishId) view returns (uint256)",
  "function getMintCost(bytes32 dishId, uint256 tokenAmount) view returns (uint256)",
  "function getTokensForUsdc(bytes32 dishId, uint256 usdcAmount) view returns (uint256 tokenAmount, uint256 actualCost)",
  "error DishAlreadyExists()",
  "error DishDoesNotExist()",
  "error ZeroAmount()",
  "error ExceedsMaxSpend()",
  "error InsufficientBalance()",
  "error TransferFailed()",
]);

// Public client for reading
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

// Convert string dishId to bytes32 for contract calls
// If already a hex string (hashed), use it directly; otherwise convert
const stringToBytes32 = (str: string): Hash => {
  // If it's already a hex string (starts with 0x and is 66 chars = 32 bytes)
  if (str.startsWith("0x") && str.length === 66) {
    return str as Hash;
  }
  // Otherwise, convert string to bytes32
  const bytes = stringToBytes(str);
  // Truncate to 32 bytes if longer, or pad if shorter
  const truncated = bytes.slice(0, 32);
  const padded = pad(truncated, { size: 32 });
  return toHex(padded) as Hash;
};

interface DishData {
  dishId: string;
  name: string;
  image?: string;
  description?: string;
  restaurant: string;
  restaurantName?: string;
  restaurantAddress?: string;
  restaurantImage?: string;
  creator: number;
  creatorUsername?: string;
  creatorPfp?: string;
  currentPrice?: number;
  marketCap?: number;
  dailyVolume?: number;
  dailyPriceChange?: number;
  totalHolders?: number;
  currentSupply?: number;
  weeklyChange?: number;
  yourHolding?: number;
  yourValue?: number;
}

type MintStep = "idle" | "checking" | "approving" | "minting" | "complete";

export default function DishPageClient() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const dishId = params.id as string;
  const referrerFid = searchParams.get("ref"); // Referrer FID from wishlist
  const { user } = useFarcaster();

  const [dish, setDish] = useState<DishData | null>(null);
  const [loading, setLoading] = useState(true);
  const [backAmount, setBackAmount] = useState(1);
  const [mintStep, setMintStep] = useState<MintStep>("idle");
  const [mintError, setMintError] = useState("");
  const [triggerMint, setTriggerMint] = useState(false);
  const [usdcAmountToMint, setUsdcAmountToMint] = useState<bigint>(BigInt(0));
  const [onChainPrice, setOnChainPrice] = useState<number | null>(null);
  const [userBalance, setUserBalance] = useState(0);
  const [userFid, setUserFid] = useState<Fid | undefined>(undefined);

  // Simple logging helper (no UI display)
  const addDebug = (msg: string) => console.log("[Dish]", msg);
  const [lastMintAmount, setLastMintAmount] = useState<bigint | null>(null);
  const [lastTokensReceived, setLastTokensReceived] = useState<number | null>(
    null
  );
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [referrerWallet, setReferrerWallet] = useState<`0x${string}` | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  // Wagmi hooks
  const { address, isConnected } = useAccount();

  // Separate hooks for approve and mint (like create page)
  const {
    sendCalls: sendApproveCalls,
    data: approveCallsId,
    error: approveError,
    reset: resetApprove,
  } = useSendCalls();

  const { data: approveStatus } = useCallsStatus({
    id: approveCallsId?.id ?? "",
    query: {
      enabled: !!approveCallsId?.id,
      refetchInterval: (data) => {
        if (data.state.data?.status === "success") return false;
        return 2000;
      },
    },
  });

  const {
    sendCalls: sendMintCalls,
    data: mintCallsId,
    error: mintCallError,
    reset: resetMint,
  } = useSendCalls();

  const { data: mintStatus } = useCallsStatus({
    id: mintCallsId?.id ?? "",
    query: {
      enabled: !!mintCallsId?.id,
      refetchInterval: (data) => {
        if (data.state.data?.status === "success") return false;
        return 2000;
      },
    },
  });

  // Get user's FID
  useEffect(() => {
    getFid().then((fid) => setUserFid(fid));
  }, []);

  // Fetch dish data from API
  useEffect(() => {
    if (!dishId) return;

    const fetchDish = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/dish/${dishId}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to fetch dish");
        }

        setDish(data.dish);
      } catch (err) {
        console.error("Error fetching dish:", err);
        setMintError(
          err instanceof Error ? err.message : "Failed to load dish"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDish();
  }, [dishId]);

  // Fetch live holder count from contract-backed endpoint
  useEffect(() => {
    if (!dishId) return;

    const fetchHolders = async () => {
      try {
        const res = await fetch(`/api/dish/${encodeURIComponent(dishId)}/holders`);
        if (!res.ok) return;
        const data = await res.json();
        const holderCount = Number(data.holderCount || 0);
        setDish((prev) => (prev ? { ...prev, totalHolders: holderCount } : prev));
      } catch (err) {
        console.error("Error fetching holder count:", err);
      }
    };

    fetchHolders();
  }, [dishId]);

  // Fetch on-chain price
  useEffect(() => {
    if (!dishId || !TMAP_DISHES_ADDRESS) return;

    const fetchOnChainData = async () => {
      try {
        // Convert string dishId to bytes32 for contract call
        const dishIdBytes32 = stringToBytes32(dishId);
        const price = await publicClient.readContract({
          address: TMAP_DISHES_ADDRESS,
          abi: TMAP_DISHES_ABI,
          functionName: "getCurrentPrice",
          args: [dishIdBytes32],
        });
        // Price is in USDC (6 decimals)
        setOnChainPrice(Number(price) / 1e6);
      } catch (err) {
        console.error("Error fetching on-chain price:", err);
      }
    };

    fetchOnChainData();
  }, [dishId]);

  // Function to fetch USDC balance (used on mount and after faucet)
  const fetchUsdcBalance = async () => {
    if (!address || !USDC_ADDRESS) return;
    try {
      const balance = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [address],
      });
      setUserBalance(Number(balance) / 1e6);
    } catch (err) {
      console.error("Error fetching USDC balance:", err);
    }
  };

  // Fetch user's USDC balance on mount
  useEffect(() => {
    fetchUsdcBalance();
  }, [address]);

  // Check if dish is in user's wishlist
  useEffect(() => {
    const checkWishlist = async () => {
      if (!user?.fid || !dishId) return;

      try {
        const res = await fetch(`/api/wishlist?fid=${user.fid}`);
        if (res.ok) {
          const data = await res.json();
          const isInWishlist = data.wishlist?.some(
            (item: { dish: string }) => item.dish === dishId
          );
          setIsWishlisted(isInWishlist);
        }
      } catch (err) {
        console.error("Error checking wishlist:", err);
      }
    };

    checkWishlist();
  }, [user?.fid, dishId]);

  // Fetch referrer's wallet address if referrerFid is provided
  useEffect(() => {
    const fetchReferrerWallet = async () => {
      if (!referrerFid) return;

      try {
        const res = await fetch(`/api/users/${referrerFid}`);
        if (res.ok) {
          const data = await res.json();
          if (data.user?.walletAddress && data.user.walletAddress !== "") {
            setReferrerWallet(data.user.walletAddress as `0x${string}`);
            console.log(`Referrer wallet found: ${data.user.walletAddress}`);
          }
        }
      } catch (err) {
        console.error("Error fetching referrer wallet:", err);
      }
    };

    fetchReferrerWallet();
  }, [referrerFid]);

  // Handle wishlist toggle
  const handleWishlistToggle = async () => {
    if (!user?.fid) {
      alert("Please sign in to add to wishlist");
      return;
    }

    setWishlistLoading(true);
    try {
      const method = isWishlisted ? "DELETE" : "POST";
      const res = await fetch("/api/wishlist", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fid: user.fid,
          dishId: dishId,
          referrer: 0,
        }),
      });

      if (res.ok) {
        setIsWishlisted(!isWishlisted);
      }
    } catch (err) {
      console.error("Error updating wishlist:", err);
    } finally {
      setWishlistLoading(false);
    }
  };

  // Handle share to Farcaster
  const handleShare = async () => {
    if (!dish) return;

    setIsSharing(true);
    try {
      // Get the app URL - in production this would be your deployed URL
      const appUrl = typeof window !== "undefined"
        ? window.location.origin
        : "https://inez-cronish-hastately.ngrok-free.dev";

      // Build the dish URL with referral parameter
      const referrerParam = user?.fid ? `?ref=${user.fid}` : "";
      const dishUrl = `${appUrl}/dish/${encodeURIComponent(dishId)}${referrerParam}`;

      // Build the cast text
      const priceText = onChainPrice !== null
        ? `$${onChainPrice.toFixed(2)}`
        : `$${(dish.currentPrice || 0.1).toFixed(2)}`;

      const castText = `Just discovered ${dish.name} at ${dish.restaurantName}!\n\n${priceText} per stamp | ${dish.totalHolders || 0} holders\n\nMint it on tmap:`;

      // Use Farcaster SDK to open cast composer
      const result = await sdk.actions.composeCast({
        text: castText,
        embeds: [dishUrl],
      });

      if (result?.cast) {
        console.log("Cast shared successfully:", result.cast);
      }
    } catch (err) {
      console.error("Error sharing to Farcaster:", err);
      // Fallback: copy link to clipboard
      try {
        const appUrl = typeof window !== "undefined"
          ? window.location.origin
          : "";
        const referrerParam = user?.fid ? `?ref=${user.fid}` : "";
        const shareUrl = `${appUrl}/dish/${encodeURIComponent(dishId)}${referrerParam}`;
        await navigator.clipboard.writeText(shareUrl);
        alert("Link copied to clipboard!");
      } catch (clipboardErr) {
        console.error("Clipboard fallback failed:", clipboardErr);
      }
    } finally {
      setIsSharing(false);
    }
  };

  // Helper to check if status indicates success
  const isStatusSuccess = (
    status:
      | { status?: string; receipts?: Array<{ status?: string | number }> }
      | undefined
  ) => {
    if (!status) return false;
    if (status.status === "success") return true;
    const receipts = status.receipts;
    if (receipts && receipts.length > 0) {
      return receipts.every((r) => {
        const s = r.status;
        return s === "success" || s === "0x1" || s === 1 || s === "1";
      });
    }
    return false;
  };

  // Watch for approve completion -> trigger mint
  useEffect(() => {
    if (mintStep === "approving" && approveStatus) {
      if (isStatusSuccess(approveStatus)) {
        // Approval complete, trigger mint
        setTriggerMint(true);
      } else if (approveStatus.status === "failure") {
        setMintError("Approval failed");
        setMintStep("idle");
      }
    }
  }, [approveStatus, mintStep]);

  // Watch for approve error
  useEffect(() => {
    if (approveError && mintStep === "approving") {
      setMintError(approveError.message || "Approval failed");
      setMintStep("idle");
    }
  }, [approveError, mintStep]);

  // Start mint call (extracted as function like create page)
  const startMint = async (amount: bigint) => {
    console.log("startMint called with:", {
      dishId,
      amount: amount.toString(),
      contract: TMAP_DISHES_ADDRESS,
    });

    if (!dishId || !TMAP_DISHES_ADDRESS || amount === BigInt(0)) {
      addDebug(
        `Cannot mint: dishId=${!!dishId}, contract=${!!TMAP_DISHES_ADDRESS}, amount=${amount.toString()}`
      );
      return;
    }

    addDebug(`Sending mint transaction for ${Number(amount) / 1e6} USDC...`);
    setMintStep("minting");

    try {
      // Convert string dishId to bytes32 for contract
      const dishIdBytes32 = stringToBytes32(dishId);

      // Check remaining dish allowance (max $10 per user per dish)
      if (address) {
        try {
          const remainingDishAllowance = await publicClient.readContract({
            address: TMAP_DISHES_ADDRESS,
            abi: tmapDishesAbi,
            functionName: "getRemainingAllowance",
            args: [address, dishIdBytes32],
          });
          addDebug(
            `Remaining dish allowance: ${
              Number(remainingDishAllowance) / 1e6
            } USDC`
          );

          if (remainingDishAllowance < amount) {
            const spent = 10 - Number(remainingDishAllowance) / 1e6;
            setMintError(
              `You've reached the $10 max spend limit for this dish. You've already spent $${spent.toFixed(
                2
              )}. Remaining: $${(Number(remainingDishAllowance) / 1e6).toFixed(
                2
              )}`
            );
            setMintStep("idle");
            return;
          }
        } catch (err) {
          console.error("Error checking remaining dish allowance:", err);
          addDebug(`Error checking dish allowance: ${err}`);
          // Continue anyway - the simulation will catch it
        }
      }

      // Determine referrer address for the contract call
      const referrerAddress = referrerWallet || zeroAddress;
      if (referrerWallet) {
        addDebug(`Using referrer wallet: ${referrerWallet.slice(0, 10)}...`);
      }

      // Simulate the transaction first to check if it will succeed
      try {
        addDebug("Simulating mint transaction...");
        await publicClient.simulateContract({
          address: TMAP_DISHES_ADDRESS,
          abi: tmapDishesAbi,
          functionName: "mint",
          args: [dishIdBytes32, amount, referrerAddress],
          account: address,
        });
        addDebug("Simulation successful - transaction should work");
      } catch (simError) {
        console.error("Simulation error full:", simError);
        const error = simError as {
          shortMessage?: string;
          message?: string;
          data?: `0x${string}`;
          cause?: {
            data?: `0x${string}`;
            errorName?: string;
            name?: string;
          };
          name?: string;
        };

        // Extract error name
        const errorName =
          error?.cause?.errorName || error?.cause?.name || error?.name;
        const errorData = error?.data || error?.cause?.data;
        const errorDataStr =
          typeof errorData === "string" ? errorData : String(errorData || "");

        if (errorDataStr) {
          addDebug(`Error data: ${errorDataStr}`);
        }
        if (errorName) {
          addDebug(`Error name: ${errorName}`);
        }

        // Handle specific errors
        if (
          errorName === "ExceedsMaxSpend" ||
          (errorDataStr && errorDataStr.startsWith("0x1f2a2005"))
        ) {
          setMintError(
            `Mint failed: You've reached the $10 maximum spend limit for this dish. You cannot mint more tokens for this dish.`
          );
        } else if (errorName === "DishDoesNotExist") {
          setMintError(
            `Mint failed: This dish does not exist on-chain. Please create the dish first.`
          );
        } else if (errorName === "ZeroAmount") {
          setMintError(
            `Mint failed: The amount you're trying to mint ($${
              Number(amount) / 1e6
            }) would result in 0 tokens. The bonding curve price is too high for this amount. Please try a larger amount.`
          );
        } else {
          const errorMsg =
            errorName ||
            error?.shortMessage ||
            error?.message ||
            String(simError);
          addDebug(`Simulation failed: ${errorMsg}`);
          setMintError(
            `Mint will fail: ${errorMsg}. Please check allowance and dish existence.`
          );
        }
        setMintStep("idle");
        return;
      }

      // If simulation passed, send the actual transaction
      addDebug("Simulation passed, sending mint transaction...");
      sendMintCalls({
        calls: [
          {
            to: TMAP_DISHES_ADDRESS,
            data: encodeFunctionData({
              abi: tmapDishesAbi,
              functionName: "mint",
              args: [dishIdBytes32, amount, referrerAddress],
            }),
          },
        ],
      });
      addDebug("sendMintCalls executed successfully");
    } catch (err) {
      console.error("Error in sendMintCalls:", err);
      addDebug(`Error calling sendMintCalls: ${err}`);
      setMintError(`Failed to send mint: ${err}`);
      setMintStep("idle");
    }
  };

  // Watch for triggerMint flag
  useEffect(() => {
    if (triggerMint && usdcAmountToMint > 0) {
      setTriggerMint(false);
      (async () => {
        await startMint(usdcAmountToMint);
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerMint, usdcAmountToMint]);

  // Watch for mintCallsId to be set (confirms transaction was submitted)
  useEffect(() => {
    if (mintCallsId?.id) {
      addDebug(`Mint call ID received: ${mintCallsId.id.slice(0, 10)}...`);
    }
  }, [mintCallsId?.id]);

  // Watch for mint completion
  useEffect(() => {
    // Log when mintStatus changes
    if (mintStep === "minting") {
      if (!mintCallsId?.id) {
        // Call ID not set yet, still waiting
        return;
      }

      if (!mintStatus) {
        addDebug("Waiting for mint status...");
        return;
      }

      console.log("Mint status full:", mintStatus);
      addDebug(`Mint status: ${mintStatus.status || "undefined"}`);

      if (isStatusSuccess(mintStatus)) {
        addDebug("Mint complete! Updating dish stats...");

        // Update dish stats in database (including referrer for reputation tracking)
        if (
          lastMintAmount &&
          lastTokensReceived !== null &&
          userFid &&
          address
        ) {
          (async () => {
            try {
              const mintRes = await fetch("/api/dish/mint", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  dishId,
                  minterFid: userFid,
                  minterAddress: address,
                  usdcAmount: Number(lastMintAmount) / 1e6,
                  tokensReceived: lastTokensReceived,
                  referrerFid: referrerFid ? parseInt(referrerFid) : null,
                }),
              });

              const mintData = await mintRes.json();
              if (!mintRes.ok) {
                console.error("Failed to update dish stats:", mintData.error);
                addDebug(
                  `Warning: Could not update dish stats: ${mintData.error}`
                );
              } else {
                addDebug("Dish stats updated successfully!");
                if (referrerFid) {
                  addDebug(`Referrer (FID: ${referrerFid}) credited with referral!`);
                }
              }
            } catch (err) {
              console.error("Error updating dish stats:", err);
              addDebug(`Warning: Could not update dish stats: ${err}`);
            }
          })();
        }

        setMintStep("complete");

        // Refresh data
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else if (mintStatus.status === "failure") {
        // Get more details
        const receipts = mintStatus.receipts as
          | Array<{ transactionHash?: string; status?: string | number }>
          | undefined;
        const txHash = receipts?.[0]?.transactionHash;
        const receiptStatus = receipts?.[0]?.status;
        addDebug(
          `Failure - tx: ${txHash || "none"}, status: ${
            receiptStatus || "none"
          }`
        );

        // Check if receipts show success despite overall failure status
        if (receipts && receipts.length > 0) {
          const allSuccess = receipts.every((r) => {
            const s = r.status;
            return s === "success" || s === "0x1" || s === 1 || s === "1";
          });
          if (allSuccess) {
            addDebug("All receipts successful despite failure status!");
            setMintStep("complete");

            // Update database with mint info (including referrer for reputation)
            if (lastMintAmount && lastTokensReceived !== null && userFid && address) {
              fetch("/api/dish/mint", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  dishId,
                  minterFid: userFid,
                  minterAddress: address,
                  usdcAmount: Number(lastMintAmount) / 1e6,
                  tokensReceived: lastTokensReceived,
                  referrerFid: referrerFid ? parseInt(referrerFid) : null,
                }),
              }).catch((err) => console.error("Error updating mint in DB:", err));
            }

            setTimeout(() => {
              window.location.reload();
            }, 2000);
            return;
          }
        }

        setMintError(
          txHash
            ? `Mint failed. Tx: ${txHash.slice(
                0,
                10
              )}... Status: ${receiptStatus}`
            : "Mint failed - no transaction sent"
        );
        setMintStep("idle");
      } else if (mintStatus.status === "pending") {
        addDebug("Mint still pending...");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mintStatus, mintStep]);

  // Watch for mint error (call failed to send)
  useEffect(() => {
    if (mintCallError) {
      console.log("Mint call error:", mintCallError);
      addDebug(`Mint call error: ${mintCallError.message || "Unknown"}`);
      if (mintStep === "minting") {
        setMintError(
          mintCallError.message || "Mint transaction failed to send"
        );
        setMintStep("idle");
      }
    }
  }, [mintCallError, mintStep]);

  // Calculate estimated cost for display (actual cost is calculated dynamically in handleMint)
  const currentPrice = onChainPrice ?? dish?.currentPrice ?? 0.1;
  const totalCost = (currentPrice * backAmount).toFixed(2);

  // Handle mint - using separate calls like create page
  const handleMint = async () => {
    if (!isConnected || !address || !dishId) {
      setMintError("Please connect your wallet");
      return;
    }

    if (backAmount < 1) {
      setMintError("Amount must be at least 1");
      return;
    }

    if (!dishId) {
      setMintError("Dish ID not found");
      return;
    }

    setMintError("");
    resetApprove();
    resetMint();
    setTriggerMint(false);
    setMintStep("checking");

    addDebug(`DishId: ${dishId.slice(0, 10)}...`);
    addDebug(`Backing ${backAmount} token(s)...`);

    try {
      // Convert string dishId to bytes32 for contract
      const dishIdBytes32 = stringToBytes32(dishId);

      // Calculate the actual mint cost dynamically using getMintCost
      let calculatedMintAmount: bigint;
      try {
        addDebug(`Calculating mint cost for ${backAmount} token(s)...`);
        calculatedMintAmount = await publicClient.readContract({
          address: TMAP_DISHES_ADDRESS,
          abi: tmapDishesAbi,
          functionName: "getMintCost",
          args: [dishIdBytes32, BigInt(backAmount)],
        });

        // Get tokens that will be received
        const [tokensReceived] = await publicClient.readContract({
          address: TMAP_DISHES_ADDRESS,
          abi: tmapDishesAbi,
          functionName: "getTokensForUsdc",
          args: [dishIdBytes32, calculatedMintAmount],
        });
        setLastTokensReceived(Number(tokensReceived));

        addDebug(
          `Mint cost: $${
            Number(calculatedMintAmount) / 1e6
          } USDC (for ${backAmount} token(s), will receive ${tokensReceived.toString()} tokens)`
        );
      } catch (err) {
        console.error("Error calculating mint cost:", err);
        addDebug(`Error calculating mint cost: ${err}`);
        setMintError("Failed to calculate mint cost. Please try again.");
        setMintStep("idle");
        return;
      }

      // Check balance
      if (userBalance < Number(calculatedMintAmount) / 1e6) {
        setMintError(
          `Insufficient USDC. You have $${userBalance.toFixed(2)}, need $${(
            Number(calculatedMintAmount) / 1e6
          ).toFixed(2)}`
        );
        setMintStep("idle");
        return;
      }

      // Set the calculated amount for minting
      setUsdcAmountToMint(calculatedMintAmount);
      setLastMintAmount(calculatedMintAmount);

      // Check allowance
      const currentAllowance = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [address, TMAP_DISHES_ADDRESS],
      });

      addDebug(`Allowance: ${Number(currentAllowance) / 1e6} USDC`);

      const needsApproval = currentAllowance < calculatedMintAmount;

      // Add approve call if needed
      if (needsApproval) {
        // Start with approve, mint will be triggered via useEffect
        addDebug("Needs approval, starting approve...");
        setMintStep("approving");
        sendApproveCalls({
          calls: [
            {
              to: USDC_ADDRESS,
              data: encodeFunctionData({
                abi: erc20Abi,
                functionName: "approve",
                args: [
                  TMAP_DISHES_ADDRESS,
                  calculatedMintAmount * BigInt(1000),
                ],
              }),
            },
          ],
        });
      } else {
        // No approval needed, go directly to mint via trigger
        addDebug("No approval needed, triggering mint...");
        setTriggerMint(true);
      }
    } catch (err) {
      console.error("Error minting:", err);
      addDebug(`Error: ${err}`);
      setMintError(err instanceof Error ? err.message : "Failed to mint");
      setMintStep("idle");
    }
  };

  const isMinting = mintStep !== "idle" && mintStep !== "complete";

  const getButtonText = () => {
    switch (mintStep) {
      case "checking":
        return "Checking...";
      case "approving":
        return "Approving USDC...";
      case "minting":
        return "Minting...";
      case "complete":
        return "Success!";
      default:
        return `Back for $${totalCost}`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-semibold text-gray-900">
            Loading dish...
          </div>
        </div>
      </div>
    );
  }

  if (!dish) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-semibold text-gray-900">
            Dish not found
          </div>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-xl"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Image */}
      <div className="relative h-72">
        <img
          src={
            dish.image ||
            "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800"
          }
          alt={dish.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent" />

        {/* Back/Home button - goes to home if no history (e.g., opened from Farcaster cast) */}
        <button
          onClick={() => navigateBack(router, "/")}
          className="absolute top-4 left-4 p-2 rounded-full bg-white/90 backdrop-blur-sm hover:bg-white transition-colors shadow-sm"
        >
          <svg
            className="w-5 h-5 text-gray-700"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        {/* Action buttons */}
        <div className="absolute top-4 right-4 flex gap-2">
          {/* Wishlist/Heart button */}
          <button
            onClick={handleWishlistToggle}
            disabled={wishlistLoading}
            className={`p-2 rounded-full backdrop-blur-sm transition-colors shadow-sm ${
              isWishlisted
                ? "bg-red-500 text-white hover:bg-red-600"
                : "bg-white/90 hover:bg-white text-gray-700"
            } disabled:opacity-50`}
          >
            <svg
              className="w-5 h-5"
              fill={isWishlisted ? "currentColor" : "none"}
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </button>

          {/* Share button */}
          <button
            onClick={handleShare}
            disabled={isSharing}
            className="p-2 rounded-full bg-white/90 backdrop-blur-sm hover:bg-white transition-colors shadow-sm disabled:opacity-50"
          >
            {isSharing ? (
              <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
            ) : (
              <svg
                className="w-5 h-5 text-gray-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                />
              </svg>
            )}
          </button>
        </div>

        {/* Dish name overlay */}
        <div className="absolute bottom-8 left-4 right-4">
          <h1 className="text-2xl font-bold text-white">{dish.name}</h1>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-t-3xl -mt-4 relative">
        <div className="px-4 py-4">
          {/* Restaurant & Creator Info */}
          <div className="flex items-center justify-between mb-4">
            <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => router.push(`/restaurant/${dish.restaurant}`)}
            >
              <img
                src={
                  dish.restaurantImage ||
                  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=100"
                }
                alt={dish.restaurantName || "Restaurant"}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div>
                <p className="font-medium text-gray-900">
                  {dish.restaurantName}
                </p>
                <p className="text-sm text-gray-500">
                  {dish.restaurantAddress}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Created by</p>
              <p className="text-sm font-medium text-primary-dark">
                @{dish.creatorUsername}
              </p>
            </div>
          </div>

          {/* Description */}
          {dish.description && (
            <p className="text-gray-600 mb-4">{dish.description}</p>
          )}

          {/* Stats Grid */}
          <div className="bg-gray-50 rounded-2xl p-4 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Current Price</p>
                <p className="text-2xl font-bold text-green-600">
                  ${currentPrice.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Market Cap</p>
                <p className="text-2xl font-bold text-gray-900">
                  $
                  {(
                    dish.marketCap || currentPrice * (dish.currentSupply || 0)
                  ).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">24h Volume</p>
                <p className="text-lg font-semibold text-gray-900">
                  ${dish.dailyVolume?.toFixed(2) || "0.00"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Total Holders</p>
                <p className="text-lg font-semibold text-gray-900">
                  {dish.totalHolders || 0}
                </p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {(dish.dailyPriceChange ?? 0) >= 0 ? (
                  <>
                    <svg
                      className="w-4 h-4 text-green-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                      />
                    </svg>
                    <span className="font-medium text-green-600">
                      Up {dish.dailyPriceChange || 0}% today
                    </span>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4 text-red-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6"
                      />
                    </svg>
                    <span className="font-medium text-red-600">
                      Down {Math.abs(dish.dailyPriceChange ?? 0)}% today
                    </span>
                  </>
                )}
              </div>
              <div className="text-sm text-gray-500">
                Supply: {dish.currentSupply || 0}
              </div>
            </div>
          </div>

          {/* Your Holdings */}
          {dish.yourHolding && dish.yourHolding > 0 && (
            <div className="bg-primary-softer border border-primary rounded-2xl p-4 mb-6">
              <h3 className="font-semibold text-gray-900 mb-2">
                Your Holdings
              </h3>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-500">
                    {dish.yourHolding} tokens
                  </p>
                  <p className="text-lg font-bold text-primary-dark">
                    ${(dish.yourValue || 0).toFixed(2)}
                  </p>
                </div>
                <button className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Cash Out
                </button>
              </div>
            </div>
          )}

          {/* Back More Section */}
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-6">
            <h3 className="font-semibold text-slate-900 mb-4">
              Back this dish
            </h3>

            {/* USDC Balance */}
            {isConnected && (
              <div className="mb-4 flex justify-between items-center">
                <span className="text-sm text-slate-500">
                  Your USDC Balance:{" "}
                  <span className="font-medium text-slate-700">${userBalance.toFixed(2)}</span>
                </span>
                {address && (
                  <InlineFaucetButton
                    walletAddress={address}
                    onSuccess={fetchUsdcBalance}
                  />
                )}
              </div>
            )}

            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={() => setBackAmount(Math.max(1, backAmount - 1))}
                disabled={isMinting}
                className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors disabled:opacity-50"
              >
                <span className="text-xl text-slate-600">−</span>
              </button>
              <div className="flex-1 text-center">
                <p className="text-3xl font-bold text-slate-900">
                  {backAmount}
                </p>
                <p className="text-sm text-slate-500">Stamps</p>
              </div>
              <button
                onClick={() => setBackAmount(backAmount + 1)}
                disabled={isMinting}
                className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors disabled:opacity-50"
              >
                <span className="text-xl text-slate-600">+</span>
              </button>
            </div>

            {/* Mint Error */}
            {mintError && (
              <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 mb-4">
                <p className="text-sm text-rose-600">{mintError}</p>
              </div>
            )}

            {/* Success Message */}
            {mintStep === "complete" && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 mb-4">
                <div className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-emerald-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <p className="text-sm text-emerald-700">
                    Successfully minted! Refreshing...
                  </p>
                </div>
              </div>
            )}

            {/* Minting Progress */}
            {isMinting && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
                  <p className="text-sm text-indigo-700">
                    {mintStep === "checking" && "Preparing transaction..."}
                    {mintStep === "approving" && "Approving USDC..."}
                    {mintStep === "minting" && "Minting tokens..."}
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={handleMint}
              disabled={isMinting || !isConnected}
              className="w-full btn-primary font-semibold py-4 rounded-xl disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isMinting && (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {!isConnected ? "Connect Wallet to Mint" : getButtonText()}
            </button>
            <p className="text-center text-xs text-slate-500 mt-2">
              Max $10 per dish
            </p>
          </div>

          {/* Share Referral */}
          <button
            onClick={handleShare}
            disabled={isSharing}
            className="w-full border-2 border-dashed border-gray-200 rounded-xl p-4 flex items-center justify-center gap-2 text-gray-600 hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
          >
            {isSharing ? (
              <div className="w-5 h-5 border-2 border-gray-300 border-t-primary rounded-full animate-spin" />
            ) : (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                />
              </svg>
            )}
            {isSharing ? "Opening composer..." : "Share referral & earn 2.5%"}
          </button>
        </div>
      </div>
    </div>
  );
}
