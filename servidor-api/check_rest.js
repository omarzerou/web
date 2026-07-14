const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const rest = await prisma.restaurant.findFirst();
  console.log(rest);
}
main().catch(console.error).finally(() => prisma.$disconnect());
