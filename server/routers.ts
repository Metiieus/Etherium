import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { TRPCError } from "@trpc/server";

// ============ HELPER: Check if user is master of campaign ============
async function isMasterOfCampaign(userId: number, campaignId: number): Promise<boolean> {
  const campaign = await db.getCampaignById(campaignId);
  return campaign?.masterId === userId;
}

async function isMemberOfCampaign(userId: number, campaignId: number): Promise<boolean> {
  const campaign = await db.getCampaignById(campaignId);
  if (!campaign) return false;
  
  if (campaign.masterId === userId) return true;
  
  // Check if player is member
  const dbInstance = await db.getDb();
  if (!dbInstance) return false;
  
  const { campaignMembers } = await import("../drizzle/schema");
  const { eq, and } = await import("drizzle-orm");
  
  const member = await dbInstance.select().from(campaignMembers)
    .where(and(eq(campaignMembers.campaignId, campaignId), eq(campaignMembers.userId, userId)))
    .limit(1);
  
  return member.length > 0;
}

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // ============ CAMPAIGN ROUTES ============
  campaign: router({
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        system: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.createCampaign(
          ctx.user.id,
          input.name,
          input.description || "",
          input.system
        );
        return { id: result };
      }),

    list: protectedProcedure.query(async ({ ctx }) => {
      const asMaster = await db.getCampaignsByMaster(ctx.user.id);
      const asPlayer = await db.getCampaignsByPlayer(ctx.user.id);
      
      return {
        asMaster,
        asPlayer,
      };
    }),

    getById: protectedProcedure
      .input(z.object({ campaignId: z.number() }))
      .query(async ({ ctx, input }) => {
        const isMember = await isMemberOfCampaign(ctx.user.id, input.campaignId);
        if (!isMember) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        
        return await db.getCampaignById(input.campaignId);
      }),

    addPlayer: protectedProcedure
      .input(z.object({
        campaignId: z.number(),
        userId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const isMaster = await isMasterOfCampaign(ctx.user.id, input.campaignId);
        if (!isMaster) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        
        await db.addPlayerToCampaign(input.campaignId, input.userId);
        return { success: true };
      }),
  }),

  // ============ CHARACTER ROUTES ============
  character: router({
    create: protectedProcedure
      .input(z.object({
        campaignId: z.number(),
        name: z.string().min(1),
        race: z.string().min(1),
        class: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const isMember = await isMemberOfCampaign(ctx.user.id, input.campaignId);
        if (!isMember) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        
        const result = await db.createCharacter(
          input.campaignId,
          ctx.user.id,
          input.name,
          input.race,
          input.class
        );
        
        return { id: result };
      }),

    getById: protectedProcedure
      .input(z.object({ characterId: z.number() }))
      .query(async ({ ctx, input }) => {
        const character = await db.getCharacterById(input.characterId);
        if (!character) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        
        const isMember = await isMemberOfCampaign(ctx.user.id, character.campaignId);
        if (!isMember && character.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        
        return character;
      }),

    listByUser: protectedProcedure.query(async ({ ctx }) => {
      return await db.getCharactersByUser(ctx.user.id);
    }),

    listByCampaign: protectedProcedure
      .input(z.object({ campaignId: z.number() }))
      .query(async ({ ctx, input }) => {
        const isMember = await isMemberOfCampaign(ctx.user.id, input.campaignId);
        if (!isMember) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        
        return await db.getCharactersByCampaign(input.campaignId);
      }),

    update: protectedProcedure
      .input(z.object({
        characterId: z.number(),
        updates: z.record(z.string(), z.any()),
      }))
      .mutation(async ({ ctx, input }) => {
        const character = await db.getCharacterById(input.characterId);
        if (!character) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        
        if (character.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        
        await db.updateCharacter(input.characterId, input.updates);
        return { success: true };
      }),

    updateHealth: protectedProcedure
      .input(z.object({
        characterId: z.number(),
        currentHp: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const character = await db.getCharacterById(input.characterId);
        if (!character) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        
        const isMaster = await isMasterOfCampaign(ctx.user.id, character.campaignId);
        if (!isMaster && character.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        
        await db.updateCharacterHealth(input.characterId, input.currentHp);
        return { success: true };
      }),

    addExperience: protectedProcedure
      .input(z.object({
        characterId: z.number(),
        experience: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const character = await db.getCharacterById(input.characterId);
        if (!character) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        
        const isMaster = await isMasterOfCampaign(ctx.user.id, character.campaignId);
        if (!isMaster) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        
        await db.addExperienceToCharacter(input.characterId, input.experience);
        return { success: true };
      }),
  }),

  // ============ SESSION ROUTES ============
  session: router({
    create: protectedProcedure
      .input(z.object({
        campaignId: z.number(),
        sessionNumber: z.number(),
        title: z.string().min(1),
        date: z.date(),
      }))
      .mutation(async ({ ctx, input }) => {
        const isMaster = await isMasterOfCampaign(ctx.user.id, input.campaignId);
        if (!isMaster) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        
        const result = await db.createSession(
          input.campaignId,
          input.sessionNumber,
          input.title,
          input.date
        );
        
        return { id: result };
      }),

    listByCampaign: protectedProcedure
      .input(z.object({ campaignId: z.number() }))
      .query(async ({ ctx, input }) => {
        const isMember = await isMemberOfCampaign(ctx.user.id, input.campaignId);
        if (!isMember) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        
        return await db.getSessionsByCampaign(input.campaignId);
      }),
  }),

  // ============ DIARY ROUTES ============
  diary: router({
    create: protectedProcedure
      .input(z.object({
        campaignId: z.number(),
        title: z.string().min(1),
        content: z.string().min(1),
        entryType: z.enum(["session_summary", "character_note", "world_note", "event"]),
        sessionId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const isMember = await isMemberOfCampaign(ctx.user.id, input.campaignId);
        if (!isMember) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        
        const result = await db.createDiaryEntry(
          input.campaignId,
          ctx.user.id,
          input.title,
          input.content,
          input.entryType,
          input.sessionId
        );
        
        return { id: result };
      }),

    listByCampaign: protectedProcedure
      .input(z.object({ campaignId: z.number() }))
      .query(async ({ ctx, input }) => {
        const isMember = await isMemberOfCampaign(ctx.user.id, input.campaignId);
        if (!isMember) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        
        return await db.getDiaryEntriesByCampaign(input.campaignId);
      }),
  }),

  // ============ NPC ROUTES ============
  npc: router({
    create: protectedProcedure
      .input(z.object({
        campaignId: z.number(),
        name: z.string().min(1),
        role: z.string(),
        description: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const isMaster = await isMasterOfCampaign(ctx.user.id, input.campaignId);
        if (!isMaster) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        
        const result = await db.createNPC(
          input.campaignId,
          input.name,
          input.role,
          input.description
        );
        
        return { id: result };
      }),

    listByCampaign: protectedProcedure
      .input(z.object({ campaignId: z.number() }))
      .query(async ({ ctx, input }) => {
        const isMember = await isMemberOfCampaign(ctx.user.id, input.campaignId);
        if (!isMember) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        
        return await db.getNPCsByCampaign(input.campaignId);
      }),
  }),

  // ============ MONSTER ROUTES ============
  monster: router({
    create: protectedProcedure
      .input(z.object({
        campaignId: z.number(),
        name: z.string().min(1),
        type: z.string(),
        hp: z.number(),
        armorClass: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const isMaster = await isMasterOfCampaign(ctx.user.id, input.campaignId);
        if (!isMaster) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        
        const result = await db.createMonster(
          input.campaignId,
          input.name,
          input.type,
          input.hp,
          input.armorClass
        );
        
        return { id: result };
      }),

    listByCampaign: protectedProcedure
      .input(z.object({ campaignId: z.number() }))
      .query(async ({ ctx, input }) => {
        const isMember = await isMemberOfCampaign(ctx.user.id, input.campaignId);
        if (!isMember) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        
        return await db.getMonstersByCampaign(input.campaignId);
      }),
  }),

  // ============ ITEM ROUTES ============
  item: router({
    create: protectedProcedure
      .input(z.object({
        campaignId: z.number(),
        name: z.string().min(1),
        itemType: z.string(),
        description: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const isMaster = await isMasterOfCampaign(ctx.user.id, input.campaignId);
        if (!isMaster) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        
        const result = await db.createItem(
          input.campaignId,
          input.name,
          input.itemType,
          input.description
        );
        
        return { id: result };
      }),

    listByCampaign: protectedProcedure
      .input(z.object({ campaignId: z.number() }))
      .query(async ({ ctx, input }) => {
        const isMember = await isMemberOfCampaign(ctx.user.id, input.campaignId);
        if (!isMember) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        
        return await db.getItemsByCampaign(input.campaignId);
      }),
  }),

  // ============ INVENTORY ROUTES ============
  inventory: router({
    addItem: protectedProcedure
      .input(z.object({
        characterId: z.number(),
        itemId: z.number(),
        quantity: z.number().default(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const character = await db.getCharacterById(input.characterId);
        if (!character) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        
        const isMaster = await isMasterOfCampaign(ctx.user.id, character.campaignId);
        if (!isMaster && character.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        
        await db.addItemToInventory(input.characterId, input.itemId, input.quantity);
        return { success: true };
      }),

    getCharacterInventory: protectedProcedure
      .input(z.object({ characterId: z.number() }))
      .query(async ({ ctx, input }) => {
        const character = await db.getCharacterById(input.characterId);
        if (!character) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        
        const isMember = await isMemberOfCampaign(ctx.user.id, character.campaignId);
        if (!isMember && character.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        
        return await db.getCharacterInventory(input.characterId);
      }),
  }),

  // ============ WIKI ROUTES ============
  wiki: router({
    create: protectedProcedure
      .input(z.object({
        campaignId: z.number(),
        title: z.string().min(1),
        category: z.string(),
        content: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const isMember = await isMemberOfCampaign(ctx.user.id, input.campaignId);
        if (!isMember) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        
        const result = await db.createWikiEntry(
          input.campaignId,
          input.title,
          input.category,
          input.content,
          ctx.user.id
        );
        
        return { id: result };
      }),

    listByCampaign: protectedProcedure
      .input(z.object({ campaignId: z.number() }))
      .query(async ({ ctx, input }) => {
        const isMember = await isMemberOfCampaign(ctx.user.id, input.campaignId);
        if (!isMember) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        
        return await db.getWikiEntriesByCampaign(input.campaignId);
      }),

    listByCategory: protectedProcedure
      .input(z.object({
        campaignId: z.number(),
        category: z.string(),
      }))
      .query(async ({ ctx, input }) => {
        const isMember = await isMemberOfCampaign(ctx.user.id, input.campaignId);
        if (!isMember) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        
        return await db.getWikiEntriesByCategory(input.campaignId, input.category);
      }),
  }),

  // ============ DICE ROLL ROUTES ============
  diceRoll: router({
    roll: protectedProcedure
      .input(z.object({
        campaignId: z.number(),
        diceExpression: z.string(),
        result: z.number(),
        purpose: z.string().optional(),
        characterId: z.number().optional(),
        sessionId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const isMember = await isMemberOfCampaign(ctx.user.id, input.campaignId);
        if (!isMember) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        
        const result = await db.recordDiceRoll(
          input.campaignId,
          ctx.user.id,
          input.diceExpression,
          input.result,
          input.purpose,
          input.characterId,
          input.sessionId
        );
        
        return { id: result };
      }),

    listByCampaign: protectedProcedure
      .input(z.object({ campaignId: z.number() }))
      .query(async ({ ctx, input }) => {
        const isMember = await isMemberOfCampaign(ctx.user.id, input.campaignId);
        if (!isMember) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        
        return await db.getDiceRollsByCampaign(input.campaignId);
      }),
  }),

  // ============ BATTLE MAP ROUTES ============
  battleMap: router({
    create: protectedProcedure
      .input(z.object({
        campaignId: z.number(),
        name: z.string().min(1),
        gridSize: z.number().default(20),
      }))
      .mutation(async ({ ctx, input }) => {
        const isMaster = await isMasterOfCampaign(ctx.user.id, input.campaignId);
        if (!isMaster) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        
        const result = await db.createBattleMap(
          input.campaignId,
          input.name,
          input.gridSize
        );
        
        return { id: result };
      }),

    listByCampaign: protectedProcedure
      .input(z.object({ campaignId: z.number() }))
      .query(async ({ ctx, input }) => {
        const isMember = await isMemberOfCampaign(ctx.user.id, input.campaignId);
        if (!isMember) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        
        return await db.getBattleMapsByCampaign(input.campaignId);
      }),

    getById: protectedProcedure
      .input(z.object({ mapId: z.number() }))
      .query(async ({ ctx, input }) => {
        const map = await db.getBattleMapById(input.mapId);
        if (!map) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        
        const isMember = await isMemberOfCampaign(ctx.user.id, map.campaignId);
        if (!isMember) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        
        return map;
      }),

    addToken: protectedProcedure
      .input(z.object({
        mapId: z.number(),
        x: z.number(),
        y: z.number(),
        characterId: z.number().optional(),
        monsterId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const map = await db.getBattleMapById(input.mapId);
        if (!map) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        
        const isMaster = await isMasterOfCampaign(ctx.user.id, map.campaignId);
        if (!isMaster) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        
        const result = await db.addTokenToBattleMap(
          input.mapId,
          input.x,
          input.y,
          input.characterId,
          input.monsterId
        );
        
        return { id: result };
      }),

    getTokens: protectedProcedure
      .input(z.object({ mapId: z.number() }))
      .query(async ({ ctx, input }) => {
        const map = await db.getBattleMapById(input.mapId);
        if (!map) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        
        const isMember = await isMemberOfCampaign(ctx.user.id, map.campaignId);
        if (!isMember) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        
        return await db.getTokensForBattleMap(input.mapId);
      }),

    updateTokenPosition: protectedProcedure
      .input(z.object({
        tokenId: z.number(),
        x: z.number(),
        y: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        // TODO: Add proper permission check
        await db.updateTokenPosition(input.tokenId, input.x, input.y);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
