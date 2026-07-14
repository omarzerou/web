const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany();
  const rests = await prisma.restaurant.findMany();
  console.log('USERS:', users);
  console.log('RESTAURANTS:', rests.map(r => ({ id: r.id, name: r.name, ownerId: r.ownerId })));
}
main().finally(() => prisma.$disconnect());
