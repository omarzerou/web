const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateImages() {
  console.log('Buscando productos de Paloma Blanca...');
  const palomaBlanca = await prisma.restaurant.findFirst({
    where: { name: 'Paloma Blanca' }
  });

  if (!palomaBlanca) {
    console.log('No se encontró el restaurante Paloma Blanca.');
    return;
  }

  const products = await prisma.product.findMany({
    where: { restaurantId: palomaBlanca.id }
  });

  console.log(`Encontrados ${products.length} productos. Asignando imágenes...`);

  const images = {
    "Bandejas": "https://images.unsplash.com/photo-1599921841143-819065a55cc6?w=600&h=400&fit=crop", // Plato de carne kebab
    "Camperos": "https://images.unsplash.com/photo-1619881589316-56c7f9e6b587?w=600&h=400&fit=crop", // Sandwich/Campero
    "Pitas y Media Luna": "https://images.unsplash.com/photo-1559847844-5315695dadae?w=600&h=400&fit=crop", // Pita rellena
    "Chawarmas": "https://images.unsplash.com/photo-1528735602780-2ea562548239?w=600&h=400&fit=crop", // Rollo Shawarma
    "Hamburguesas": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&h=400&fit=crop", // Burger
    "Pizzas": "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&h=400&fit=crop", // Pizza
    "Extras": "https://images.unsplash.com/photo-1601614408109-bc01511fa35a?w=600&h=400&fit=crop" // Salsas/Ingredientes
  };

  for (const product of products) {
    let img = images[product.category] || "https://images.unsplash.com/photo-1529543544282-ea669407fca3?w=600&h=400&fit=crop";
    
    // Asignación un poco más específica por nombre si es necesario
    if (product.name.includes('ATUN')) {
      img = "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600&h=400&fit=crop"; // Pizza atún
    } else if (product.name.includes('QUESO')) {
      img = "https://images.unsplash.com/photo-1573821663912-569905455b1c?w=600&h=400&fit=crop"; // Queso extra o pizza queso
    } else if (product.name.includes('HUEVO')) {
      img = "https://images.unsplash.com/photo-1525351484163-c5290fd85662?w=600&h=400&fit=crop"; // Huevo frito
    } else if (product.name.includes('ROLLO DE PIZZA')) {
      img = "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=600&h=400&fit=crop"; // Rollo pizza
    }

    await prisma.product.update({
      where: { id: product.id },
      data: { imageUrl: img }
    });
  }

  console.log('¡Imágenes asignadas a todos los productos!');
  await prisma.$disconnect();
}

updateImages().catch(e => {
  console.error(e);
  process.exit(1);
});
