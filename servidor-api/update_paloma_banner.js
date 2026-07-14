const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updatePalomaBanner() {
  console.log('Buscando Paloma Blanca...');
  const palomaBlanca = await prisma.restaurant.findFirst({
    where: { name: 'Paloma Blanca' }
  });

  if (!palomaBlanca) {
    console.log('No se encontró el restaurante Paloma Blanca.');
    return;
  }

  await prisma.restaurant.update({
    where: { id: palomaBlanca.id },
    data: { imageUrl: '/paloma-blanca-banner.png' }
  });

  console.log('¡Banner de Paloma Blanca actualizado!');
  await prisma.$disconnect();
}

updatePalomaBanner().catch(e => {
  console.error(e);
  process.exit(1);
});
