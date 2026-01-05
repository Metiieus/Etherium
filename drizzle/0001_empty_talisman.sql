CREATE TABLE `battleMaps` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`sessionId` int,
	`name` varchar(255) NOT NULL,
	`gridSize` int NOT NULL DEFAULT 20,
	`mapData` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `battleMaps_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `battleTokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`battleMapId` int NOT NULL,
	`characterId` int,
	`monsterId` int,
	`x` int NOT NULL,
	`y` int NOT NULL,
	`initiative` int,
	`isAlive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `battleTokens_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `campaignMembers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`userId` int NOT NULL,
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `campaignMembers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `campaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`masterId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`system` varchar(100) NOT NULL,
	`status` enum('active','paused','completed') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `campaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `characterInventory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`characterId` int NOT NULL,
	`itemId` int NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`equipped` boolean NOT NULL DEFAULT false,
	`addedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `characterInventory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `characters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`race` varchar(100),
	`class` varchar(100),
	`level` int NOT NULL DEFAULT 1,
	`experience` int NOT NULL DEFAULT 0,
	`strength` int NOT NULL DEFAULT 10,
	`dexterity` int NOT NULL DEFAULT 10,
	`constitution` int NOT NULL DEFAULT 10,
	`intelligence` int NOT NULL DEFAULT 10,
	`wisdom` int NOT NULL DEFAULT 10,
	`charisma` int NOT NULL DEFAULT 10,
	`maxHp` int NOT NULL DEFAULT 10,
	`currentHp` int NOT NULL DEFAULT 10,
	`armorClass` int NOT NULL DEFAULT 10,
	`backstory` text,
	`appearance` text,
	`personality` text,
	`totalPoints` int NOT NULL DEFAULT 0,
	`sessionCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `characters_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `diaryEntries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`sessionId` int,
	`authorId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`entryType` enum('session_summary','character_note','world_note','event') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `diaryEntries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `diceRolls` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`sessionId` int,
	`characterId` int,
	`userId` int NOT NULL,
	`diceExpression` varchar(100) NOT NULL,
	`result` int NOT NULL,
	`details` text,
	`purpose` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `diceRolls_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`itemType` varchar(100) NOT NULL,
	`rarity` varchar(50),
	`description` text,
	`effects` text,
	`quantity` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `monsters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` varchar(100),
	`challengeRating` decimal(3,1),
	`hp` int,
	`armorClass` int,
	`description` text,
	`abilities` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `monsters_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `npcs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`role` varchar(100),
	`description` text,
	`alignment` varchar(50),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `npcs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`sessionNumber` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`date` timestamp NOT NULL,
	`summary` text,
	`status` enum('scheduled','completed','cancelled') NOT NULL DEFAULT 'scheduled',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wikiEntries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`category` varchar(100) NOT NULL,
	`content` text NOT NULL,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `wikiEntries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `userType` enum('player','master','both') DEFAULT 'player' NOT NULL;