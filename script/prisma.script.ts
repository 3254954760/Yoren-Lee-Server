import { prisma } from '../lib/prisma'
import dotenv from "dotenv";
dotenv.config({ path: "../.env" });
console.log("PRISMA_DATABASE_URL=", process.env.PRISMA_DATABASE_URL);

async function main() {
    // Example: Fetch all records from a table
    // Replace 'user' with your actual model name
    const allUsers = await prisma.user.findMany()
    console.log('All users:', JSON.stringify(allUsers, null, 2))
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })