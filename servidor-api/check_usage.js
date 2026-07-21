const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const rests = await prisma.restaurant.findMany({
    include: {
      _count: {
        select: { products: true, orders: true }
      }
    }
  });
  console.log(JSON.stringify(rests.map(x => ({
    name: x.name,
    slug: x.slug,
    products: x._count.products,
    orders: x._count.orders
  })), null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
