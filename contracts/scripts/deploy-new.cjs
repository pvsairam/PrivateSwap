const hre = require("hardhat");

async function main() {
  console.log("Deploying PrivateSwap Demo to Sepolia testnet...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH\n");

  if (balance < hre.ethers.parseEther("0.01")) {
    console.warn("⚠️  Warning: Low balance. Get testnet ETH from https://sepoliafaucet.com\n");
  }

  // Deploy Token A (Public USD - PUSD)
  console.log("Deploying Public USD (PUSD)...");
  const TokenA = await hre.ethers.getContractFactory("DemoToken");
  const tokenA = await TokenA.deploy("Public USD", "PUSD");
  await tokenA.waitForDeployment();
  const tokenAAddress = await tokenA.getAddress();
  console.log("✅ Public USD deployed to:", tokenAAddress);

  // Deploy Token B (Public ETH - PETH)
  console.log("\nDeploying Public ETH (PETH)...");
  const TokenB = await hre.ethers.getContractFactory("DemoToken");
  const tokenB = await TokenB.deploy("Public ETH", "PETH");
  await tokenB.waitForDeployment();
  const tokenBAddress = await tokenB.getAddress();
  console.log("✅ Public ETH deployed to:", tokenBAddress);

  // Deploy DemoSwap AMM
  console.log("\nDeploying DemoSwap AMM...");
  const DemoSwap = await hre.ethers.getContractFactory("DemoSwap");
  const demoSwap = await DemoSwap.deploy(tokenAAddress, tokenBAddress);
  await demoSwap.waitForDeployment();
  const demoSwapAddress = await demoSwap.getAddress();
  console.log("✅ DemoSwap deployed to:", demoSwapAddress);

  // Mint initial supply for testing
  console.log("\nMinting initial token supply...");
  const initialSupply = hre.ethers.parseEther("1000000"); // 1 million tokens
  
  const mintTxA = await tokenA.mint(deployer.address, initialSupply);
  await mintTxA.wait();
  console.log(`✅ Minted 1,000,000 PUSD to deployer`);
  
  const mintTxB = await tokenB.mint(deployer.address, initialSupply);
  await mintTxB.wait();
  console.log(`✅ Minted 1,000,000 PETH to deployer`);

  // Add initial liquidity with MARKET-ACCURATE ratio
  console.log("\nAdding initial liquidity to pool...");
  const liquidityA = hre.ethers.parseEther("100000"); // 100k PUSD ($100k)
  const liquidityB = hre.ethers.parseEther("26"); // 26 PETH ($100k at ~$3,850/ETH)
  
  const approveTxA = await tokenA.approve(demoSwapAddress, liquidityA);
  await approveTxA.wait();
  
  const approveTxB = await tokenB.approve(demoSwapAddress, liquidityB);
  await approveTxB.wait();
  
  const addLiqTx = await demoSwap.addLiquidity(liquidityA, liquidityB);
  await addLiqTx.wait();
  console.log(`✅ Added liquidity: 100,000 PUSD + 26 PETH (matched to live ETH price ~$3,850)`);

  // Output deployment summary
  console.log("\n" + "=".repeat(70));
  console.log("DEPLOYMENT SUMMARY");
  console.log("=".repeat(70));
  console.log("Public USD (PUSD):  ", tokenAAddress);
  console.log("Public ETH (PETH):  ", tokenBAddress);
  console.log("DemoSwap AMM:       ", demoSwapAddress);
  console.log("Deployer:           ", deployer.address);
  console.log("Initial Price:       1 PETH = ~3,846 PUSD (matches live market)");
  console.log("=".repeat(70));

  console.log("\n📝 Update client/src/lib/contracts.ts with these addresses:");
  console.log(`
export const CONTRACTS = {
  PUSD: "${tokenAAddress}",
  PETH: "${tokenBAddress}",
  DEMO_SWAP: "${demoSwapAddress}",
} as const;
  `);

  console.log("\nDeployment complete! 🎉");
  console.log("\nView on Etherscan:");
  console.log(`https://sepolia.etherscan.io/address/${demoSwapAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
