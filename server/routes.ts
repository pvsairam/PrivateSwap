import type { Express } from "express";
import { createServer, type Server } from "http";
import { createWalletClient, http as viemHttp, parseUnits, verifyMessage } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { storage } from "./storage";

const CONTRACTS = {
  PUSD: "0x152a668B68EbFf2d1d2305bDA0D44dDEE41f8Ac6" as `0x${string}`,
  PETH: "0x39A6651112ED9D7cDAD7bc6701f0D6A67c147181" as `0x${string}`,
  ENCRYPTED_PUSD: "0x6D95E7c9BA9a1271B377BcCb5233B4e7d40D0822" as `0x${string}`,
  ENCRYPTED_PETH: "0xc0A50C6B79Fe7754B89460cFdF2685B0913771Ee" as `0x${string}`,
};

const DEMO_TOKEN_ABI = [
  {
    name: "mint",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

const ENCRYPTED_TOKEN_ABI = [
  {
    name: "mintPlaintext",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "plaintextAmount", type: "uint64" },
    ],
    outputs: [],
  },
] as const;

// Admin wallet address (the deployer)
const ADMIN_ADDRESS = "0xF9810b951d45D19754435D8e44b7761aA1635D72";

// Helper function to verify admin signature with timestamp validation
async function verifyAdminSignature(message: string, signature: string): Promise<{ valid: boolean; error?: string }> {
  try {
    // Verify the signature cryptographically
    const valid = await verifyMessage({
      address: ADMIN_ADDRESS as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });
    
    if (!valid) {
      return { valid: false, error: "Invalid signature" };
    }

    // Parse timestamp from message (format: "...\nTimestamp: 1234567890")
    const timestampMatch = message.match(/Timestamp:\s*(\d+)/);
    if (!timestampMatch) {
      return { valid: false, error: "Missing timestamp in message" };
    }

    const messageTimestamp = parseInt(timestampMatch[1], 10);
    const currentTime = Date.now();
    const timeDifference = Math.abs(currentTime - messageTimestamp);
    const FIVE_MINUTES_MS = 5 * 60 * 1000;

    // Reject signatures older than 5 minutes (prevents replay attacks)
    if (timeDifference > FIVE_MINUTES_MS) {
      return { valid: false, error: "Signature expired (> 5 minutes old)" };
    }

    return { valid: true };
  } catch (error) {
    console.error("Signature verification error:", error);
    return { valid: false, error: "Signature verification failed" };
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Get live cryptocurrency prices from CoinGecko (disable caching for real-time updates)
  app.get("/api/prices", async (_req, res) => {
    try {
      // Disable caching - ensure React Query always gets fresh data (fixes 304 issue)
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      const response = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=tether,ethereum&vs_currencies=usd"
      );
      
      if (!response.ok) {
        throw new Error("Failed to fetch prices");
      }

      const data = await response.json();
      
      res.json({
        usdt: data.tether?.usd || 1.0,
        eth: data.ethereum?.usd || 2500,
      });
    } catch (error: any) {
      console.error("Price fetch error:", error);
      // Return fallback prices if API fails
      res.json({
        usdt: 1.0,
        eth: 2500,
      });
    }
  });

  // Get faucet settings
  app.get("/api/faucet/settings", async (_req, res) => {
    try {
      const settings = await storage.getFaucetSettings();
      res.json(settings);
    } catch (error: any) {
      console.error("Get settings error:", error);
      res.status(500).json({ error: "Failed to get settings" });
    }
  });

  // Update faucet settings (admin only with signature verification)
  app.put("/api/faucet/settings", async (req, res) => {
    try {
      const { address, message, signature, enabled, cooldownHours, pusdAmount, pethAmount } = req.body;

      if (!address || !message || !signature) {
        return res.status(400).json({ error: "Address, message, and signature required" });
      }

      // Verify admin address
      if (address.toLowerCase() !== ADMIN_ADDRESS.toLowerCase()) {
        return res.status(403).json({ error: "Unauthorized: Admin only" });
      }

      // Verify signature with timestamp validation
      const verification = await verifyAdminSignature(message, signature);
      if (!verification.valid) {
        return res.status(403).json({ error: verification.error || "Invalid signature" });
      }

      const updates: any = {};
      if (typeof enabled === "boolean") updates.enabled = enabled;
      if (typeof cooldownHours === "number") updates.cooldownHours = cooldownHours;
      if (pusdAmount) updates.pusdAmount = pusdAmount;
      if (pethAmount) updates.pethAmount = pethAmount;

      const settings = await storage.updateFaucetSettings(updates);
      res.json(settings);
    } catch (error: any) {
      console.error("Update settings error:", error);
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  // Get recent claims (admin only with signature verification)
  app.get("/api/faucet/claims", async (req, res) => {
    try {
      const { address, message, signature } = req.query;

      if (!address || typeof address !== "string" || !message || typeof message !== "string" || !signature || typeof signature !== "string") {
        return res.status(400).json({ error: "Address, message, and signature parameters required" });
      }

      // Verify admin address
      if (address.toLowerCase() !== ADMIN_ADDRESS.toLowerCase()) {
        return res.status(403).json({ error: "Unauthorized: Admin only" });
      }

      // Verify signature with timestamp validation
      const verification = await verifyAdminSignature(message, signature);
      if (!verification.valid) {
        return res.status(403).json({ error: verification.error || "Invalid signature" });
      }

      const claims = await storage.getAllClaims(50);
      res.json(claims);
    } catch (error: any) {
      console.error("Get claims error:", error);
      res.status(500).json({ error: "Failed to get claims" });
    }
  });

  // Faucet endpoint - mints tokens to user address
  app.post("/api/faucet", async (req, res) => {
    try {
      const { address, token } = req.body;

      if (!address || !token) {
        return res.status(400).json({ error: "Address and token are required" });
      }

      if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
        return res.status(400).json({ error: "Invalid address format" });
      }

      if (token !== "PUSD" && token !== "PETH" && token !== "ePUSD" && token !== "ePETH") {
        return res.status(400).json({ error: "Invalid token. Must be PUSD, PETH, ePUSD, or ePETH" });
      }

      // Check faucet settings
      const settings = await storage.getFaucetSettings();
      if (!settings.enabled) {
        return res.status(503).json({ error: "Faucet is currently disabled" });
      }

      // Check cooldown period (across ALL tokens for this address)
      const lastClaim = await storage.getLastClaim(address); // No token parameter = check all tokens
      if (lastClaim) {
        const timeSinceLastClaim = Date.now() - lastClaim.claimedAt.getTime();
        const cooldownMs = settings.cooldownHours * 60 * 60 * 1000;
        
        if (timeSinceLastClaim < cooldownMs) {
          const remainingMs = cooldownMs - timeSinceLastClaim;
          const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));
          return res.status(429).json({ 
            error: `Please wait ${remainingHours} hour(s) before claiming from the faucet again`,
            remainingHours,
            lastClaimedToken: lastClaim.token
          });
        }
      }

      // Get private key from environment
      let privateKey = process.env.SEPOLIA_PRIVATE_KEY;
      if (!privateKey) {
        console.error("SEPOLIA_PRIVATE_KEY not found in environment");
        return res.status(500).json({ error: "Faucet not configured" });
      }

      // Ensure private key has 0x prefix
      if (!privateKey.startsWith("0x")) {
        privateKey = `0x${privateKey}`;
      }

      // Create wallet client
      const account = privateKeyToAccount(privateKey as `0x${string}`);
      const walletClient = createWalletClient({
        account,
        chain: sepolia,
        transport: viemHttp("https://ethereum-sepolia-rpc.publicnode.com"),
      });

      // Determine token-specific values
      const isEncrypted = token === "ePUSD" || token === "ePETH";
      const baseToken = token === "ePUSD" ? "PUSD" : token === "ePETH" ? "PETH" : token;
      const amountStr = baseToken === "PUSD" ? settings.pusdAmount : settings.pethAmount;
      
      let tokenAddress: `0x${string}`;
      let hash: `0x${string}`;
      
      if (isEncrypted) {
        // Mint encrypted tokens using mintPlaintext (6 decimals, euint64 compatible)
        tokenAddress = token === "ePUSD" ? CONTRACTS.ENCRYPTED_PUSD : CONTRACTS.ENCRYPTED_PETH;
        const amount = parseUnits(amountStr, 6); // 6 decimals to fit in euint64
        
        // Ensure amount fits in uint64 max (2^64 - 1 = 18,446,744,073,709,551,615)
        const uint64Max = BigInt("18446744073709551615");
        if (amount > uint64Max) {
          console.error(`Amount ${amount} exceeds uint64 max`);
          return res.status(400).json({ 
            error: "Amount too large for encrypted tokens",
            maxAmount: "18446744.073709" // Max safe amount with 6 decimals
          });
        }
        
        console.log(`Minting ${amountStr} ${token} (encrypted, ${amount} with 6 decimals) to ${address}...`);
        
        hash = await walletClient.writeContract({
          address: tokenAddress,
          abi: ENCRYPTED_TOKEN_ABI,
          functionName: "mintPlaintext",
          args: [address as `0x${string}`, amount],
        });
      } else {
        // Mint public tokens using standard mint
        tokenAddress = token === "PUSD" ? CONTRACTS.PUSD : CONTRACTS.PETH;
        const amount = parseUnits(amountStr, 18);
        
        console.log(`Minting ${amountStr} ${token} to ${address}...`);
        
        hash = await walletClient.writeContract({
          address: tokenAddress,
          abi: DEMO_TOKEN_ABI,
          functionName: "mint",
          args: [address as `0x${string}`, amount],
        });
      }

      console.log(`Mint transaction sent: ${hash}`);

      // Record the claim
      await storage.recordFaucetClaim({
        address,
        token,
        amount: amountStr,
        txHash: hash,
      });

      res.json({
        success: true,
        txHash: hash,
        amount: amountStr,
        token,
        explorerUrl: `https://sepolia.etherscan.io/tx/${hash}`,
      });
    } catch (error: any) {
      console.error("Faucet error:", error);
      res.status(500).json({
        error: "Failed to mint tokens",
        message: error.message,
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
