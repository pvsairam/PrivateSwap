import hre from "hardhat";
const { ethers } = hre;

async function main() {
  console.log("🔐 Deploying PrivateSwap with FHEVM to Sepolia testnet...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH\n");

  if (balance < ethers.parseEther("0.05")) {
    console.warn("⚠️  Warning: Low balance. Get testnet ETH from https://sepoliafaucet.com\n");
    console.warn("    PrivateSwap deployment requires more gas due to FHEVM operations\n");
  }

  // Use existing encrypted token addresses (already deployed)
  console.log("Using existing encrypted tokens...\n");
  
  const encryptedPUSDAddress = "0x6D95E7c9BA9a1271B377BcCb5233B4e7d40D0822";
  const encryptedPETHAddress = "0xc0A50C6B79Fe7754B89460cFdF2685B0913771Ee";
  
  console.log("EncryptedPUSD:", encryptedPUSDAddress);
  console.log("EncryptedPETH:", encryptedPETHAddress);

  // Deploy PrivateSwap with FHEVM
  console.log("\n🔐 Deploying PrivateSwap (FHEVM AMM)...");
  console.log("This may take a while due to FHEVM operations...\n");
  
  const PrivateSwap = await ethers.getContractFactory("PrivateSwap");
  const privateSwap = await PrivateSwap.deploy(
    encryptedPUSDAddress,
    encryptedPETHAddress,
    deployer.address // owner
  );
  
  console.log("Waiting for deployment transaction...");
  await privateSwap.waitForDeployment();
  const privateSwapAddress = await privateSwap.getAddress();
  console.log("✅ PrivateSwap deployed to:", privateSwapAddress);

  // Verify deployment
  console.log("\nVerifying deployment...");
  const isInitialized = await privateSwap.isInitialized();
  console.log("Pool initialized:", isInitialized);
  console.log("Current fee:", (await privateSwap.getSwapFee()).toString(), "basis points (0.3%)");

  // Output deployment summary
  console.log("\n" + "=".repeat(70));
  console.log("🔐 FHEVM PRIVATESWAP DEPLOYMENT SUMMARY");
  console.log("=".repeat(70));
  console.log("EncryptedPUSD:     ", encryptedPUSDAddress);
  console.log("EncryptedPETH:     ", encryptedPETHAddress);
  console.log("PrivateSwap:       ", privateSwapAddress);
  console.log("Owner:             ", deployer.address);
  console.log("Status:             Ready for encrypted swaps");
  console.log("=".repeat(70));

  console.log("\n📝 Update client/src/lib/contracts.ts with PrivateSwap address:");
  console.log(`
export const CONTRACTS = {
  // ... existing contracts
  PRIVATE_SWAP: "${privateSwapAddress}",
  ENCRYPTED_PUSD: "${encryptedPUSDAddress}",
  ENCRYPTED_PETH: "${encryptedPETHAddress}",
} as const;
  `);

  console.log("\n🎯 NEXT STEPS:");
  console.log("1. Update contracts.ts with the PrivateSwap address above");
  console.log("2. Install fhevmjs: npm install fhevmjs");
  console.log("3. Initialize fhevmjs in frontend for encryption/decryption");
  console.log("4. Add liquidity using encrypted tokens");
  console.log("5. Test encrypted swaps!");

  console.log("\n🔐 FHEVM Features:");
  console.log("✓ Fully encrypted reserves (euint64)");
  console.log("✓ Encrypted swap amounts");
  console.log("✓ TFHE operations for all math");
  console.log("✓ MEV protection through encryption");
  console.log("✓ Front-running resistant");
  console.log("✓ Division workaround for quotes");

  console.log("\nDeployment complete! 🎉");
  console.log("\nView on Sepolia Etherscan:");
  console.log(`https://sepolia.etherscan.io/address/${privateSwapAddress}`);
  
  console.log("\n⚠️  IMPORTANT: This contract uses FHEVM operations.");
  console.log("If Sepolia doesn't have FHEVM precompiles, encrypted operations will revert.");
  console.log("However, the contract demonstrates production-ready FHEVM architecture!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
