import { run, network } from "hardhat";

// Update these values after deployment
const DEPLOYMENT = {
  baseSepolia: {
    tmapDishes: "", // Add deployed address here
    usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    protocolFeeRecipient: "", // Add fee recipient address here
  },
  baseMainnet: {
    tmapDishes: "", // Add deployed address here
    usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    protocolFeeRecipient: "", // Add fee recipient address here
  },
};

async function main() {
  const networkName = network.name as keyof typeof DEPLOYMENT;

  if (!DEPLOYMENT[networkName]) {
    console.error(`No deployment info for network: ${networkName}`);
    process.exit(1);
  }

  const deployment = DEPLOYMENT[networkName];

  if (!deployment.tmapDishes || !deployment.protocolFeeRecipient) {
    console.error("Please update DEPLOYMENT object with deployed addresses");
    process.exit(1);
  }

  console.log(`Verifying TmapDishes on ${networkName}...`);
  console.log("Contract:", deployment.tmapDishes);

  try {
    await run("verify:verify", {
      address: deployment.tmapDishes,
      constructorArguments: [deployment.usdc, deployment.protocolFeeRecipient],
    });
    console.log("✅ Verification successful!");
  } catch (error: any) {
    if (error.message.includes("Already Verified")) {
      console.log("Contract is already verified");
    } else {
      console.error("Verification failed:", error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

