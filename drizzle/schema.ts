import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extended with role-based access control for RPG campaigns.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  userType: mysqlEnum("userType", ["player", "master", "both"]).default("player").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Campaigns table - represents a single RPG campaign
 */
export const campaigns = mysqlTable("campaigns", {
  id: int("id").autoincrement().primaryKey(),
  masterId: int("masterId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  system: varchar("system", { length: 100 }).notNull(), // D&D 5e, Tormenta20, etc
  status: mysqlEnum("status", ["active", "paused", "completed"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = typeof campaigns.$inferInsert;

/**
 * Campaign members - links players to campaigns
 */
export const campaignMembers = mysqlTable("campaignMembers", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull(),
  userId: int("userId").notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
});

export type CampaignMember = typeof campaignMembers.$inferSelect;
export type InsertCampaignMember = typeof campaignMembers.$inferInsert;

/**
 * Characters table - player characters in campaigns
 */
export const characters = mysqlTable("characters", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  race: varchar("race", { length: 100 }),
  class: varchar("class", { length: 100 }),
  level: int("level").default(1).notNull(),
  experience: int("experience").default(0).notNull(),
  
  // Core attributes (D&D style)
  strength: int("strength").default(10).notNull(),
  dexterity: int("dexterity").default(10).notNull(),
  constitution: int("constitution").default(10).notNull(),
  intelligence: int("intelligence").default(10).notNull(),
  wisdom: int("wisdom").default(10).notNull(),
  charisma: int("charisma").default(10).notNull(),
  
  // Health and resources
  maxHp: int("maxHp").default(10).notNull(),
  currentHp: int("currentHp").default(10).notNull(),
  armorClass: int("armorClass").default(10).notNull(),
  
  // Background and story
  backstory: text("backstory"),
  appearance: text("appearance"),
  personality: text("personality"),
  
  // Progression tracking
  totalPoints: int("totalPoints").default(0).notNull(),
  sessionCount: int("sessionCount").default(0).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Character = typeof characters.$inferSelect;
export type InsertCharacter = typeof characters.$inferInsert;

/**
 * Sessions table - individual game sessions
 */
export const sessions = mysqlTable("sessions", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull(),
  sessionNumber: int("sessionNumber").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  date: timestamp("date").notNull(),
  summary: text("summary"),
  status: mysqlEnum("status", ["scheduled", "completed", "cancelled"]).default("scheduled").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Session = typeof sessions.$inferSelect;
export type InsertSession = typeof sessions.$inferInsert;

/**
 * Campaign diary entries - shared journal of campaign events
 */
export const diaryEntries = mysqlTable("diaryEntries", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull(),
  sessionId: int("sessionId"),
  authorId: int("authorId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  entryType: mysqlEnum("entryType", ["session_summary", "character_note", "world_note", "event"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DiaryEntry = typeof diaryEntries.$inferSelect;
export type InsertDiaryEntry = typeof diaryEntries.$inferInsert;

/**
 * NPCs table - non-player characters managed by master
 */
export const npcs = mysqlTable("npcs", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  role: varchar("role", { length: 100 }),
  description: text("description"),
  alignment: varchar("alignment", { length: 50 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type NPC = typeof npcs.$inferSelect;
export type InsertNPC = typeof npcs.$inferInsert;

/**
 * Monsters table - creatures for combat
 */
export const monsters = mysqlTable("monsters", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 100 }),
  challengeRating: decimal("challengeRating", { precision: 3, scale: 1 }),
  hp: int("hp"),
  armorClass: int("armorClass"),
  description: text("description"),
  abilities: text("abilities"), // JSON string of abilities
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Monster = typeof monsters.$inferSelect;
export type InsertMonster = typeof monsters.$inferInsert;

/**
 * Items table - equipment and loot
 */
export const items = mysqlTable("items", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  itemType: varchar("itemType", { length: 100 }).notNull(), // weapon, armor, consumable, etc
  rarity: varchar("rarity", { length: 50 }), // common, uncommon, rare, etc
  description: text("description"),
  effects: text("effects"), // JSON string of effects
  quantity: int("quantity").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Item = typeof items.$inferSelect;
export type InsertItem = typeof items.$inferInsert;

/**
 * Character inventory - links items to characters
 */
export const characterInventory = mysqlTable("characterInventory", {
  id: int("id").autoincrement().primaryKey(),
  characterId: int("characterId").notNull(),
  itemId: int("itemId").notNull(),
  quantity: int("quantity").default(1).notNull(),
  equipped: boolean("equipped").default(false).notNull(),
  addedAt: timestamp("addedAt").defaultNow().notNull(),
});

export type CharacterInventoryItem = typeof characterInventory.$inferSelect;
export type InsertCharacterInventoryItem = typeof characterInventory.$inferInsert;

/**
 * Wiki entries - world building and lore
 */
export const wikiEntries = mysqlTable("wikiEntries", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(), // gods, kingdoms, rules, history, etc
  content: text("content").notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WikiEntry = typeof wikiEntries.$inferSelect;
export type InsertWikiEntry = typeof wikiEntries.$inferInsert;

/**
 * Dice rolls - history of all rolls made during sessions
 */
export const diceRolls = mysqlTable("diceRolls", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull(),
  sessionId: int("sessionId"),
  characterId: int("characterId"),
  userId: int("userId").notNull(),
  diceExpression: varchar("diceExpression", { length: 100 }).notNull(), // e.g., "2d20+5"
  result: int("result").notNull(),
  details: text("details"), // JSON string with individual rolls
  purpose: varchar("purpose", { length: 255 }), // attack, save, skill check, etc
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DiceRoll = typeof diceRolls.$inferSelect;
export type InsertDiceRoll = typeof diceRolls.$inferInsert;

/**
 * Battle maps - interactive battle grids
 */
export const battleMaps = mysqlTable("battleMaps", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull(),
  sessionId: int("sessionId"),
  name: varchar("name", { length: 255 }).notNull(),
  gridSize: int("gridSize").default(20).notNull(),
  mapData: text("mapData"), // JSON string with terrain and obstacles
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BattleMap = typeof battleMaps.$inferSelect;
export type InsertBattleMap = typeof battleMaps.$inferInsert;

/**
 * Battle tokens - character and monster positions on maps
 */
export const battleTokens = mysqlTable("battleTokens", {
  id: int("id").autoincrement().primaryKey(),
  battleMapId: int("battleMapId").notNull(),
  characterId: int("characterId"),
  monsterId: int("monsterId"),
  x: int("x").notNull(),
  y: int("y").notNull(),
  initiative: int("initiative"),
  isAlive: boolean("isAlive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BattleToken = typeof battleTokens.$inferSelect;
export type InsertBattleToken = typeof battleTokens.$inferInsert;
