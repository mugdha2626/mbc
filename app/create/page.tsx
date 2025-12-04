"use client";

import { useState, useEffect, useRef } from "react";
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
]);

// Public client for reading
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

type CreateStep =
  | "idle"
  | "checking"
  | "sendingSetup" // Sending approve + createDish
  | "waitingSetup" // Waiting for approve + createDish
  | "sendingMint" // Sending mint
  | "waitingMint" // Waiting for mint
  | "saving"
  | "complete";

export default function CreatePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  useFarcaster();

  // Wagmi hooks
  const { address, isConnected } = useAccount();

  // First call: Setup (approve + createDish)
  const {
    sendCalls: sendSetupCalls,
    data: setupCallsId,
    isPending: isSetupPending,
    error: setupError,
    reset: resetSetup,
  } = useSendCalls();

  const { data: setupStatus } = useCallsStatus({
    id: setupCallsId?.id ?? "",
    query: {
      enabled: !!setupCallsId?.id,
      refetchInterval: (data) => {
        if (data.state.data?.status === "success") return false;
        return 2000;
      },
    },
  });

  // Second call: Mint
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

  // Track mint triggered state with ref to avoid race conditions
  const mintTriggeredRef = useRef(false);

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

  // Watch for setup calls to be submitted
  useEffect(() => {
    if (setupCallsId?.id && createStep === "sendingSetup") {
      addDebug(`Setup calls submitted: ${setupCallsId.id.slice(0, 10)}...`);
      setCreateStep("waitingSetup");
    }
  }, [setupCallsId?.id, createStep]);

  // Watch for setup completion -> trigger mint
  useEffect(() => {
    if (
      createStep === "waitingSetup" &&
      setupStatus &&
      !mintTriggeredRef.current
    ) {
      console.log("Setup status:", setupStatus);

      if (isStatusSuccess(setupStatus)) {
        addDebug("Setup complete! Starting mint...");
        mintTriggeredRef.current = true;
        triggerMint();
      } else if (setupStatus.status === "failure") {
        const receipts = setupStatus.receipts as
          | Array<{ transactionHash?: string }>
          | undefined;
        const txHash = receipts?.[0]?.transactionHash || "unknown";
        setCreateError(`Setup failed. Tx: ${txHash}`);
        setCreateStep("idle");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setupStatus, createStep]);

  // Watch for mint calls to be submitted
  useEffect(() => {
    if (mintCallsId?.id && createStep === "sendingMint") {
      addDebug(`Mint call submitted: ${mintCallsId.id.slice(0, 10)}...`);
      setCreateStep("waitingMint");
    }
  }, [mintCallsId?.id, createStep]);

  // Watch for mint completion -> save to database
  useEffect(() => {
    if (createStep === "waitingMint" && mintStatus) {
      console.log("Mint status:", mintStatus);

      if (isStatusSuccess(mintStatus)) {
        addDebug("Mint complete! Saving to database...");
        setCreateStep("saving");
        saveToDatabase();
      } else if (mintStatus.status === "failure") {
        const receipts = mintStatus.receipts as
          | Array<{ transactionHash?: string }>
          | undefined;
        const txHash = receipts?.[0]?.transactionHash || "unknown";
        setCreateError(`Mint failed. Tx: ${txHash}`);
        setCreateStep("idle");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mintStatus, createStep]);

  // Watch for errors
  useEffect(() => {
    if (
      setupError &&
      (createStep === "sendingSetup" || createStep === "waitingSetup")
    ) {
      setCreateError(setupError.message || "Setup transaction failed");
      setCreateStep("idle");
    }
  }, [setupError, createStep]);

  useEffect(() => {
    if (
      mintError &&
      (createStep === "sendingMint" || createStep === "waitingMint")
    ) {
      setCreateError(mintError.message || "Mint transaction failed");
      setCreateStep("idle");
    }
  }, [mintError, createStep]);

  // Trigger the mint call
  const triggerMint = () => {
    if (!dishId || !TMAP_DISHES_ADDRESS) return;

    setCreateStep("sendingMint");
    addDebug("Sending mint transaction...");

    sendMintCalls({
      calls: [
        {
          to: TMAP_DISHES_ADDRESS,
          data: encodeFunctionData({
            abi: tmapDishesAbi,
            functionName: "mint",
            args: [dishId, INITIAL_MINT_AMOUNT, zeroAddress],
          }),
        },
      ],
    });
  };

  // Check if dish exists in database
  const checkDishExists = async (
    restaurantName: string,
    dishNameParam: string
  ) => {
    const params = new URLSearchParams({
      restaurantName,
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
    resetSetup();
    resetMint();
    mintTriggeredRef.current = false;
    setCreateStep("checking");

    addDebug(`TMAP: ${TMAP_DISHES_ADDRESS.slice(0, 10)}...`);
    addDebug(`USDC: ${USDC_ADDRESS.slice(0, 10)}...`);
    addDebug(`Wallet: ${address.slice(0, 10)}...`);

    try {
      // Check if dish exists
      const { exists, dishId: fetchedDishId } = await checkDishExists(
        selectedRestaurant.name,
        dishName
      );
      const targetDishId = fetchedDishId as Hash;
      setDishId(targetDishId);
      addDebug(`DishId: ${targetDishId.slice(0, 10)}...`);
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
          args: [targetDishId],
        });
        dishExistsOnChain = onChainDish[4];
        addDebug(`On-chain: ${dishExistsOnChain}`);
      } catch {
        throw new Error("Cannot read TmapDishes contract. Is it deployed?");
      }

      // Check allowance
      const allowance = await checkAllowance(address, TMAP_DISHES_ADDRESS);
      addDebug(`Allowance: ${Number(allowance) / 1e6} USDC`);
      const needsApprove = allowance < INITIAL_MINT_AMOUNT;

      // Build setup calls (approve + createDish if needed)
      const setupCalls: { to: Address; data: `0x${string}` }[] = [];

      if (needsApprove) {
        setupCalls.push({
          to: USDC_ADDRESS,
          data: encodeFunctionData({
            abi: erc20Abi,
            functionName: "approve",
            args: [TMAP_DISHES_ADDRESS, INITIAL_MINT_AMOUNT * BigInt(1000)],
          }),
        });
        addDebug("+ approve");
      }

      if (!dishExistsOnChain) {
        const metadata = JSON.stringify({
          name: dishName.trim(),
          description: dishDescription.trim() || "",
          restaurant: selectedRestaurant.name,
          restaurantId: selectedRestaurant.id,
          creator: userFid,
        });
        setupCalls.push({
          to: TMAP_DISHES_ADDRESS,
          data: encodeFunctionData({
            abi: tmapDishesAbi,
            functionName: "createDish",
            args: [targetDishId, metadata],
          }),
        });
        addDebug("+ createDish");
      }

      // If we have setup calls, send them first
      if (setupCalls.length > 0) {
        setCreateStep("sendingSetup");
        addDebug(`Sending ${setupCalls.length} setup call(s)...`);

        sendSetupCalls({ calls: setupCalls });
      } else {
        // No setup needed, go directly to mint
        addDebug("No setup needed, going to mint...");
        setCreateStep("sendingMint");

        sendMintCalls({
          calls: [
            {
              to: TMAP_DISHES_ADDRESS,
              data: encodeFunctionData({
                abi: tmapDishesAbi,
                functionName: "mint",
                args: [targetDishId, INITIAL_MINT_AMOUNT, zeroAddress],
              }),
            },
          ],
        });
      }
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
      case "sendingSetup":
        return "Confirm Setup...";
      case "waitingSetup":
        return "Waiting for Setup...";
      case "sendingMint":
        return "Confirm Mint...";
      case "waitingMint":
        return "Waiting for Mint...";
      case "saving":
        return "Saving...";
      case "complete":
        return "Complete!";
      default:
        return "Create Stamp";
    }
  };

  const getProgressMessage = () => {
    switch (createStep) {
      case "checking":
        return "Checking dish and wallet...";
      case "sendingSetup":
        return "Please confirm the setup transaction (approve + createDish)";
      case "waitingSetup":
        return "Waiting for setup confirmation...";
      case "sendingMint":
        return "Please confirm the mint transaction";
      case "waitingMint":
        return "Waiting for mint confirmation...";
      case "saving":
        return "Saving to database...";
      default:
        return "";
    }
  };

  const isCreating = createStep !== "idle" && createStep !== "complete";
  const displayError = createError || setupError?.message || mintError?.message;

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
            Create Dish Stamp
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
                Search for the restaurant where you want to create a dish Stamp.
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
                to create a dish Stamp.
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
                Review Your Stamp
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
              disabled={isCreating || isSetupPending || isMintPending}
              className="w-full btn-primary disabled:opacity-60 font-semibold py-4 rounded-xl flex items-center justify-center gap-2"
            >
              {isCreating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {getButtonText()}
                </>
              ) : (
                "Create Stamp"
              )}
            </button>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
