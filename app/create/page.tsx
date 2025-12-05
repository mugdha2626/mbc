"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/app/components/layout/BottomNav";
import { getCurrentPosition, isWithinRange } from "@/lib/geo";
import getFid from "@/app/providers/Fid";
import { Fid, Restaurant } from "@/app/interface";
import { useFarcaster } from "@/app/providers/FarcasterProvider";
import {
  zeroAddress,
  type Hash,
  type Address,
  encodeFunctionData,
  parseAbi,
  createPublicClient,
  http,
  stringToBytes,
  pad,
  toHex,
} from "viem";
import { baseSepolia } from "viem/chains";
import { useAccount, useSendCalls, useCallsStatus } from "wagmi";
import {
  TMAP_DISHES_ADDRESS,
  USDC_ADDRESS,
  INITIAL_MINT_AMOUNT,
} from "@/lib/contracts";

// ABIs
const erc20Abi = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
]);

const tmapDishesAbi = parseAbi([
  "function createDish(bytes32 dishId, string metadata)",
  "function mint(bytes32 dishId, uint256 usdcAmount, address referrer)",
  "function getRemainingAllowance(address user, bytes32 dishId) view returns (uint256)",
  "function getTokensForUsdc(bytes32 dishId, uint256 usdcAmount) view returns (uint256 tokenAmount, uint256 actualCost)",
  "function getCurrentPrice(bytes32 dishId) view returns (uint256)",
  "function getMintCost(bytes32 dishId, uint256 tokenAmount) view returns (uint256)",
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

type CreateStep =
  | "idle"
  | "checking"
  | "approving" // Waiting for approve
  | "creating" // Waiting for createDish
  | "minting" // Waiting for mint
  | "saving"
  | "complete";

export default function CreatePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  useFarcaster();

  // Wagmi hooks
  const { address, isConnected } = useAccount();

  // Call 1: Approve
  const {
    sendCalls: sendApproveCalls,
    data: approveCallsId,
    isPending: isApprovePending,
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

  // Call 2: CreateDish
  const {
    sendCalls: sendCreateDishCalls,
    data: createDishCallsId,
    isPending: isCreateDishPending,
    error: createDishError,
    reset: resetCreateDish,
  } = useSendCalls();

  const { data: createDishStatus } = useCallsStatus({
    id: createDishCallsId?.id ?? "",
    query: {
      enabled: !!createDishCallsId?.id,
      refetchInterval: (data) => {
        if (data.state.data?.status === "success") return false;
        return 2000;
      },
    },
  });

  // Call 3: Mint
  const {
    sendCalls: sendMintCalls,
    data: mintCallsId,
    isPending: isMintPending,
    error: mintError,
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

  // Step 1: Restaurant search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Restaurant[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] =
    useState<Restaurant | null>(null);

  // Step 2: Location verification
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    verified: boolean;
    distance: number;
  } | null>(null);
  const [verificationError, setVerificationError] = useState("");

  // Step 3: Dish details
  const [dishName, setDishName] = useState("");
  const [dishDescription, setDishDescription] = useState("");

  // Step 4: Creating
  const [createStep, setCreateStep] = useState<CreateStep>("idle");
  const [createError, setCreateError] = useState("");
  const [dishId, setDishId] = useState<Hash | null>(null);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  // Track what operations are needed (used in useEffect chain)
  const [needsCreateDish, setNeedsCreateDish] = useState(false);

  // Flag to trigger direct mint (when skipping approve and createDish)
  const [triggerDirectMint, setTriggerDirectMint] = useState(false);

  // Get user's current location for biased search
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // User's Farcaster FID
  const [userFid, setUserFid] = useState<Fid | undefined>(undefined);

  useEffect(() => {
    getFid().then((fid) => setUserFid(fid));
    getCurrentPosition()
      .then((pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      })
      .catch(() => {});
  }, []);

  // Helper to add debug info
  const addDebug = (msg: string) => {
    setDebugInfo((prev) => [...prev, msg]);
    console.log("[Debug]", msg);
  };

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

  // Check if status indicates success
  const isStatusSuccess = (
    status:
      | { status?: string; receipts?: Array<{ status?: string | number }> }
      | undefined
  ) => {
    if (!status) return false;
    if (status.status === "success") return true;

    // Check receipts
    const receipts = status.receipts;
    if (receipts && receipts.length > 0) {
      return receipts.every((r) => {
        const s = r.status;
        return s === "success" || s === "0x1" || s === 1 || s === "1";
      });
    }
    return false;
  };

  // Watch for approve completion -> go to createDish or mint
  useEffect(() => {
    if (createStep === "approving" && approveStatus) {
      console.log("Approve status:", approveStatus);

      if (isStatusSuccess(approveStatus)) {
        addDebug("Approve complete!");
        // Next: createDish if needed, otherwise mint
        if (needsCreateDish) {
          startCreateDish();
        } else {
          startMint();
        }
      } else if (approveStatus.status === "failure") {
        setCreateError("Approve failed");
        setCreateStep("idle");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approveStatus, createStep]);

  // Watch for createDish completion -> go to mint
  useEffect(() => {
    if (createStep === "creating" && createDishStatus) {
      console.log("CreateDish status:", createDishStatus);

      if (isStatusSuccess(createDishStatus)) {
        addDebug("CreateDish complete!");
        startMint();
      } else if (createDishStatus.status === "failure") {
        setCreateError("CreateDish failed");
        setCreateStep("idle");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createDishStatus, createStep]);

  // Watch for mintCallsId to be set (confirms transaction was submitted)
  useEffect(() => {
    if (createStep === "minting") {
      if (mintCallsId?.id) {
        addDebug(`Mint call ID received: ${mintCallsId.id.slice(0, 10)}...`);
      } else {
        // If we're in minting step but no call ID after a delay, something went wrong
        const timer = setTimeout(() => {
          if (createStep === "minting" && !mintCallsId?.id) {
            addDebug("Warning: Still waiting for mint call ID...");
          }
        }, 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [mintCallsId?.id, createStep]);

  // Watch for mint completion -> save to database
  useEffect(() => {
    if (createStep === "minting") {
      // Wait for mintCallsId to be set
      if (!mintCallsId?.id) {
        return;
      }

      if (!mintStatus) {
        addDebug("Waiting for mint status...");
        return;
      }

      console.log("Mint status full:", mintStatus);
      addDebug(`Mint status: ${mintStatus.status || "undefined"}`);

      if (isStatusSuccess(mintStatus)) {
        addDebug("Mint complete! Saving...");
        setCreateStep("saving");
        saveToDatabase();
      } else if (mintStatus.status === "failure") {
        // Log the full status object for debugging
        console.log(
          "Mint failure - full status object:",
          JSON.stringify(
            mintStatus,
            (_, v) => (typeof v === "bigint" ? v.toString() : v),
            2
          )
        );

        const receipts = mintStatus.receipts as
          | Array<{ transactionHash?: string; status?: string | number }>
          | undefined;

        // Check for error message in status object
        const statusWithError = mintStatus as {
          error?: { message?: string };
          message?: string;
        };
        const errorMessage =
          statusWithError.error?.message || statusWithError.message;
        if (errorMessage) {
          addDebug(`Error message: ${errorMessage}`);
        }

        // Check if receipts show success despite overall failure status
        if (receipts && receipts.length > 0) {
          const allSuccess = receipts.every((r) => {
            const s = r.status;
            return s === "success" || s === "0x1" || s === 1 || s === "1";
          });

          if (allSuccess) {
            addDebug("All receipts successful despite failure status!");
            setCreateStep("saving");
            saveToDatabase();
            return;
          }

          const txHash = receipts[0]?.transactionHash || "none";
          const receiptStatus = receipts[0]?.status;
          addDebug(
            `Failure - tx: ${txHash || "none"}, status: ${
              receiptStatus || "none"
            }`
          );
          setCreateError(
            txHash !== "none"
              ? `Mint failed. Tx: ${txHash.slice(
                  0,
                  10
                )}... Status: ${receiptStatus}`
              : "Mint failed - no transaction sent"
          );
        } else {
          // No receipts - transaction might not have been sent or failed early
          addDebug("No receipts in failure response");
          addDebug(`Status keys: ${Object.keys(mintStatus).join(", ")}`);
          addDebug(`mintCallsId exists: ${!!mintCallsId?.id}`);

          // Check for any error details in the status object
          const statusWithDetails = mintStatus as {
            error?: { message?: string };
            reason?: string;
          };
          const statusError =
            statusWithDetails.error ||
            (statusWithDetails.reason
              ? { message: statusWithDetails.reason }
              : undefined);
          if (statusError) {
            addDebug(`Status error: ${JSON.stringify(statusError)}`);
          }

          // If we have a call ID but no receipts, the transaction might have been rejected or reverted
          if (mintCallsId?.id) {
            addDebug(
              "Call ID exists but no receipts - transaction may have been rejected or reverted"
            );
            const errorMsg =
              errorMessage ||
              statusError?.message ||
              "Transaction was rejected or reverted";
            setCreateError(
              `Mint failed: ${errorMsg}. Please check if you have sufficient USDC allowance and the dish exists on-chain.`
            );
          } else {
            // This shouldn't happen if mintStatus exists, but handle it anyway
            addDebug("No call ID - transaction was never sent");
            setCreateError(
              "Mint transaction failed to send. Please check your wallet connection."
            );
          }
        }
        setCreateStep("idle");
      } else if (mintStatus.status === "pending") {
        addDebug("Mint still pending...");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mintStatus, createStep, mintCallsId?.id]);

  // Watch for errors
  useEffect(() => {
    if (approveError && createStep === "approving") {
      setCreateError(approveError.message || "Approve failed");
      setCreateStep("idle");
    }
  }, [approveError, createStep]);

  useEffect(() => {
    if (createDishError && createStep === "creating") {
      setCreateError(createDishError.message || "CreateDish failed");
      setCreateStep("idle");
    }
  }, [createDishError, createStep]);

  useEffect(() => {
    if (mintError && createStep === "minting") {
      console.error("Mint call error:", mintError);
      addDebug(`Mint call error: ${mintError.message || "Unknown"}`);
      setCreateError(mintError.message || "Mint transaction failed to send");
      setCreateStep("idle");
    }
  }, [mintError, createStep]);

  // Watch for direct mint trigger (when skipping approve and createDish)
  useEffect(() => {
    if (triggerDirectMint && dishId) {
      setTriggerDirectMint(false);
      startMint();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerDirectMint, dishId]);

  // Start createDish call
  const startCreateDish = () => {
    if (!dishId || !TMAP_DISHES_ADDRESS || !selectedRestaurant) return;

    addDebug("Sending createDish...");
    setCreateStep("creating");

    const metadata = JSON.stringify({
      name: dishName.trim(),
      description: dishDescription.trim() || "",
      restaurant: selectedRestaurant.name,
      restaurantId: selectedRestaurant.id,
      creator: userFid,
    });

    // Convert string dishId to bytes32 for contract
    const dishIdBytes32 = stringToBytes32(dishId);

    sendCreateDishCalls({
      calls: [
        {
          to: TMAP_DISHES_ADDRESS,
          data: encodeFunctionData({
            abi: tmapDishesAbi,
            functionName: "createDish",
            args: [dishIdBytes32, metadata],
          }),
        },
      ],
    });
  };

  // Start mint call
  const startMint = async () => {
    if (!dishId || !TMAP_DISHES_ADDRESS || !address) {
      addDebug(
        "Cannot mint: missing dishId, contract address, or wallet address"
      );
      return;
    }

    addDebug("Sending mint to dish ID: " + dishId);
    setCreateStep("minting");

    try {
      // Convert string dishId to bytes32 for contract
      const dishIdBytes32 = stringToBytes32(dishId);
      addDebug(`Converted dishId to bytes32: ${dishIdBytes32.slice(0, 10)}...`);

      // Verify dish exists on-chain before minting (check first, before calculating cost)
      let dishExists = false;
      let retries = 0;
      const maxRetries = 5;

      while (!dishExists && retries < maxRetries) {
        try {
          addDebug(
            `Verifying dish exists on-chain... (attempt ${
              retries + 1
            }/${maxRetries})`
          );
          const onChainDish = await publicClient.readContract({
            address: TMAP_DISHES_ADDRESS,
            abi: [
              {
                name: "dishes",
                type: "function",
                stateMutability: "view",
                inputs: [{ name: "", type: "bytes32" }],
                outputs: [
                  { name: "creator", type: "address" },
                  { name: "totalSupply", type: "uint256" },
                  { name: "createdAt", type: "uint256" },
                  { name: "metadata", type: "string" },
                  { name: "exists", type: "bool" },
                ],
              },
            ] as const,
            functionName: "dishes",
            args: [dishIdBytes32],
          });
          dishExists = onChainDish[4];
          addDebug(`Dish exists on-chain: ${dishExists}`);

          if (dishExists) {
            break;
          }

          // If dish doesn't exist and we haven't exhausted retries, wait and retry
          if (retries < maxRetries - 1) {
            addDebug(`Dish not found yet, waiting 1 second before retry...`);
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
          retries++;
        } catch (err) {
          console.error("Error checking dish existence:", err);
          addDebug(`Error checking dish: ${err}`);
          // If it's a contract error (dish doesn't exist), retry
          if (retries < maxRetries - 1) {
            addDebug(`Error occurred, waiting 1 second before retry...`);
            await new Promise((resolve) => setTimeout(resolve, 1000));
            retries++;
          } else {
            setCreateError("Failed to verify dish existence on-chain.");
            setCreateStep("idle");
            return;
          }
        }
      }

      if (!dishExists) {
        setCreateError(
          "Dish does not exist on-chain. The dish creation may not have been confirmed yet. Please try again."
        );
        setCreateStep("idle");
        return;
      }

      // Calculate the mint amount dynamically using getMintCost for 1 token
      let mintAmount: bigint;
      try {
        addDebug("Calculating mint amount for 1 token...");
        mintAmount = await publicClient.readContract({
          address: TMAP_DISHES_ADDRESS,
          abi: tmapDishesAbi,
          functionName: "getMintCost",
          args: [dishIdBytes32, BigInt(1)],
        });
        addDebug(`Mint amount: ${Number(mintAmount) / 1e6} USDC (for 1 token)`);
      } catch (err) {
        console.error("Error calculating mint amount:", err);
        addDebug(`Error calculating mint amount: ${err}`);
        setCreateError("Failed to calculate mint amount. Please try again.");
        setCreateStep("idle");
        return;
      }

      // Check USDC token allowance
      const finalAllowance = await checkAllowance(address, TMAP_DISHES_ADDRESS);
      addDebug(`USDC token allowance: ${Number(finalAllowance) / 1e6} USDC`);
      if (finalAllowance < mintAmount) {
        addDebug("USDC token allowance insufficient after approval!");
        setCreateError(
          `USDC token allowance is insufficient. Have ${
            Number(finalAllowance) / 1e6
          } USDC, need ${Number(mintAmount) / 1e6} USDC.`
        );
        setCreateStep("idle");
        return;
      }

      // Check remaining dish allowance (max $10 per user per dish)
      try {
        addDebug("Checking remaining dish allowance (max $10 per dish)...");
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

        if (remainingDishAllowance < mintAmount) {
          const spent = 10 - Number(remainingDishAllowance) / 1e6;
          setCreateError(
            `You've reached the $10 max spend limit for this dish. You've already spent $${spent.toFixed(
              2
            )}. Remaining: $${(Number(remainingDishAllowance) / 1e6).toFixed(
              2
            )}`
          );
          setCreateStep("idle");
          return;
        }
      } catch (err) {
        console.error("Error checking remaining dish allowance:", err);
        addDebug(`Error checking dish allowance: ${err}`);
        // Continue anyway - the simulation will catch it
      }

      // Check how many tokens will be minted with this amount
      try {
        addDebug("Checking how many tokens will be minted...");
        const [tokenAmount, actualCost] = await publicClient.readContract({
          address: TMAP_DISHES_ADDRESS,
          abi: tmapDishesAbi,
          functionName: "getTokensForUsdc",
          args: [dishIdBytes32, mintAmount],
        });
        addDebug(
          `Will mint ${tokenAmount.toString()} tokens for $${
            Number(actualCost) / 1e6
          } USDC`
        );

        if (tokenAmount === BigInt(0)) {
          // Check the current price to suggest minimum amount
          try {
            const currentPrice = await publicClient.readContract({
              address: TMAP_DISHES_ADDRESS,
              abi: tmapDishesAbi,
              functionName: "getCurrentPrice",
              args: [dishIdBytes32],
            });
            const minAmountForOneToken = await publicClient.readContract({
              address: TMAP_DISHES_ADDRESS,
              abi: tmapDishesAbi,
              functionName: "getMintCost",
              args: [dishIdBytes32, BigInt(1)],
            });
            setCreateError(
              `Mint failed: The amount you're trying to mint ($${
                Number(mintAmount) / 1e6
              }) would result in 0 tokens. The current price per token is $${
                Number(currentPrice) / 1e6
              }. You need at least $${
                Number(minAmountForOneToken) / 1e6
              } to mint 1 token.`
            );
          } catch {
            // If we can't get price info, show generic error
            setCreateError(
              `Mint failed: The amount you're trying to mint ($${
                Number(mintAmount) / 1e6
              }) would result in 0 tokens. This usually happens when the dish supply is high and the bonding curve price is too high. Please try a larger amount.`
            );
          }
          setCreateStep("idle");
          return;
        }
      } catch (err) {
        console.error("Error checking token amount:", err);
        addDebug(`Error checking token amount: ${err}`);
        // Continue anyway - the simulation will catch it
      }

      // Simulate the transaction first to check if it will succeed
      try {
        addDebug("Simulating mint transaction...");
        await publicClient.simulateContract({
          address: TMAP_DISHES_ADDRESS,
          abi: tmapDishesAbi,
          functionName: "mint",
          args: [dishIdBytes32, mintAmount, zeroAddress],
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

        // Extract error name (now that ABI includes errors, viem should decode it)
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
          setCreateError(
            `Mint failed: You've reached the $10 maximum spend limit for this dish. You cannot mint more tokens for this dish.`
          );
        } else if (errorName === "DishDoesNotExist") {
          setCreateError(
            `Mint failed: This dish does not exist on-chain. Please create the dish first.`
          );
        } else if (errorName === "ZeroAmount") {
          // Try to get current price for better error message
          try {
            const currentPrice = await publicClient.readContract({
              address: TMAP_DISHES_ADDRESS,
              abi: tmapDishesAbi,
              functionName: "getCurrentPrice",
              args: [dishIdBytes32],
            });
            const minAmountForOneToken = await publicClient.readContract({
              address: TMAP_DISHES_ADDRESS,
              abi: tmapDishesAbi,
              functionName: "getMintCost",
              args: [dishIdBytes32, BigInt(1)],
            });
            setCreateError(
              `Mint failed: The amount you're trying to mint ($${
                Number(mintAmount) / 1e6
              }) would result in 0 tokens. The current price per token is $${
                Number(currentPrice) / 1e6
              }. You need at least $${
                Number(minAmountForOneToken) / 1e6
              } to mint 1 token.`
            );
          } catch {
            // If we can't get price info, show generic error
            setCreateError(
              `Mint failed: The amount you're trying to mint ($${
                Number(mintAmount) / 1e6
              }) would result in 0 tokens. The bonding curve price is too high for this amount. Please try a larger amount.`
            );
          }
        } else {
          const errorMsg =
            errorName ||
            error?.shortMessage ||
            error?.message ||
            String(simError);
          addDebug(`Simulation failed: ${errorMsg}`);
          setCreateError(
            `Mint will fail: ${errorMsg}. Please check allowance and dish existence.`
          );
        }
        setCreateStep("idle");
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
              args: [dishIdBytes32, mintAmount, zeroAddress],
            }),
          },
        ],
      });
      addDebug("sendMintCalls executed");
    } catch (err) {
      console.error("Error in startMint:", err);
      addDebug(`Error calling sendMintCalls: ${err}`);
      setCreateError(`Failed to send mint: ${err}`);
      setCreateStep("idle");
    }
  };

  // Check if dish exists in database
  const checkDishExists = async (
    restaurantId: string,
    dishNameParam: string
  ) => {
    const params = new URLSearchParams({
      restaurantId,
      dishName: dishNameParam,
    });
    const res = await fetch(`/api/dish/create?${params}`);
    const data = await res.json();
    return { exists: data.exists || false, dishId: data.dishId };
  };

  // Check USDC allowance
  const checkAllowance = async (
    owner: Address,
    spender: Address
  ): Promise<bigint> => {
    try {
      if (!USDC_ADDRESS) return BigInt(0);
      return await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: "allowance",
        args: [owner, spender],
      });
    } catch {
      return BigInt(0);
    }
  };

  // Check USDC balance
  const checkBalance = async (owner: Address): Promise<bigint> => {
    try {
      if (!USDC_ADDRESS) return BigInt(0);
      return await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [owner],
      });
    } catch {
      return BigInt(0);
    }
  };

  // Save to database
  const saveToDatabase = async () => {
    if (!selectedRestaurant || !userFid || !dishId) return;

    try {
      const res = await fetch("/api/dish/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dishId,
          name: dishName.trim(),
          description: dishDescription.trim() || undefined,
          restaurantId: selectedRestaurant.id,
          restaurantName: selectedRestaurant.name,
          restaurantAddress: selectedRestaurant.address,
          restaurantLatitude: selectedRestaurant.latitude,
          restaurantLongitude: selectedRestaurant.longitude,
          creatorFid: userFid,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Failed to save dish (${res.status})`);
      }

      addDebug("Saved to database!");
      setCreateStep("complete");
      router.push(`/dish/${dishId}`);
    } catch (err) {
      console.error("Failed to save dish:", err);
      setCreateError(
        err instanceof Error ? err.message : "Failed to save dish"
      );
      setCreateStep("idle");
    }
  };

  // Main create dish handler
  const handleCreateDish = async () => {
    if (!selectedRestaurant || !dishName.trim()) return;
    if (!userFid) {
      setCreateError("Unable to get your Farcaster ID.");
      return;
    }
    if (!isConnected || !address) {
      setCreateError("Please connect your wallet first.");
      return;
    }
    if (!TMAP_DISHES_ADDRESS || !USDC_ADDRESS) {
      setCreateError("Contract addresses not configured.");
      return;
    }

    // Reset state
    setCreateError("");
    setDebugInfo([]);
    resetApprove();
    resetCreateDish();
    resetMint();
    setNeedsCreateDish(false);
    setTriggerDirectMint(false);
    setCreateStep("checking");

    addDebug(`TMAP: ${TMAP_DISHES_ADDRESS.slice(0, 10)}...`);
    addDebug(`USDC: ${USDC_ADDRESS.slice(0, 10)}...`);
    addDebug(`Wallet: ${address.slice(0, 10)}...`);

    try {
      // Check if dish exists
      const { exists, dishId: fetchedDishId } = await checkDishExists(
        selectedRestaurant.id,
        dishName
      );
      const targetDishId = fetchedDishId; // This is now a string like "restaurantId:dishName"
      setDishId(targetDishId);
      addDebug(`DishId: ${targetDishId}`);
      addDebug(`DB exists: ${exists}`);

      // Check balance
      const balance = await checkBalance(address);
      addDebug(`Balance: ${Number(balance) / 1e6} USDC`);
      if (balance < INITIAL_MINT_AMOUNT) {
        throw new Error(
          `Insufficient USDC. Need ${Number(INITIAL_MINT_AMOUNT) / 1e6} USDC.`
        );
      }

      // Check if dish exists on-chain
      // Convert string dishId to bytes32 for contract call
      const dishIdBytes32 = stringToBytes32(targetDishId);
      let dishExistsOnChain = false;
      try {
        const onChainDish = await publicClient.readContract({
          address: TMAP_DISHES_ADDRESS,
          abi: [
            {
              name: "dishes",
              type: "function",
              stateMutability: "view",
              inputs: [{ name: "", type: "bytes32" }],
              outputs: [
                { name: "creator", type: "address" },
                { name: "totalSupply", type: "uint256" },
                { name: "createdAt", type: "uint256" },
                { name: "metadata", type: "string" },
                { name: "exists", type: "bool" },
              ],
            },
          ] as const,
          functionName: "dishes",
          args: [dishIdBytes32],
        });
        dishExistsOnChain = onChainDish[4];
        addDebug(`On-chain: ${dishExistsOnChain}`);
      } catch (err) {
        console.error("Error checking on-chain dish:", err);
        addDebug(`On-chain check error: ${err}`);
        // Don't throw - just assume it doesn't exist on-chain
        dishExistsOnChain = false;
      }

      // Check allowance
      const allowance = await checkAllowance(address, TMAP_DISHES_ADDRESS);
      addDebug(`Allowance: ${Number(allowance) / 1e6} USDC`);
      const requiresCreateDish = !dishExistsOnChain;

      // Store what we need for the chain (used in useEffect)
      setNeedsCreateDish(requiresCreateDish);

      // Always approve before minting (even if allowance seems sufficient)
      // This ensures the approval is fresh and avoids any stale allowance issues
      addDebug("Starting with approve (always approve before minting)...");
      setCreateStep("approving");
      sendApproveCalls({
        calls: [
          {
            to: USDC_ADDRESS,
            data: encodeFunctionData({
              abi: erc20Abi,
              functionName: "approve",
              args: [TMAP_DISHES_ADDRESS, INITIAL_MINT_AMOUNT * BigInt(1000)],
            }),
          },
        ],
      });
    } catch (err) {
      console.error("Error:", err);
      setCreateError(err instanceof Error ? err.message : "Failed");
      setCreateStep("idle");
    }
  };

  // Search restaurants
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const params = new URLSearchParams({ q: searchQuery });
      if (userLocation) {
        params.set("lat", userLocation.lat.toString());
        params.set("lng", userLocation.lng.toString());
      }
      const res = await fetch(`/api/places/search?${params}`);
      const data = await res.json();
      if (data.places) setSearchResults(data.places);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setIsSearching(false);
    }
  };

  // Verify location
  const handleVerifyLocation = async () => {
    if (!selectedRestaurant) return;
    setIsVerifying(true);
    setVerificationError("");
    try {
      const position = await getCurrentPosition();
      const result = isWithinRange(
        position.coords.latitude,
        position.coords.longitude,
        selectedRestaurant.latitude,
        selectedRestaurant.longitude,
        200
      );
      setVerificationResult({
        verified: result.isValid,
        distance: result.distance,
      });
      if (result.isValid) setTimeout(() => setStep(3), 1500);
    } catch {
      setVerificationError("Could not get your location.");
    } finally {
      setIsVerifying(false);
    }
  };

  const getButtonText = () => {
    switch (createStep) {
      case "checking":
        return "Checking...";
      case "approving":
        return "Approving...";
      case "creating":
        return "Creating...";
      case "minting":
        return "Minting...";
      case "saving":
        return "Saving...";
      case "complete":
        return "Complete!";
      default:
        return "Create Token";
    }
  };

  const getProgressMessage = () => {
    switch (createStep) {
      case "checking":
        return "Checking dish and wallet...";
      case "approving":
        return "Please approve USDC spending...";
      case "creating":
        return "Please confirm dish creation...";
      case "minting":
        return "Please confirm minting...";
      case "saving":
        return "Saving to database...";
      default:
        return "";
    }
  };

  const isCreating = createStep !== "idle" && createStep !== "complete";
  const displayError =
    createError ||
    approveError?.message ||
    createDishError?.message ||
    mintError?.message;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white px-4 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <button
            onClick={() => (step > 1 ? setStep(step - 1) : router.back())}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
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
          <h1 className="text-lg font-semibold text-gray-900">
            Create Dish Token
          </h1>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="bg-white px-4 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between relative">
          <div className="absolute top-4 left-4 right-4 h-1 flex">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`flex-1 h-1 ${
                  s < step ? "bg-green-500" : "bg-gray-200"
                }`}
              />
            ))}
          </div>
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium z-10 ${
                s < step
                  ? "bg-green-500 text-white"
                  : s === step
                  ? "btn-primary"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {s < step ? (
                <svg
                  className="w-4 h-4"
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
              ) : (
                s
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>Search</span>
          <span>Verify</span>
          <span>Details</span>
          <span>Create</span>
        </div>
      </div>

      {/* Step Content */}
      <div className="p-4">
        {/* Step 1: Search */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Find the Restaurant
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                Search for the restaurant where you want to create a dish token.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Search restaurants..."
                  className="flex-1 bg-white border border-gray-200 rounded-xl py-3 px-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSearch}
                  disabled={isSearching || !searchQuery.trim()}
                  className="px-4 btn-primary disabled:bg-gray-200 rounded-xl"
                >
                  {isSearching ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            {searchResults.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-gray-500">
                  {searchResults.length} results
                </p>
                {searchResults.map((restaurant) => (
                  <button
                    key={restaurant.id}
                    onClick={() => {
                      setSelectedRestaurant(restaurant);
                      setStep(3);
                    }}
                    className={`w-full text-left bg-white border rounded-xl p-4 hover:border-blue-500 transition-colors ${
                      selectedRestaurant?.id === restaurant.id
                        ? "border-blue-500 ring-2 ring-blue-200"
                        : "border-gray-200"
                    }`}
                  >
                    <p className="font-medium text-gray-900">
                      {restaurant.name}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {restaurant.address}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Verify Location */}
        {step === 2 && selectedRestaurant && (
          <div className="space-y-6">
            <div className="text-center py-6">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-10 h-10 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Verify You{"'"}re There
              </h2>
              <p className="text-gray-500">
                You must be at{" "}
                <span className="font-medium">{selectedRestaurant.name}</span>{" "}
                to create a dish token.
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="font-medium text-gray-900">
                {selectedRestaurant.name}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {selectedRestaurant.address}
              </p>
            </div>
            {verificationError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                <p className="text-red-700">{verificationError}</p>
              </div>
            )}
            {verificationResult && !verificationResult.verified && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                <p className="font-medium text-red-800">
                  You{"'"}re too far away
                </p>
                <p className="text-sm text-red-600">
                  {verificationResult.distance}m away. Need to be within 200m.
                </p>
              </div>
            )}
            {verificationResult?.verified && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                <p className="font-medium text-green-800">Location Verified!</p>
                <p className="text-sm text-green-600">
                  {verificationResult.distance}m from restaurant.
                </p>
              </div>
            )}
            {!verificationResult?.verified && (
              <button
                onClick={handleVerifyLocation}
                disabled={isVerifying}
                className="w-full btn-primary disabled:opacity-60 font-semibold py-4 rounded-xl flex items-center justify-center gap-2"
              >
                {isVerifying ? "Checking..." : "Verify My Location"}
              </button>
            )}
          </div>
        )}

        {/* Step 3: Dish Details */}
        {step === 3 && selectedRestaurant && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Dish Details
              </h2>
              <div className="bg-gray-100 rounded-xl p-3 mb-4">
                <p className="text-xs text-gray-500">Restaurant</p>
                <p className="font-medium text-gray-900">
                  {selectedRestaurant.name}
                </p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dish Name *
                  </label>
                  <input
                    type="text"
                    value={dishName}
                    onChange={(e) => setDishName(e.target.value)}
                    placeholder="e.g., Truffle Mushroom Risotto"
                    className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description (optional)
                  </label>
                  <textarea
                    value={dishDescription}
                    onChange={(e) => setDishDescription(e.target.value)}
                    placeholder="Describe the dish..."
                    rows={3}
                    className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              </div>
            </div>
            <button
              onClick={() => setStep(4)}
              disabled={!dishName.trim()}
              className="w-full btn-primary disabled:bg-gray-200 disabled:text-gray-400 font-semibold py-4 rounded-xl"
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 4: Confirm & Create */}
        {step === 4 && selectedRestaurant && (
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                Review Your Token
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-500">Restaurant</span>
                  <span className="font-medium text-gray-900">
                    {selectedRestaurant.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Dish</span>
                  <span className="font-medium text-gray-900">{dishName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Network</span>
                  <span className="font-medium text-blue-600">
                    Base Sepolia
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Mint Amount</span>
                  <span className="font-medium text-gray-900">$0.10 USDC</span>
                </div>
              </div>
            </div>

            {/* Progress Info */}
            {isCreating && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                  <p className="font-medium text-blue-800">
                    {getProgressMessage()}
                  </p>
                </div>
              </div>
            )}

            {/* Debug Info */}
            {debugInfo.length > 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                <p className="text-xs text-gray-500 font-medium mb-1">
                  Progress:
                </p>
                <div className="text-xs text-gray-600 space-y-0.5 font-mono">
                  {debugInfo.map((info, i) => (
                    <p key={i}>{info}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Error */}
            {displayError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-red-700 text-sm">{displayError}</p>
              </div>
            )}

            <button
              onClick={handleCreateDish}
              disabled={
                isCreating ||
                isApprovePending ||
                isCreateDishPending ||
                isMintPending
              }
              className="w-full btn-primary disabled:opacity-60 font-semibold py-4 rounded-xl flex items-center justify-center gap-2"
            >
              {isCreating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {getButtonText()}
                </>
              ) : (
                "Create Token"
              )}
            </button>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
