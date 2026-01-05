import "dotenv/config";
import { getDb } from "./server/db";
import { campaigns, users } from "./drizzle/schema";
import { eq } from "drizzle-orm";

async function main() {
    console.log("Verifying DB...");
    const db = await getDb();
    if (!db) {
        console.error("Failed to connect to DB");
        process.exit(1);
    }

    // Force Create Tables (Minimal) if they don't exist
    try {
        console.log("Forcing table creation...");
        const { sql } = await import("drizzle-orm");

        // Users Table
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                openId VARCHAR(255) NOT NULL,
                name VARCHAR(255),
                role VARCHAR(50) DEFAULT 'user',
                userType VARCHAR(50) DEFAULT 'player',
                loginMethod VARCHAR(50),
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                lastSignedIn TIMESTAMP,
                email VARCHAR(255)
            )
        `);

        // Campaigns Table
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS campaigns (
                id INT AUTO_INCREMENT PRIMARY KEY,
                masterId INT NOT NULL,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                system VARCHAR(255),
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // Check if Admin exists
        let masterId: number;
        const usersList = await db.select().from(users);
        if (usersList.length === 0) {
            console.log("Creating Admin User...");
            const res: any = await db.execute(sql`
                INSERT INTO users (openId, name, role, userType, loginMethod) VALUES 
                ('mock-admin-openid', 'Admin', 'admin', 'master', 'mock')
             `);
            masterId = res[0].insertId;
        } else {
            masterId = usersList[0].id;
        }

        // Check Campaigns
        const campaignsList = await db.select().from(campaigns);
        if (campaignsList.length === 0) {
            console.log("Creating Default Campaign...");
            await db.execute(sql`
                INSERT INTO campaigns (masterId, name, system, description) VALUES
                (${masterId}, 'Campanha Principal', 'D&D 5e', 'Campanha gerada automaticamente')
            `);
            console.log("SUCCESS: Default Campaign Created");
        } else {
            console.log("Campaigns already exist");
        }

    } catch (e: any) {
        console.error("Manual setup failed:", e.message);
        console.error(e);
        process.exit(1);
    }

    process.exit(0);
}

main().catch(console.error);
