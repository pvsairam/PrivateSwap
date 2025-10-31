import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
});

export const faucetClaims = pgTable("faucet_claims", {
  id: serial("id").primaryKey(),
  address: text("address").notNull(),
  token: text("token").notNull(), // "PUSD" or "PETH"
  amount: text("amount").notNull(),
  txHash: text("tx_hash").notNull(),
  claimedAt: timestamp("claimed_at").notNull().defaultNow(),
});

export const faucetSettings = pgTable("faucet_settings", {
  id: serial("id").primaryKey(),
  enabled: boolean("enabled").notNull().default(true),
  cooldownHours: integer("cooldown_hours").notNull().default(24),  // Maps to cooldown_hours in DB
  pusdAmount: text("pusd_amount").notNull().default("100"),         // Maps to pusd_amount in DB
  pethAmount: text("peth_amount").notNull().default("0.1"),         // Maps to peth_amount in DB
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const insertFaucetClaimSchema = createInsertSchema(faucetClaims).omit({ 
  id: true, 
  claimedAt: true 
});
export type InsertFaucetClaim = z.infer<typeof insertFaucetClaimSchema>;
export type FaucetClaim = typeof faucetClaims.$inferSelect;

export const insertFaucetSettingsSchema = createInsertSchema(faucetSettings).omit({ id: true });
export type InsertFaucetSettings = z.infer<typeof insertFaucetSettingsSchema>;
export type FaucetSettings = typeof faucetSettings.$inferSelect;
