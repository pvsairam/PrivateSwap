import { eq, desc, and } from "drizzle-orm";
import { db } from "./db";
import { neon } from "@neondatabase/serverless";
import { 
  users,
  faucetClaims,
  faucetSettings,
  type User, 
  type InsertUser, 
  type FaucetClaim, 
  type InsertFaucetClaim,
  type FaucetSettings,
  type InsertFaucetSettings
} from "@shared/schema";

const sql = neon(process.env.DATABASE_URL!);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Faucet methods
  recordFaucetClaim(claim: InsertFaucetClaim): Promise<FaucetClaim>;
  getLastClaim(address: string, token?: string): Promise<FaucetClaim | undefined>;
  getAllClaims(limit?: number): Promise<FaucetClaim[]>;
  getFaucetSettings(): Promise<FaucetSettings>;
  updateFaucetSettings(settings: Partial<InsertFaucetSettings>): Promise<FaucetSettings>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private claims: FaucetClaim[];
  private settings: FaucetSettings;
  private claimIdCounter: number;

  constructor() {
    this.users = new Map();
    this.claims = [];
    this.claimIdCounter = 1;
    this.settings = {
      id: 1,
      enabled: true,
      cooldownHours: 24,
      pusdAmount: "1000",
      pethAmount: "0.5",
    };
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.users.size + 1;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async recordFaucetClaim(insertClaim: InsertFaucetClaim): Promise<FaucetClaim> {
    const claim: FaucetClaim = {
      id: this.claimIdCounter++,
      ...insertClaim,
      claimedAt: new Date(),
    };
    this.claims.push(claim);
    return claim;
  }

  async getLastClaim(address: string, token?: string): Promise<FaucetClaim | undefined> {
    const addressClaims = this.claims
      .filter(c => {
        const matchesAddress = c.address.toLowerCase() === address.toLowerCase();
        const matchesToken = token ? c.token === token : true;
        return matchesAddress && matchesToken;
      })
      .sort((a, b) => b.claimedAt.getTime() - a.claimedAt.getTime());
    
    return addressClaims[0];
  }

  async getAllClaims(limit: number = 100): Promise<FaucetClaim[]> {
    return this.claims
      .sort((a, b) => b.claimedAt.getTime() - a.claimedAt.getTime())
      .slice(0, limit);
  }

  async getFaucetSettings(): Promise<FaucetSettings> {
    return this.settings;
  }

  async updateFaucetSettings(updates: Partial<InsertFaucetSettings>): Promise<FaucetSettings> {
    this.settings = { ...this.settings, ...updates };
    return this.settings;
  }
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async recordFaucetClaim(insertClaim: InsertFaucetClaim): Promise<FaucetClaim> {
    const result = await db.insert(faucetClaims).values(insertClaim).returning();
    return result[0];
  }

  async getLastClaim(address: string, token?: string): Promise<FaucetClaim | undefined> {
    try {
      const conditions = token 
        ? and(eq(faucetClaims.address, address), eq(faucetClaims.token, token))
        : eq(faucetClaims.address, address);
      
      const result = await db
        .select()
        .from(faucetClaims)
        .where(conditions)
        .orderBy(desc(faucetClaims.claimedAt))
        .limit(1);
      
      return result[0];
    } catch (error: any) {
      // Neon bug: empty table causes specific error - only catch that
      if (error.message?.includes("Cannot read properties of null") && error.message?.includes("map")) {
        console.log('[getLastClaim] Empty table (Neon bug workaround)');
        return undefined;
      }
      // Re-throw any other database errors - these are genuine problems
      throw error;
    }
  }

  async getAllClaims(limit: number = 100): Promise<FaucetClaim[]> {
    return await db
      .select()
      .from(faucetClaims)
      .orderBy(desc(faucetClaims.claimedAt))
      .limit(limit);
  }

  async getFaucetSettings(): Promise<FaucetSettings> {
    // CRITICAL FIX: Neon driver incorrectly converts PostgreSQL 't' to false
    // Solution: Cast boolean to text in the query to bypass broken conversion
    const rawResult = await sql`SELECT id, enabled::text as enabled, cooldown_hours, pusd_amount, peth_amount FROM faucet_settings LIMIT 1`;
    
    if (rawResult.length === 0) {
      const defaultSettings = {
        enabled: true,
        cooldownHours: 24,
        pusdAmount: "1000",
        pethAmount: "0.5",
      };
      const inserted = await db.insert(faucetSettings).values(defaultSettings).returning();
      return this.fixBooleans(inserted[0]);
    }
    
    const raw = rawResult[0];
    
    // Now enabled is a string 't' or 'f' - convert correctly
    const enabled = raw.enabled === 't' || raw.enabled === 'true';
    
    return {
      id: raw.id,
      enabled,
      cooldownHours: raw.cooldown_hours,
      pusdAmount: raw.pusd_amount,
      pethAmount: raw.peth_amount,
    };
  }

  private fixBooleans(settings: any): FaucetSettings {
    // For inserted values, Drizzle should return correct booleans
    return {
      ...settings,
      enabled: Boolean(settings.enabled),
    };
  }

  async updateFaucetSettings(updates: Partial<InsertFaucetSettings>): Promise<FaucetSettings> {
    const current = await this.getFaucetSettings();
    const result = await db
      .update(faucetSettings)
      .set(updates)
      .where(eq(faucetSettings.id, current.id))
      .returning();
    
    return this.fixBooleans(result[0]);
  }
}

export const storage = process.env.DATABASE_URL ? new DatabaseStorage() : new MemStorage();
