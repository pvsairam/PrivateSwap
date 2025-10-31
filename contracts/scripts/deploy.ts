import hre from "hardhat";
const { ethers } = hre;

async function main() {
  console.log("Deploying PrivateSwap Demo to Sepolia testnet...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH\n");

  if (balance < ethers.parseEther("0.01")) {
    console.warn("⚠️  Warning: Low balance. Get testnet ETH from https://sepoliafaucet.com\n");
  }

  // Deploy Token A (Demo USD - DUSD)
  console.log("Deploying Demo USD (DUSD)...");
  const TokenA = await ethers.getContractFactory("DemoToken");
  const tokenA = await TokenA.deploy("Demo USD", "DUSD");
  await tokenA.waitForDeployment();
  const tokenAAddress = await tokenA.getAddress();
  console.log("✅ Demo USD deployed to:", tokenAAddress);

  // Deploy Token B (Demo ETH - DETH)
  console.log("\nDeploying Demo ETH (DETH)...");
  const TokenB = await ethers.getContractFactory("DemoToken");
  const tokenB = await TokenB.deploy("Demo ETH", "DETH");
  await tokenB.waitForDeployment();
  const tokenBAddress = await tokenB.getAddress();
  console.log("✅ Demo ETH deployed to:", tokenBAddress);

  // Deploy DemoSwap AMM
  console.log("\nDeploying DemoSwap AMM...");
  const DemoSwap = await ethers.getContractFactory("DemoSwap");
  const demoSwap = await DemoSwap.deploy(tokenAAddress, tokenBAddress);
  await demoSwap.waitForDeployment();
  const demoSwapAddress = await demoSwap.getAddress();
  console.log("✅ DemoSwap deployed to:", demoSwapAddress);

  // Mint initial supply for testing
  console.log("\nMinting initial token supply...");
  const initialSupply = ethers.parseEther("1000000"); // 1 million tokens
  
  const mintTxA = await tokenA.mint(deployer.address, initialSupply);
  await mintTxA.wait();
  console.log(`✅ Minted 1,000,000 DUSD to deployer`);
  
  const mintTxB = await tokenB.mint(deployer.address, initialSupply);
  await mintTxB.wait();
  console.log(`✅ Minted 1,000,000 DETH to deployer`);

  // Add initial liquidity
  console.log("\nAdding initial liquidity to pool...");
  const liquidityA = ethers.parseEther("100000"); // 100k DUSD ($100k)
  const liquidityB = ethers.parseEther("26"); // 26 DETH ($100k at ~$3,850/ETH)
  
  const approveTxA = await tokenA.approve(demoSwapAddress, liquidityA);
  await approveTxA.wait();
  
  const approveTxB = await tokenB.approve(demoSwapAddress, liquidityB);
  await approveTxB.wait();
  
  const addLiqTx = await demoSwap.addLiquidity(liquidityA, liquidityB);
  await addLiqTx.wait();
  console.log(`✅ Added liquidity: 100,000 DUSD + 26 DETH (matched to live ETH price)`);

  // Output deployment summary
  console.log("\n" + "=".repeat(70));
  console.log("DEPLOYMENT SUMMARY");
  console.log("=".repeat(70));
  console.log("Demo USD (DUSD):   ", tokenAAddress);
  console.log("Demo ETH (DETH):   ", tokenBAddress);
  console.log("DemoSwap AMM:      ", demoSwapAddress);
  console.log("Deployer:          ", deployer.address);
  console.log("Initial Price:      1 DETH = ~3,846 DUSD (matches live market)");
  console.log("=".repeat(70));

  console.log("\n📝 Update client/src/lib/contracts.ts with these addresses:");
  console.log(`
export const CONTRACTS = {
  DUSD: "${tokenAAddress}",
  DETH: "${tokenBAddress}",
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
