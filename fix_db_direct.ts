import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
    console.log("Starting Direct DB Fix...");

    const url = process.env.DATABASE_URL;
    if (!url) {
        console.error("No DATABASE_URL found in .env");
        process.exit(1);
    }

    try {
        const connection = await mysql.createConnection(url);
        console.log("Connected to Database!");

        // Create Users Table
        await connection.execute(`
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
        console.log("Users table verified.");

        // Create Campaigns Table
        await connection.execute(`
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
        console.log("Campaigns table verified.");

        // Check/Insert Admin
        const [users] = await connection.execute("SELECT id FROM users LIMIT 1");
        let masterId;

        if ((users as any[]).length === 0) {
            console.log("Creating Admin...");
            const [res] = await connection.execute(`
                INSERT INTO users (openId, name, role, userType, loginMethod) VALUES 
                ('mock-admin-openid', 'Admin', 'admin', 'master', 'mock')
            `);
            masterId = (res as any).insertId;
        } else {
            console.log("Admin exists.");
            masterId = (users as any[])[0].id;
        }

        // Check/Insert Campaign
        const [campaigns] = await connection.execute("SELECT id FROM campaigns LIMIT 1");
        if ((campaigns as any[]).length === 0) {
            console.log("Creating Default Campaign...");
            await connection.execute(`
                INSERT INTO campaigns (masterId, name, system, description) VALUES
                (?, 'Campanha Principal', 'D&D 5e', 'Campanha gerada automaticamente')
            `, [masterId]);
            console.log("Default Campaign Created.");
        } else {
            console.log("Campaigns exist.");
        }

        await connection.end();
        console.log("DONE.");

    } catch (e: any) {
        console.error("Direct Fix Failed:", e.message);
        process.exit(1);
    }
}

main();
