import hre from "hardhat";
const { ethers } = hre;

async function main() {
  console.log("Checking DemoSwap pool status...\n");

  const DEMO_SWAP = "0x3D2EA7258D1808282dD520aDefDc96262243334A";
  const PUSD = "0x1eC4b054e0Dd6ef094764C14c41c0AB14c698372";
  const PETH = "0xe6290a4C040cC9a860802B3a1952F5Ea7c6e3878";

  // Get contract instances
  const demoSwap = await ethers.getContractAt("DemoSwap", DEMO_SWAP);

  // Check reserves
  const reserveA = await demoSwap.reserveA();
  const reserveB = await demoSwap.reserveB();
  
  console.log("Pool Reserves:");
  console.log("  PUSD:", ethers.formatEther(reserveA));
  console.log("  PETH:", ethers.formatEther(reserveB));
  
  if (reserveA > 0n && reserveB > 0n) {
    const rate = (reserveB * 1000000000000000000n) / reserveA;
    console.log("\n  Exchange Rate: 1 PUSD =", ethers.formatEther(rate), "PETH");
    console.log("  Pool has liquidity ✅");
  } else {
    console.log("\n  Pool is EMPTY ❌");
  }

  // Try a test quote
  console.log("\nTest Quote: 100 PUSD → PETH");
  try {
    const amountOut = await demoSwap.quote(true, ethers.parseEther("100"));
    console.log("  Expected output:", ethers.formatEther(amountOut), "PETH");
  } catch (error: any) {
    console.log("  Quote failed:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
