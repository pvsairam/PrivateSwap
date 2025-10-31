import hre from "hardhat";
const { ethers } = hre;

async function main() {
  console.log("Adding liquidity to DemoSwap...");

  const DEMO_SWAP = "0x3D2EA7258D1808282dD520aDefDc96262243334A";
  const PUSD = "0x1eC4b054e0Dd6ef094764C14c41c0AB14c698372";
  const PETH = "0xe6290a4C040cC9a860802B3a1952F5Ea7c6e3878";

  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);

  // Get contract instances
  const pusd = await ethers.getContractAt("DemoToken", PUSD);
  const peth = await ethers.getContractAt("DemoToken", PETH);
  const demoSwap = await ethers.getContractAt("DemoSwap", DEMO_SWAP);

  // Check current reserves
  const reserveA = await demoSwap.reserveA();
  const reserveB = await demoSwap.reserveB();
  console.log("Current reserves:");
  console.log("  PUSD:", ethers.formatEther(reserveA));
  console.log("  PETH:", ethers.formatEther(reserveB));

  if (reserveA > 0n && reserveB > 0n) {
    console.log("Pool already has liquidity!");
    return;
  }

  // Mint tokens to deployer
  const liquidityPUSD = ethers.parseEther("100000"); // 100k PUSD
  const liquidityPETH = ethers.parseEther("50"); // 50 PETH

  console.log("\nMinting tokens...");
  let tx = await pusd.mint(deployer.address, liquidityPUSD);
  await tx.wait();
  console.log("Minted", ethers.formatEther(liquidityPUSD), "PUSD");

  tx = await peth.mint(deployer.address, liquidityPETH);
  await tx.wait();
  console.log("Minted", ethers.formatEther(liquidityPETH), "PETH");

  // Approve DemoSwap
  console.log("\nApproving tokens...");
  tx = await pusd.approve(DEMO_SWAP, liquidityPUSD);
  await tx.wait();
  console.log("Approved PUSD");

  tx = await peth.approve(DEMO_SWAP, liquidityPETH);
  await tx.wait();
  console.log("Approved PETH");

  // Add liquidity
  console.log("\nAdding liquidity...");
  tx = await demoSwap.addLiquidity(liquidityPUSD, liquidityPETH);
  await tx.wait();
  console.log("Liquidity added!");

  // Check new reserves
  const newReserveA = await demoSwap.reserveA();
  const newReserveB = await demoSwap.reserveB();
  console.log("\nNew reserves:");
  console.log("  PUSD:", ethers.formatEther(newReserveA));
  console.log("  PETH:", ethers.formatEther(newReserveB));
  console.log("  Initial rate: 1 PUSD =", ethers.formatEther(newReserveB * 1000000000000000000n / newReserveA), "PETH");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
