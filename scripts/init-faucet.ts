import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../shared/schema";
import { eq } from "drizzle-orm";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is not set");
  process.exit(1);
}

const sql = neon(DATABASE_URL);
const db = drizzle(sql, { schema });

async function initializeFaucet() {
  console.log("🔧 Initializing faucet settings...");
  
  try {
    // Check if settings exist
    const existing = await db.select().from(schema.faucetSettings).limit(1);
    
    if (existing.length > 0) {
      console.log("📝 Updating existing faucet settings...");
      await db
        .update(schema.faucetSettings)
        .set({
          enabled: true,
          cooldownHours: 24,
          pusdAmount: "100",
          pethAmount: "0.1",
        })
        .where(eq(schema.faucetSettings.id, existing[0].id));
      
      console.log("✅ Faucet settings updated:");
      console.log("   - Enabled: true");
      console.log("   - PUSD Amount: 100");
      console.log("   - PETH Amount: 0.1");
      console.log("   - Cooldown: 24 hours");
    } else {
      console.log("📝 Creating new faucet settings...");
      await db.insert(schema.faucetSettings).values({
        enabled: true,
        cooldownHours: 24,
        pusdAmount: "100",
        pethAmount: "0.1",
      });
      
      console.log("✅ Faucet settings created:");
      console.log("   - Enabled: true");
      console.log("   - PUSD Amount: 100");
      console.log("   - PETH Amount: 0.1");
      console.log("   - Cooldown: 24 hours");
    }
    
    console.log("\n🎉 Faucet initialization complete!");
  } catch (error) {
    console.error("❌ Error initializing faucet:", error);
    process.exit(1);
  }
}

initializeFaucet();
