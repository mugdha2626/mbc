import { expect } from "chai";
import { ethers } from "hardhat";
import { TmapDishes, IERC20 } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("TmapDishes", function () {
  let tmapDishes: TmapDishes;
  let usdc: IERC20;
  let owner: SignerWithAddress;
  let creator: SignerWithAddress;
  let buyer1: SignerWithAddress;
  let buyer2: SignerWithAddress;
  let buyer3: SignerWithAddress;
  let referrer: SignerWithAddress;
  let protocolFeeRecipient: SignerWithAddress;

  const DISH_ID = ethers.keccak256(ethers.toUtf8Bytes("restaurant1:spaghetti"));
  const METADATA = "ipfs://QmTest123";

  // Helper to parse USDC amounts (6 decimals)
  const parseUsdc = (amount: number) => ethers.parseUnits(amount.toString(), 6);

  // Deploy a mock USDC for testing
  async function deployMockUsdc() {
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockUsdc = await MockERC20.deploy("USD Coin", "USDC", 6);
    return mockUsdc;
  }

  beforeEach(async function () {
    [owner, creator, buyer1, buyer2, buyer3, referrer, protocolFeeRecipient] =
      await ethers.getSigners();

    // Deploy mock USDC
    usdc = await deployMockUsdc() as unknown as IERC20;

    // Deploy TmapDishes
    const TmapDishes = await ethers.getContractFactory("TmapDishes");
    tmapDishes = await TmapDishes.deploy(
      await usdc.getAddress(),
      protocolFeeRecipient.address
    );

    // Mint USDC to test accounts
    const mockUsdc = usdc as any;
    await mockUsdc.mint(creator.address, parseUsdc(1000));
    await mockUsdc.mint(buyer1.address, parseUsdc(1000));
    await mockUsdc.mint(buyer2.address, parseUsdc(1000));
    await mockUsdc.mint(buyer3.address, parseUsdc(1000));
    await mockUsdc.mint(referrer.address, parseUsdc(1000));

    // Approve TmapDishes to spend USDC
    const tmapAddress = await tmapDishes.getAddress();
    await usdc.connect(creator).approve(tmapAddress, ethers.MaxUint256);
    await usdc.connect(buyer1).approve(tmapAddress, ethers.MaxUint256);
    await usdc.connect(buyer2).approve(tmapAddress, ethers.MaxUint256);
    await usdc.connect(buyer3).approve(tmapAddress, ethers.MaxUint256);
    await usdc.connect(referrer).approve(tmapAddress, ethers.MaxUint256);
  });

  describe("Dish Creation", function () {
    it("should create a new dish", async function () {
      const tx = await tmapDishes.connect(creator).createDish(DISH_ID, METADATA);
      await expect(tx).to.emit(tmapDishes, "DishCreated");

      const dishInfo = await tmapDishes.getDishInfo(DISH_ID);
      expect(dishInfo.creator).to.equal(creator.address);
      expect(dishInfo.totalSupply).to.equal(0);
      expect(dishInfo.metadata).to.equal(METADATA);
    });

    it("should revert when creating duplicate dish", async function () {
      await tmapDishes.connect(creator).createDish(DISH_ID, METADATA);
      await expect(
        tmapDishes.connect(buyer1).createDish(DISH_ID, "other")
      ).to.be.revertedWithCustomError(tmapDishes, "DishAlreadyExists");
    });
  });

  describe("Bonding Curve Pricing", function () {
    beforeEach(async function () {
      await tmapDishes.connect(creator).createDish(DISH_ID, METADATA);
    });

    it("should calculate correct price for first token", async function () {
      // Price = BASE_PRICE + (supply * SLOPE) = 0.1 + (0 * 0.0125) = 0.1 USDC
      const price = await tmapDishes.getCurrentPrice(DISH_ID);
      expect(price).to.equal(parseUsdc(0.1));
    });

    it("should calculate correct mint cost for multiple tokens", async function () {
      // Mint cost for 10 tokens from supply 0:
      // First token: BASE_PRICE + (0 * SLOPE) = 0.1
      // Last token: BASE_PRICE + (9 * SLOPE) = 0.1 + 0.1125 = 0.2125
      // Sum = 10 * (0.1 + 0.2125) / 2 = 1.5625 USDC
      const cost = await tmapDishes.getMintCost(DISH_ID, 10);
      expect(cost).to.equal(parseUsdc(1.5625));
    });

    it("should calculate tokens for USDC amount", async function () {
      const usdcAmount = parseUsdc(1);
      const [tokens, actualCost] = await tmapDishes.getTokensForUsdc(DISH_ID, usdcAmount);

      // Verify the cost doesn't exceed input
      expect(actualCost).to.be.lte(usdcAmount);

      // Verify the returned cost matches getMintCost
      const expectedCost = await tmapDishes.getMintCost(DISH_ID, tokens);
      expect(actualCost).to.equal(expectedCost);
    });
  });

  describe("Minting", function () {
    beforeEach(async function () {
      await tmapDishes.connect(creator).createDish(DISH_ID, METADATA);
    });

    it("should mint tokens and update state", async function () {
      const usdcAmount = parseUsdc(1);

      await tmapDishes.connect(buyer1).mint(DISH_ID, usdcAmount, ethers.ZeroAddress);

      const balance = await tmapDishes.getBalance(buyer1.address, DISH_ID);
      expect(balance).to.be.gt(0);

      const dishInfo = await tmapDishes.getDishInfo(DISH_ID);
      // Total supply should match the balance since this is the only mint
      expect(dishInfo.totalSupply).to.be.gt(0);
    });

    it("should enforce $10 max spend per dish", async function () {
      // Spend $10
      await tmapDishes.connect(buyer1).mint(DISH_ID, parseUsdc(10), ethers.ZeroAddress);

      // Try to spend more
      await expect(
        tmapDishes.connect(buyer1).mint(DISH_ID, parseUsdc(1), ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(tmapDishes, "ExceedsMaxSpend");
    });

    it("should track remaining allowance correctly", async function () {
      // Get how many tokens we can get for $3
      const [tokens, actualCost] = await tmapDishes.getTokensForUsdc(DISH_ID, parseUsdc(3));

      await tmapDishes.connect(buyer1).mint(DISH_ID, parseUsdc(3), ethers.ZeroAddress);

      const remaining = await tmapDishes.getRemainingAllowance(buyer1.address, DISH_ID);
      // Remaining should be $10 minus what was actually spent
      expect(remaining).to.equal(parseUsdc(10) - actualCost);
    });

    it("should accrue referral fee to referrer and allow claiming", async function () {
      const [, actualCost] = await tmapDishes.getTokensForUsdc(DISH_ID, parseUsdc(1));
      const expectedReferral = (actualCost * 250n) / 10000n;

      const referrerBalanceBefore = await usdc.balanceOf(creator.address);

      // Buyer mints with creator as referrer
      await tmapDishes.connect(buyer1).mint(DISH_ID, parseUsdc(1), creator.address);

      const pendingReferral = await tmapDishes.getReferralRewards(creator.address);
      expect(pendingReferral).to.equal(expectedReferral);

      // Funds should not be sent immediately
      const referrerBalanceAfterMint = await usdc.balanceOf(creator.address);
      expect(referrerBalanceAfterMint).to.equal(referrerBalanceBefore);

      const claimTx = await tmapDishes.connect(creator).claimReferralRewards();
      await expect(claimTx).to.emit(tmapDishes, "ReferralRewardsClaimed").withArgs(creator.address, expectedReferral);

      const referrerBalanceAfter = await usdc.balanceOf(creator.address);
      expect(referrerBalanceAfter - referrerBalanceBefore).to.equal(expectedReferral);
    });

    it("should send referral fee to protocol if no referrer", async function () {
      const protocolBalanceBefore = await usdc.balanceOf(protocolFeeRecipient.address);

      await tmapDishes.connect(buyer1).mint(DISH_ID, parseUsdc(1), ethers.ZeroAddress);

      const protocolBalanceAfter = await usdc.balanceOf(protocolFeeRecipient.address);
      expect(protocolBalanceAfter).to.be.gt(protocolBalanceBefore);
    });

    it("should allow any address as referrer", async function () {
      // Any address can be a referrer, even if they don't hold tokens
      const [, actualCost] = await tmapDishes.getTokensForUsdc(DISH_ID, parseUsdc(1));
      const expectedReferral = (actualCost * 250n) / 10000n;
      const referrerBalanceBefore = await usdc.balanceOf(buyer2.address);
      
      await tmapDishes.connect(buyer1).mint(DISH_ID, parseUsdc(1), buyer2.address);
      
      const pending = await tmapDishes.getReferralRewards(buyer2.address);
      expect(pending).to.equal(expectedReferral);

      await tmapDishes.connect(buyer2).claimReferralRewards();
      const referrerBalanceAfter = await usdc.balanceOf(buyer2.address);
      expect(referrerBalanceAfter - referrerBalanceBefore).to.equal(expectedReferral);
    });
  });

  describe("Selling", function () {
    beforeEach(async function () {
      await tmapDishes.connect(creator).createDish(DISH_ID, METADATA);
      await tmapDishes.connect(buyer1).mint(DISH_ID, parseUsdc(5), ethers.ZeroAddress);
    });

    it("should sell tokens and receive 70% refund", async function () {
      const balance = await tmapDishes.getBalance(buyer1.address, DISH_ID);
      const sellValue = await tmapDishes.getSellValue(DISH_ID, balance);

      const usdcBefore = await usdc.balanceOf(buyer1.address);

      await tmapDishes.connect(buyer1).sell(DISH_ID, balance);

      const usdcAfter = await usdc.balanceOf(buyer1.address);
      expect(usdcAfter - usdcBefore).to.equal(sellValue);

      const balanceAfter = await tmapDishes.getBalance(buyer1.address, DISH_ID);
      expect(balanceAfter).to.equal(0);
    });

    it("should revert when selling more than balance", async function () {
      const balance = await tmapDishes.getBalance(buyer1.address, DISH_ID);

      await expect(
        tmapDishes.connect(buyer1).sell(DISH_ID, balance + 1n)
      ).to.be.revertedWithCustomError(tmapDishes, "InsufficientBalance");
    });
  });

  describe("Reward System", function () {
    beforeEach(async function () {
      await tmapDishes.connect(creator).createDish(DISH_ID, METADATA);
    });

    it("should accumulate rewards for holders when others mint", async function () {
      // Buyer1 mints first
      await tmapDishes.connect(buyer1).mint(DISH_ID, parseUsdc(2), ethers.ZeroAddress);

      // Initial rewards should be 0
      const initialRewards = await tmapDishes.calculatePendingRewards(buyer1.address, DISH_ID);
      expect(initialRewards).to.equal(0);

      // Buyer2 mints - this should generate rewards for buyer1
      await tmapDishes.connect(buyer2).mint(DISH_ID, parseUsdc(3), ethers.ZeroAddress);

      // Buyer1 should now have pending rewards
      const pendingRewards = await tmapDishes.calculatePendingRewards(buyer1.address, DISH_ID);
      expect(pendingRewards).to.be.gt(0);
    });

    it("should allow claiming rewards without affecting others", async function () {
      // Multiple buyers mint
      await tmapDishes.connect(buyer1).mint(DISH_ID, parseUsdc(2), ethers.ZeroAddress);
      await tmapDishes.connect(buyer2).mint(DISH_ID, parseUsdc(2), ethers.ZeroAddress);
      await tmapDishes.connect(buyer3).mint(DISH_ID, parseUsdc(2), ethers.ZeroAddress);

      // Check rewards for buyer1 and buyer2
      const rewards1Before = await tmapDishes.calculatePendingRewards(buyer1.address, DISH_ID);
      const rewards2Before = await tmapDishes.calculatePendingRewards(buyer2.address, DISH_ID);

      expect(rewards1Before).to.be.gt(0);
      expect(rewards2Before).to.be.gt(0);

      // Buyer1 claims their rewards
      const usdcBefore = await usdc.balanceOf(buyer1.address);
      await tmapDishes.connect(buyer1).claimRewards(DISH_ID);
      const usdcAfter = await usdc.balanceOf(buyer1.address);

      expect(usdcAfter - usdcBefore).to.equal(rewards1Before);

      // Buyer2's rewards should NOT be affected
      const rewards2After = await tmapDishes.calculatePendingRewards(buyer2.address, DISH_ID);
      expect(rewards2After).to.equal(rewards2Before);
    });

    it("should distribute rewards proportionally to holdings", async function () {
      // Buyer1 gets more tokens
      await tmapDishes.connect(buyer1).mint(DISH_ID, parseUsdc(4), ethers.ZeroAddress);
      const balance1 = await tmapDishes.getBalance(buyer1.address, DISH_ID);

      // Buyer2 gets fewer tokens
      await tmapDishes.connect(buyer2).mint(DISH_ID, parseUsdc(2), ethers.ZeroAddress);
      const balance2 = await tmapDishes.getBalance(buyer2.address, DISH_ID);

      // Buyer3 mints to generate rewards
      await tmapDishes.connect(buyer3).mint(DISH_ID, parseUsdc(5), ethers.ZeroAddress);

      const rewards1 = await tmapDishes.calculatePendingRewards(buyer1.address, DISH_ID);
      const rewards2 = await tmapDishes.calculatePendingRewards(buyer2.address, DISH_ID);

      // Buyer1 should have proportionally more rewards
      // rewards1 / balance1 ≈ rewards2 / balance2 (per-token reward rate)
      expect(rewards1).to.be.gt(rewards2);
    });

    it("should not earn rewards from own mint", async function () {
      // New buyer mints - should not earn from their own mint
      await tmapDishes.connect(buyer1).mint(DISH_ID, parseUsdc(5), ethers.ZeroAddress);

      const rewards = await tmapDishes.calculatePendingRewards(buyer1.address, DISH_ID);
      expect(rewards).to.equal(0);
    });
  });

  describe("ERC1155 Transfers", function () {
    beforeEach(async function () {
      await tmapDishes.connect(creator).createDish(DISH_ID, METADATA);
      await tmapDishes.connect(buyer1).mint(DISH_ID, parseUsdc(5), ethers.ZeroAddress);
    });

    it("should update reward tracking on transfer", async function () {
      const balance = await tmapDishes.getBalance(buyer1.address, DISH_ID);

      // Generate some rewards
      await tmapDishes.connect(buyer2).mint(DISH_ID, parseUsdc(3), ethers.ZeroAddress);

      const rewards1Before = await tmapDishes.calculatePendingRewards(buyer1.address, DISH_ID);
      expect(rewards1Before).to.be.gt(0);

      // Transfer tokens - use the uint256 representation of the dish ID
      const tokenId = BigInt(DISH_ID);
      await tmapDishes
        .connect(buyer1)
        .safeTransferFrom(buyer1.address, buyer3.address, tokenId, balance, "0x");

      // Buyer1's pending rewards should be preserved
      const rewards1After = await tmapDishes.calculatePendingRewards(buyer1.address, DISH_ID);
      expect(rewards1After).to.equal(rewards1Before);

      // Buyer3 now has the balance
      const balance3 = await tmapDishes.getBalance(buyer3.address, DISH_ID);
      expect(balance3).to.equal(balance);
    });
  });

  describe("Holder Tracking", function () {
    beforeEach(async function () {
      await tmapDishes.connect(creator).createDish(DISH_ID, METADATA);
    });

    it("should track holder counts across mint, sell, and transfer", async function () {
      await tmapDishes.connect(buyer1).mint(DISH_ID, parseUsdc(2), ethers.ZeroAddress);
      expect(await tmapDishes.getHolderCount(DISH_ID)).to.equal(1);

      await tmapDishes.connect(buyer2).mint(DISH_ID, parseUsdc(2), ethers.ZeroAddress);
      expect(await tmapDishes.getHolderCount(DISH_ID)).to.equal(2);

      const balance1 = await tmapDishes.getBalance(buyer1.address, DISH_ID);
      await tmapDishes.connect(buyer1).sell(DISH_ID, balance1);
      expect(await tmapDishes.getHolderCount(DISH_ID)).to.equal(1);

      const balance2 = await tmapDishes.getBalance(buyer2.address, DISH_ID);
      const tokenId = BigInt(DISH_ID);
      await tmapDishes
        .connect(buyer2)
        .safeTransferFrom(buyer2.address, buyer3.address, tokenId, balance2, "0x");

      expect(await tmapDishes.getHolderCount(DISH_ID)).to.equal(1);
    });
  });

  describe("Admin Functions", function () {
    it("should update protocol fee recipient", async function () {
      await tmapDishes.setProtocolFeeRecipient(buyer1.address);
      expect(await tmapDishes.protocolFeeRecipient()).to.equal(buyer1.address);
    });

    it("should only allow owner to update fee recipient", async function () {
      await expect(
        tmapDishes.connect(buyer1).setProtocolFeeRecipient(buyer2.address)
      ).to.be.revertedWithCustomError(tmapDishes, "OwnableUnauthorizedAccount");
    });
  });

  // Helper function
  async function getBlockTimestamp(): Promise<number> {
    const block = await ethers.provider.getBlock("latest");
    return block!.timestamp;
  }
});
