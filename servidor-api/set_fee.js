const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.restaurant.updateMany({
    data: { deliveryFee: 2 }
  });
  console.log("Updated delivery fee to 2 for all restaurants.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
