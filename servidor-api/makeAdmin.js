const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function makeAdmin() {
  await prisma.user.updateMany({
    data: { role: 'ADMIN' }
  });
  console.log("✅ Todos los usuarios son ahora administradores");
}

makeAdmin().catch(console.error).finally(() => prisma.$disconnect());
