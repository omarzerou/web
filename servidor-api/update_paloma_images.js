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
    "Menús": "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&h=400&fit=crop", // Combo meal
    "Kebabs": "https://images.unsplash.com/photo-1529543544282-ea669407fca3?w=600&h=400&fit=crop", // Kebab
    "Shawarmas": "https://images.unsplash.com/photo-1528735602780-2ea562548239?w=600&h=400&fit=crop", // Shawarma
    "Hamburguesas": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&h=400&fit=crop", // Burger
    "Bandejas": "https://images.unsplash.com/photo-1599921841143-819065a55cc6?w=600&h=400&fit=crop", // Plato kebab
    "Tacos": "https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=600&h=400&fit=crop", // Tacos
    "Camperos": "https://images.unsplash.com/photo-1619881589316-56c7f9e6b587?w=600&h=400&fit=crop", // Sandwich/Campero
    "Media Luna": "https://images.unsplash.com/photo-1559847844-5315695dadae?w=600&h=400&fit=crop", // Pita/Media Luna
    "Pizzas": "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&h=400&fit=crop", // Pizza
    "Entrantes": "https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?w=600&h=400&fit=crop", // Fries/Entrantes
    "Bebidas": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&h=400&fit=crop", // Refrescos
    "Extras": "https://images.unsplash.com/photo-1601614408109-bc01511fa35a?w=600&h=400&fit=crop" // Salsas
  };

  for (const product of products) {
    let img = images[product.category] || "https://images.unsplash.com/photo-1529543544282-ea669407fca3?w=600&h=400&fit=crop";
    
    // Asignación específica por nombre
    const name = product.name.toUpperCase();
    if (name.includes('ATÚN') || name.includes('ATUN')) {
      img = "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600&h=400&fit=crop"; // Pizza atún
    } else if (name.includes('QUESO')) {
      img = "https://images.unsplash.com/photo-1573821663912-569905455b1c?w=600&h=400&fit=crop"; // Queso
    } else if (name.includes('HUEVO')) {
      img = "https://images.unsplash.com/photo-1525351484163-c5290fd85662?w=600&h=400&fit=crop"; // Huevo frito
    } else if (name.includes('NUGGETS')) {
      img = "https://images.unsplash.com/photo-1562967914-608f82629710?w=600&h=400&fit=crop"; // Nuggets
    } else if (name.includes('ALITAS')) {
      img = "https://images.unsplash.com/photo-1608039829572-78524f79c4c7?w=600&h=400&fit=crop"; // Alitas de pollo
    } else if (name.includes('FALAFEL')) {
      img = "https://images.unsplash.com/photo-1593010953645-db1fbdd8a3ec?w=600&h=400&fit=crop"; // Falafel
    } else if (name.includes('AGUA')) {
      img = "https://images.unsplash.com/photo-1523362628745-0c100150b504?w=600&h=400&fit=crop"; // Agua mineral
    } else if (name.includes('LAHMACUN') || name.includes('TURCA')) {
      img = "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&h=400&fit=crop"; // Pizza/Pan turco
    } else if (name.includes('TIRAS DE POLLO')) {
      img = "https://images.unsplash.com/photo-1569691899455-88464f6d3ab1?w=600&h=400&fit=crop"; // Tiras de pollo empanado
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
