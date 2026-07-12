const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedProducts() {
  // Encontrar un restaurante aprobado
  const restaurant = await prisma.restaurant.findFirst({
    where: { status: 'APPROVED' },
    orderBy: { createdAt: 'desc' }
  });

  if (!restaurant) {
    console.log("❌ No hay ningún restaurante aprobado donde insertar los productos.");
    return;
  }

  console.log(`🍽️ Insertando menú falso en el restaurante: ${restaurant.name}...`);

  await prisma.product.createMany({
    data: [
      {
        name: 'Kebab de Ternera (Pita)',
        description: 'Auténtico Kebab de ternera 100% halal servido en pan de pita recién horneado.',
        price: 4.00,
        imageUrl: 'https://images.unsplash.com/photo-1529148482759-b3c18b14e918?w=800',
        restaurantId: restaurant.id
      },
      {
        name: 'Durum Mixto',
        description: 'Enrollado gigante con mezcla de pollo y ternera asada.',
        price: 5.50,
        imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800', // Usando foto general
        restaurantId: restaurant.id
      },
      {
        name: 'Ración de Patatas',
        description: 'Patatas fritas crujientes con especias especiales.',
        price: 2.50,
        imageUrl: 'https://images.unsplash.com/photo-1576107232684-1279f390859f?w=800',
        restaurantId: restaurant.id
      },
      {
        name: 'Plato Kebab',
        description: 'Carne de kebab servida en plato con ensalada y patatas o arroz.',
        price: 7.00,
        imageUrl: 'https://images.unsplash.com/photo-1544025162-81111420d440?w=800',
        restaurantId: restaurant.id
      }
    ]
  });

  console.log("✅ Productos inyectados con éxito.");
}

seedProducts().catch(console.error).finally(() => prisma.$disconnect());
