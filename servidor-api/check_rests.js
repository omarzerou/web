const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const rests = await prisma.restaurant.findMany();
  console.log(JSON.stringify(rests.map(x => ({
    id: x.id,
    slug: x.slug,
    name: x.name,
    deliveryFee: x.deliveryFee,
    ownerId: x.ownerId
  })), null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
