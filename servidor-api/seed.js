const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function seed() {
  // Crear superadmins
  for (const email of ['poleljesus@gmail.com', 'hhhhh@gmail.com']) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (!existing) {
      await prisma.user.create({ data: { email, name: 'SuperAdmin', role: 'ADMIN' } });
      console.log('Creado:', email);
    } else {
      await prisma.user.update({ where: { email }, data: { role: 'ADMIN' } });
      console.log('Actualizado a ADMIN:', email);
    }
  }
  // Restaurantes demo
  const owner = await prisma.user.findFirst({ where: { email: 'hhhhh@gmail.com' } });
  const count = await prisma.restaurant.count();
  if (count === 0 && owner) {
    await prisma.restaurant.createMany({ data: [
      { name: 'El Kebab Real', description: 'El mejor kebab de la ciudad', address: 'Calle Ruiz Zorrilla 34, Algeciras', imageUrl: 'https://images.unsplash.com/photo-1529543544282-ea669407fca3?w=800', status: 'APPROVED', ownerId: owner.id },
      { name: 'Pizza Roma', description: 'Pizza napolitana al horno de leña', address: 'Calle Cayetano del Toro 15, Algeciras', imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800', status: 'APPROVED', ownerId: owner.id },
      { name: 'Kebab Istanbul', description: 'Autentico sabor turco', address: 'Calle Alfonso XI 5, Algeciras', imageUrl: 'https://images.unsplash.com/photo-1529543544282-ea669407fca3?w=800', status: 'PENDING', ownerId: owner.id },
    ]});
    console.log('Restaurantes demo creados');
  }
  await prisma.$disconnect();
  console.log('Seed OK');
}
seed().catch(e => { console.error(e); process.exit(1); });
