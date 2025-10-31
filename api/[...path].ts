import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createWalletClient, http as viemHttp, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, desc } from "drizzle-orm";
import * as schema from "../shared/schema";

const CONTRACTS = {
  PUSD: "0x152a668B68EbFf2d1d2305bDA0D44dDEE41f8Ac6" as `0x${string}`,
  PETH: "0x39A6651112ED9D7cDAD7bc6701f0D6A67c147181" as `0x${string}`,
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

const ADMIN_ADDRESS = "0xF9810b951d45D19754435D8e44b7761aA1635D72";

const getDb = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL not configured");
  }
  const sql = neon(process.env.DATABASE_URL);
  return drizzle(sql, { schema });
};

const setCorsHeaders = (res: VercelResponse) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { path } = req.query;
  const route = Array.isArray(path) ? `/${path.join('/')}` : `/${path || ''}`;

  console.log(`[API] ${req.method} ${route}`);

  try {
    if (route === '/health') {
      return res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
    }

    if (route === '/prices' && req.method === 'GET') {
      try {
        const response = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=tether,ethereum&vs_currencies=usd",
          { headers: { 'Accept': 'application/json' } }
        );
        const data = await response.json();
        return res.status(200).json({
          usdt: data.tether?.usd || 1.0,
          eth: data.ethereum?.usd || 2500,
        });
      } catch (error) {
        console.error('[API] CoinGecko fetch failed:', error);
        return res.status(200).json({ usdt: 1.0, eth: 2500 });
      }
    }

    if (route === '/faucet/settings' && req.method === 'GET') {
      const db = getDb();
      const settings = await db.select().from(schema.faucetSettings).limit(1);
      
      if (settings.length === 0) {
        const defaultSettings = {
          enabled: true,
          cooldownHours: 24,
          pusdAmount: "100",
          pethAmount: "0.1",
        };
        const inserted = await db.insert(schema.faucetSettings).values(defaultSettings).returning();
        return res.status(200).json(inserted[0]);
      }
      
      return res.status(200).json(settings[0]);
    }

    if (route === '/faucet/settings' && req.method === 'PUT') {
      const { address, enabled, cooldownHours, pusdAmount, pethAmount } = req.body;

      if (!address) {
        return res.status(400).json({ error: "Address required" });
      }

      if (address.toLowerCase() !== ADMIN_ADDRESS.toLowerCase()) {
        return res.status(403).json({ error: "Unauthorized: Admin only" });
      }

      const db = getDb();
      const current = await db.select().from(schema.faucetSettings).limit(1);
      
      if (current.length === 0) {
        return res.status(404).json({ error: "Settings not found" });
      }

      const updates: any = {};
      if (typeof enabled === "boolean") updates.enabled = enabled;
      if (typeof cooldownHours === "number") updates.cooldownHours = cooldownHours;
      if (pusdAmount) updates.pusdAmount = pusdAmount;
      if (pethAmount) updates.pethAmount = pethAmount;

      const result = await db
        .update(schema.faucetSettings)
        .set(updates)
        .where(eq(schema.faucetSettings.id, current[0].id))
        .returning();

      return res.status(200).json(result[0]);
    }

    if (route === '/faucet/claims' && req.method === 'GET') {
      const { address } = req.query;

      if (!address || typeof address !== "string") {
        return res.status(400).json({ error: "Address parameter required" });
      }

      if (address.toLowerCase() !== ADMIN_ADDRESS.toLowerCase()) {
        return res.status(403).json({ error: "Unauthorized: Admin only" });
      }

      const db = getDb();
      const claims = await db
        .select()
        .from(schema.faucetClaims)
        .orderBy(desc(schema.faucetClaims.claimedAt))
        .limit(50);

      return res.status(200).json(claims);
    }

    if (route === '/faucet' && req.method === 'POST') {
      const { address, token } = req.body;

      if (!address || !token) {
        return res.status(400).json({ error: "Address and token are required" });
      }

      if (token !== "PUSD" && token !== "PETH") {
        return res.status(400).json({ error: "Invalid token. Must be PUSD or PETH" });
      }

      const db = getDb();
      
      const settingsResult = await db.select().from(schema.faucetSettings).limit(1);
      const settings = settingsResult[0];
      
      if (!settings || !settings.enabled) {
        return res.status(503).json({ error: "Faucet is currently disabled" });
      }

      const lastClaim = await db
        .select()
        .from(schema.faucetClaims)
        .where(eq(schema.faucetClaims.address, address))
        .orderBy(desc(schema.faucetClaims.claimedAt))
        .limit(1);

      if (lastClaim.length > 0) {
        const timeSinceLastClaim = Date.now() - lastClaim[0].claimedAt.getTime();
        const cooldownMs = settings.cooldownHours * 60 * 60 * 1000;
        
        if (timeSinceLastClaim < cooldownMs) {
          const remainingHours = Math.ceil((cooldownMs - timeSinceLastClaim) / (60 * 60 * 1000));
          return res.status(429).json({ 
            error: `Please wait ${remainingHours} hour(s) before claiming again`,
            remainingHours,
          });
        }
      }

      let privateKey = process.env.SEPOLIA_PRIVATE_KEY;
      if (!privateKey) {
        return res.status(500).json({ error: "Faucet not configured" });
      }

      if (!privateKey.startsWith("0x")) {
        privateKey = `0x${privateKey}`;
      }

      const account = privateKeyToAccount(privateKey as `0x${string}`);
      const walletClient = createWalletClient({
        account,
        chain: sepolia,
        transport: viemHttp("https://ethereum-sepolia-rpc.publicnode.com"),
      });

      const tokenAddress = token === "PUSD" ? CONTRACTS.PUSD : CONTRACTS.PETH;
      const amountStr = token === "PUSD" ? settings.pusdAmount : settings.pethAmount;
      const amount = parseUnits(amountStr, 18);

      console.log(`[Faucet] Minting ${amountStr} ${token} to ${address}`);

      const hash = await walletClient.writeContract({
        address: tokenAddress,
        abi: DEMO_TOKEN_ABI,
        functionName: "mint",
        args: [address as `0x${string}`, amount],
      });

      await db.insert(schema.faucetClaims).values({
        address,
        token,
        amount: amountStr,
        txHash: hash,
      });

      console.log(`[Faucet] Success! TX: ${hash}`);

      return res.status(200).json({
        success: true,
        txHash: hash,
        amount: amountStr,
        token,
        explorerUrl: `https://sepolia.etherscan.io/tx/${hash}`,
      });
    }

    return res.status(404).json({ error: `Route not found: ${route}` });
    
  } catch (error: any) {
    console.error('[API Error]:', {
      route,
      method: req.method,
      error: error.message,
      stack: error.stack,
    });
    return res.status(500).json({ 
      error: error.message || 'Internal server error',
      route,
    });
  }
}
