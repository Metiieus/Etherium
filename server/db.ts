import { eq, and, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users,
  campaigns, characters, campaignMembers, sessions, 
  diaryEntries, npcs, monsters, items, characterInventory,
  wikiEntries, diceRolls, battleMaps, battleTokens
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============ USER OPERATIONS ============

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (user.userType !== undefined) {
      values.userType = user.userType;
      updateSet.userType = user.userType;
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============ CAMPAIGN OPERATIONS ============

export async function createCampaign(masterId: number, name: string, description: string, system: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(campaigns).values({
    masterId,
    name,
    description,
    system,
  });
  
  return result[0].insertId;
}

export async function getCampaignsByMaster(masterId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(campaigns).where(eq(campaigns.masterId, masterId));
}

export async function getCampaignsByPlayer(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const memberCampaigns = await db
    .select({ campaignId: campaignMembers.campaignId })
    .from(campaignMembers)
    .where(eq(campaignMembers.userId, userId));
  
  const campaignIds = memberCampaigns.map(m => m.campaignId);
  if (campaignIds.length === 0) return [];
  
  return await db.select().from(campaigns).where(
    eq(campaigns.id, campaignIds[0]) // This is a simplified version
  );
}

export async function getCampaignById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function addPlayerToCampaign(campaignId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(campaignMembers).values({
    campaignId,
    userId,
  });
}

// ============ CHARACTER OPERATIONS ============

export async function createCharacter(
  campaignId: number,
  userId: number,
  name: string,
  race: string,
  characterClass: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(characters).values({
    campaignId,
    userId,
    name,
    race,
    class: characterClass,
  });
  
  return result[0].insertId;
}

export async function getCharactersByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(characters).where(eq(characters.userId, userId));
}

export async function getCharacterById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(characters).where(eq(characters.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getCharactersByCampaign(campaignId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(characters).where(eq(characters.campaignId, campaignId));
}

export async function updateCharacter(id: number, updates: Partial<typeof characters.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(characters).set(updates).where(eq(characters.id, id));
}

export async function updateCharacterHealth(characterId: number, currentHp: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(characters).set({ currentHp }).where(eq(characters.id, characterId));
}

export async function addExperienceToCharacter(characterId: number, experience: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const character = await getCharacterById(characterId);
  if (!character) throw new Error("Character not found");
  
  const newExp = character.experience + experience;
  const newLevel = Math.floor(newExp / 1000) + 1; // Simple leveling: 1000 exp per level
  
  await db.update(characters).set({
    experience: newExp,
    level: newLevel,
  }).where(eq(characters.id, characterId));
}

// ============ SESSION OPERATIONS ============

export async function createSession(campaignId: number, sessionNumber: number, title: string, date: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(sessions).values({
    campaignId,
    sessionNumber,
    title,
    date,
  });
  
  return result[0].insertId;
}

export async function getSessionsByCampaign(campaignId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(sessions).where(eq(sessions.campaignId, campaignId)).orderBy(desc(sessions.date));
}

export async function getSessionById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(sessions).where(eq(sessions.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============ DIARY OPERATIONS ============

export async function createDiaryEntry(
  campaignId: number,
  authorId: number,
  title: string,
  content: string,
  entryType: string,
  sessionId?: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(diaryEntries).values({
    campaignId,
    sessionId,
    authorId,
    title,
    content,
    entryType: entryType as any,
  });
  
  return result[0].insertId;
}

export async function getDiaryEntriesByCampaign(campaignId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(diaryEntries).where(eq(diaryEntries.campaignId, campaignId)).orderBy(desc(diaryEntries.createdAt));
}

// ============ NPC OPERATIONS ============

export async function createNPC(campaignId: number, name: string, role: string, description: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(npcs).values({
    campaignId,
    name,
    role,
    description,
  });
  
  return result[0].insertId;
}

export async function getNPCsByCampaign(campaignId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(npcs).where(eq(npcs.campaignId, campaignId));
}

// ============ MONSTER OPERATIONS ============

export async function createMonster(campaignId: number, name: string, type: string, hp: number, armorClass: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(monsters).values({
    campaignId,
    name,
    type,
    hp,
    armorClass,
  });
  
  return result[0].insertId;
}

export async function getMonstersByCampaign(campaignId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(monsters).where(eq(monsters.campaignId, campaignId));
}

// ============ ITEM OPERATIONS ============

export async function createItem(campaignId: number, name: string, itemType: string, description: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(items).values({
    campaignId,
    name,
    itemType,
    description,
  });
  
  return result[0].insertId;
}

export async function getItemsByCampaign(campaignId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(items).where(eq(items.campaignId, campaignId));
}

// ============ INVENTORY OPERATIONS ============

export async function addItemToInventory(characterId: number, itemId: number, quantity: number = 1) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await db.select().from(characterInventory)
    .where(and(eq(characterInventory.characterId, characterId), eq(characterInventory.itemId, itemId)))
    .limit(1);
  
  if (existing.length > 0) {
    await db.update(characterInventory)
      .set({ quantity: existing[0].quantity + quantity })
      .where(eq(characterInventory.id, existing[0].id));
  } else {
    await db.insert(characterInventory).values({
      characterId,
      itemId,
      quantity,
    });
  }
}

export async function getCharacterInventory(characterId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(characterInventory).where(eq(characterInventory.characterId, characterId));
}

// ============ WIKI OPERATIONS ============

export async function createWikiEntry(campaignId: number, title: string, category: string, content: string, createdBy: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(wikiEntries).values({
    campaignId,
    title,
    category,
    content,
    createdBy,
  });
  
  return result[0].insertId;
}

export async function getWikiEntriesByCampaign(campaignId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(wikiEntries).where(eq(wikiEntries.campaignId, campaignId));
}

export async function getWikiEntriesByCategory(campaignId: number, category: string) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(wikiEntries)
    .where(and(eq(wikiEntries.campaignId, campaignId), eq(wikiEntries.category, category)));
}

// ============ DICE ROLL OPERATIONS ============

export async function recordDiceRoll(
  campaignId: number,
  userId: number,
  diceExpression: string,
  result: number,
  purpose?: string,
  characterId?: number,
  sessionId?: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const rollRecord = await db.insert(diceRolls).values({
    campaignId,
    sessionId,
    characterId,
    userId,
    diceExpression,
    result,
    purpose,
  });
  
  return rollRecord[0].insertId;
}

export async function getDiceRollsByCampaign(campaignId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(diceRolls).where(eq(diceRolls.campaignId, campaignId)).orderBy(desc(diceRolls.createdAt));
}

// ============ BATTLE MAP OPERATIONS ============

export async function createBattleMap(campaignId: number, name: string, gridSize: number = 20) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(battleMaps).values({
    campaignId,
    name,
    gridSize,
  });
  
  return result[0].insertId;
}

export async function getBattleMapsByCampaign(campaignId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(battleMaps).where(eq(battleMaps.campaignId, campaignId));
}

export async function getBattleMapById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(battleMaps).where(eq(battleMaps.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============ BATTLE TOKEN OPERATIONS ============

export async function addTokenToBattleMap(battleMapId: number, x: number, y: number, characterId?: number, monsterId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(battleTokens).values({
    battleMapId,
    characterId,
    monsterId,
    x,
    y,
  });
  
  return result[0].insertId;
}

export async function getTokensForBattleMap(battleMapId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(battleTokens).where(eq(battleTokens.battleMapId, battleMapId));
}

export async function updateTokenPosition(tokenId: number, x: number, y: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(battleTokens).set({ x, y }).where(eq(battleTokens.id, tokenId));
}
