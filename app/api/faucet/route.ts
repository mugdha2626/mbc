import { NextRequest, NextResponse } from "next/server";
import { createWalletClient, createPublicClient, http, parseUnits, formatUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { getDb } from "@/lib/mongodb";

// USDC on Base Sepolia
const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_CONTRACT_ADDRESS as `0x${string}`;
const FAUCET_AMOUNT = parseUnits("5", 6); // 5 USDC (6 decimals)
const RATE_LIMIT_HOURS = 24; // Can claim once per 24 hours

// ERC20 transfer ABI
const ERC20_ABI = [
  {
    name: "transfer",
    type: "function",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "balanceOf",
    type: "function",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

// Create clients
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

/**
 * POST /api/faucet
 * Request test USDC from the faucet
 *
 * Body: { walletAddress: string }
 * Returns: { success: true, txHash: string, amount: string }
 */
export async function POST(request: NextRequest) {
  try {
    // Check if faucet is configured (must be a valid hex private key)
    const faucetPrivateKey = process.env.FAUCET_PRIVATE_KEY;
    if (!faucetPrivateKey || !faucetPrivateKey.startsWith("0x") || faucetPrivateKey.length < 66) {
      return NextResponse.json(
        { error: "Faucet not configured. Please add a valid FAUCET_PRIVATE_KEY." },
        { status: 503 }
      );
    }

    if (!USDC_ADDRESS) {
      return NextResponse.json(
        { error: "USDC contract address not configured" },
        { status: 503 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { walletAddress } = body;

    if (!walletAddress || typeof walletAddress !== "string") {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json(
        { error: "Invalid wallet address format" },
        { status: 400 }
      );
    }

    const normalizedAddress = walletAddress.toLowerCase();

    // Check rate limit in database
    const db = await getDb();
    const faucetClaims = db.collection("faucet_claims");

    const recentClaim = await faucetClaims.findOne({
      walletAddress: normalizedAddress,
      claimedAt: {
        $gte: new Date(Date.now() - RATE_LIMIT_HOURS * 60 * 60 * 1000),
      },
    });

    if (recentClaim) {
      const nextClaimTime = new Date(
        recentClaim.claimedAt.getTime() + RATE_LIMIT_HOURS * 60 * 60 * 1000
      );
      const hoursRemaining = Math.ceil(
        (nextClaimTime.getTime() - Date.now()) / (60 * 60 * 1000)
      );

      return NextResponse.json(
        {
          error: `Rate limited. You can claim again in ${hoursRemaining} hour${hoursRemaining > 1 ? "s" : ""}.`,
          nextClaimTime: nextClaimTime.toISOString(),
        },
        { status: 429 }
      );
    }

    // Create faucet wallet client
    const faucetAccount = privateKeyToAccount(faucetPrivateKey as `0x${string}`);
    const walletClient = createWalletClient({
      account: faucetAccount,
      chain: baseSepolia,
      transport: http(),
    });

    // Check faucet USDC balance
    const faucetBalance = await publicClient.readContract({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [faucetAccount.address],
    }) as bigint;

    if (faucetBalance < FAUCET_AMOUNT) {
      console.error(
        `Faucet low on funds. Balance: ${formatUnits(faucetBalance, 6)} USDC`
      );
      return NextResponse.json(
        { error: "Faucet is temporarily out of funds. Please try again later." },
        { status: 503 }
      );
    }

    // Send USDC to user
    const txHash = await walletClient.writeContract({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: "transfer",
      args: [walletAddress as `0x${string}`, FAUCET_AMOUNT],
    });

    // Wait for transaction confirmation
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
      confirmations: 1,
    });

    if (receipt.status !== "success") {
      return NextResponse.json(
        { error: "Transaction failed" },
        { status: 500 }
      );
    }

    // Record the claim in database
    await faucetClaims.insertOne({
      walletAddress: normalizedAddress,
      claimedAt: new Date(),
      txHash: txHash,
      amount: 5, // 5 USDC
    });

    console.log(
      `Faucet: Sent 5 USDC to ${walletAddress}. Tx: ${txHash}`
    );

    return NextResponse.json({
      success: true,
      txHash,
      amount: "5",
      message: "Successfully sent 5 USDC to your wallet!",
    });
  } catch (error) {
    console.error("Faucet error:", error);

    // Handle specific errors
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    if (errorMessage.includes("insufficient funds")) {
      return NextResponse.json(
        { error: "Faucet wallet needs more ETH for gas" },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Failed to send USDC. Please try again." },
      { status: 500 }
    );
  }
}

/**
 * GET /api/faucet
 * Check faucet status and user's claim eligibility
 *
 * Query: ?walletAddress=0x...
 * Returns: { canClaim: boolean, faucetBalance: string, nextClaimTime?: string }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("walletAddress");

    // Check if faucet is configured (must be a valid hex private key)
    const faucetPrivateKey = process.env.FAUCET_PRIVATE_KEY;
    if (!faucetPrivateKey || !USDC_ADDRESS || !faucetPrivateKey.startsWith("0x") || faucetPrivateKey.length < 66) {
      return NextResponse.json({
        configured: false,
        canClaim: false,
      });
    }

    const faucetAccount = privateKeyToAccount(faucetPrivateKey as `0x${string}`);

    // Get faucet balance
    const faucetBalance = await publicClient.readContract({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [faucetAccount.address],
    }) as bigint;

    const response: {
      configured: boolean;
      faucetBalance: string;
      faucetAddress: string;
      canClaim: boolean;
      nextClaimTime?: string;
    } = {
      configured: true,
      faucetBalance: formatUnits(faucetBalance, 6),
      faucetAddress: faucetAccount.address,
      canClaim: true,
    };

    // Check user's claim eligibility if address provided
    if (walletAddress && /^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      const db = await getDb();
      const faucetClaims = db.collection("faucet_claims");

      const recentClaim = await faucetClaims.findOne({
        walletAddress: walletAddress.toLowerCase(),
        claimedAt: {
          $gte: new Date(Date.now() - RATE_LIMIT_HOURS * 60 * 60 * 1000),
        },
      });

      if (recentClaim) {
        const nextClaimTime = new Date(
          recentClaim.claimedAt.getTime() + RATE_LIMIT_HOURS * 60 * 60 * 1000
        );
        response.canClaim = false;
        response.nextClaimTime = nextClaimTime.toISOString();
      }
    }

    // Check if faucet has enough balance
    if (faucetBalance < FAUCET_AMOUNT) {
      response.canClaim = false;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Faucet status error:", error);
    return NextResponse.json(
      { error: "Failed to check faucet status" },
      { status: 500 }
    );
  }
}
