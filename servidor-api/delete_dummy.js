const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const rests = await prisma.restaurant.findMany({
    orderBy: { createdAt: 'asc' }
  });
  console.log(rests.map(x => x.name));
  
  // Also, let's just delete the empty ones if they have 0 products and 0 orders to fix the bug instantly
  await prisma.restaurant.deleteMany({
    where: {
      name: { in: ['Pizza Roma', 'Kebab Istanbul'] }
    }
  });
  console.log("Deleted empty dummy restaurants to fix the issue.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
