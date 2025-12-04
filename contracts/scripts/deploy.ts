import { ethers, network } from "hardhat";

// USDC addresses on Base
const USDC_ADDRESSES: { [key: string]: string } = {
  baseMainnet: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  baseSepolia: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  hardhat: "", // Will deploy mock USDC
};

async function main() {
  const [deployer] = await ethers.getSigners();
  const networkName = network.name;

  console.log("Deploying TmapDishes contracts...");
  console.log("Network:", networkName);
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  let usdcAddress = USDC_ADDRESSES[networkName];

  // Deploy mock USDC for local testing
  if (networkName === "hardhat" || networkName === "localhost") {
    console.log("\nDeploying Mock USDC for testing...");
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockUsdc = await MockERC20.deploy("USD Coin", "USDC", 6);
    await mockUsdc.waitForDeployment();
    usdcAddress = await mockUsdc.getAddress();
    console.log("Mock USDC deployed to:", usdcAddress);

    // Mint some USDC to deployer for testing
    await mockUsdc.mint(deployer.address, ethers.parseUnits("10000", 6));
    console.log("Minted 10,000 USDC to deployer");
  }

  if (!usdcAddress) {
    throw new Error(`USDC address not configured for network: ${networkName}`);
  }

  // Deploy TmapDishes
  console.log("\nDeploying TmapDishes...");
  console.log("USDC address:", usdcAddress);
  console.log("Protocol fee recipient:", deployer.address);

  const TmapDishes = await ethers.getContractFactory("TmapDishes");
  const tmapDishes = await TmapDishes.deploy(usdcAddress, deployer.address);
  await tmapDishes.waitForDeployment();

  const tmapAddress = await tmapDishes.getAddress();
  console.log("\n✅ TmapDishes deployed to:", tmapAddress);

  // Output deployment info for verification
  console.log("\n========================================");
  console.log("DEPLOYMENT SUMMARY");
  console.log("========================================");
  console.log("Network:", networkName);
  console.log("TmapDishes:", tmapAddress);
  console.log("USDC:", usdcAddress);
  console.log("Protocol Fee Recipient:", deployer.address);
  console.log("========================================");

  // Save deployment info
  const deploymentInfo = {
    network: networkName,
    tmapDishes: tmapAddress,
    usdc: usdcAddress,
    protocolFeeRecipient: deployer.address,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
  };

  console.log("\nDeployment info (for verification):");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  // Verification command
  if (networkName !== "hardhat" && networkName !== "localhost") {
    console.log("\nTo verify on BaseScan, run:");
    console.log(
      `npx hardhat verify --network ${networkName} ${tmapAddress} "${usdcAddress}" "${deployer.address}"`
    );
  }

  return deploymentInfo;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

