import { describe, expect, it, beforeEach, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createMasterContext(userId: number = 1): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `master-${userId}`,
    email: `master${userId}@example.com`,
    name: `Master ${userId}`,
    loginMethod: "manus",
    role: "user",
    userType: "master",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };

  return { ctx };
}

function createPlayerContext(userId: number = 2): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `player-${userId}`,
    email: `player${userId}@example.com`,
    name: `Player ${userId}`,
    loginMethod: "manus",
    role: "user",
    userType: "player",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };

  return { ctx };
}

describe("Campaign Routes", () => {
  describe("campaign.create", () => {
    it("should allow a master to create a campaign", async () => {
      const { ctx } = createMasterContext(1);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.campaign.create({
        name: "The Lost Kingdom",
        description: "A campaign about a lost kingdom",
        system: "D&D 5e",
      });

      expect(result).toHaveProperty("id");
      expect(typeof result.id).toBe("number");
    });

    it("should create a campaign with correct properties", async () => {
      const { ctx } = createMasterContext(1);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.campaign.create({
        name: "Dragon's Hoard",
        description: "A campaign about dragons",
        system: "Pathfinder",
      });

      expect(result.id).toBeDefined();
    });
  });

  describe("campaign.list", () => {
    it("should return campaigns for a master", async () => {
      const { ctx } = createMasterContext(1);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.campaign.list();

      expect(result).toHaveProperty("asMaster");
      expect(result).toHaveProperty("asPlayer");
      expect(Array.isArray(result.asMaster)).toBe(true);
      expect(Array.isArray(result.asPlayer)).toBe(true);
    });
  });
});

describe("Character Routes", () => {
  describe("character.create", () => {
    it("should allow a player to create a character in a campaign", async () => {
      const masterCtx = createMasterContext(1);
      const playerCtx = createPlayerContext(2);
      
      const masterCaller = appRouter.createCaller(masterCtx.ctx);
      const playerCaller = appRouter.createCaller(playerCtx.ctx);

      // First, create a campaign as master
      const campaign = await masterCaller.campaign.create({
        name: "Test Campaign",
        description: "A test campaign",
        system: "D&D 5e",
      });

      // Add player to campaign
      await masterCaller.campaign.addPlayer({
        campaignId: campaign.id,
        userId: 2,
      });

      // Create character as player
      const character = await playerCaller.character.create({
        campaignId: campaign.id,
        name: "Aragorn",
        race: "Human",
        class: "Ranger",
      });

      expect(character).toHaveProperty("id");
      expect(typeof character.id).toBe("number");
    });
  });

  describe("character.getById", () => {
    it("should retrieve a character by ID", async () => {
      const masterCtx = createMasterContext(1);
      const playerCtx = createPlayerContext(2);
      
      const masterCaller = appRouter.createCaller(masterCtx.ctx);
      const playerCaller = appRouter.createCaller(playerCtx.ctx);

      // Create campaign and character
      const campaign = await masterCaller.campaign.create({
        name: "Test Campaign 2",
        description: "Another test campaign",
        system: "D&D 5e",
      });

      await masterCaller.campaign.addPlayer({
        campaignId: campaign.id,
        userId: 2,
      });

      const character = await playerCaller.character.create({
        campaignId: campaign.id,
        name: "Legolas",
        race: "Elf",
        class: "Ranger",
      });

      // Retrieve character
      const retrieved = await playerCaller.character.getById({
        characterId: character.id,
      });

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe("Legolas");
      expect(retrieved?.race).toBe("Elf");
    });
  });

  describe("character.listByUser", () => {
    it("should list all characters for a user", async () => {
      const { ctx } = createPlayerContext(2);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.character.listByUser();

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("character.addExperience", () => {
    it("should allow master to add experience to a character", async () => {
      const masterCtx = createMasterContext(1);
      const playerCtx = createPlayerContext(2);
      
      const masterCaller = appRouter.createCaller(masterCtx.ctx);
      const playerCaller = appRouter.createCaller(playerCtx.ctx);

      // Setup
      const campaign = await masterCaller.campaign.create({
        name: "Test Campaign 3",
        description: "Experience test",
        system: "D&D 5e",
      });

      await masterCaller.campaign.addPlayer({
        campaignId: campaign.id,
        userId: 2,
      });

      const character = await playerCaller.character.create({
        campaignId: campaign.id,
        name: "Gimli",
        race: "Dwarf",
        class: "Fighter",
      });

      // Add experience
      const result = await masterCaller.character.addExperience({
        characterId: character.id,
        experience: 500,
      });

      expect(result.success).toBe(true);
    });
  });
});

describe("Session Routes", () => {
  describe("session.create", () => {
    it("should allow master to create a session", async () => {
      const masterCtx = createMasterContext(1);
      const masterCaller = appRouter.createCaller(masterCtx.ctx);

      const campaign = await masterCaller.campaign.create({
        name: "Session Test Campaign",
        description: "Testing sessions",
        system: "D&D 5e",
      });

      const session = await masterCaller.session.create({
        campaignId: campaign.id,
        sessionNumber: 1,
        title: "The Beginning",
        date: new Date(),
      });

      expect(session).toHaveProperty("id");
      expect(typeof session.id).toBe("number");
    });
  });
});

describe("Diary Routes", () => {
  describe("diary.create", () => {
    it("should allow campaign members to create diary entries", async () => {
      const masterCtx = createMasterContext(1);
      const playerCtx = createPlayerContext(2);
      
      const masterCaller = appRouter.createCaller(masterCtx.ctx);
      const playerCaller = appRouter.createCaller(playerCtx.ctx);

      const campaign = await masterCaller.campaign.create({
        name: "Diary Test Campaign",
        description: "Testing diary",
        system: "D&D 5e",
      });

      await masterCaller.campaign.addPlayer({
        campaignId: campaign.id,
        userId: 2,
      });

      const entry = await playerCaller.diary.create({
        campaignId: campaign.id,
        title: "First Adventure",
        content: "Today we started our journey...",
        entryType: "character_note",
      });

      expect(entry).toHaveProperty("id");
      expect(typeof entry.id).toBe("number");
    });
  });
});
