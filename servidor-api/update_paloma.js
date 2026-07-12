const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updatePalomaBlanca() {
  console.log('Buscando El Kebab Real...');
  const kebabReal = await prisma.restaurant.findFirst({
    where: { name: 'El Kebab Real' }
  });

  if (!kebabReal) {
    console.log('No se encontró el restaurante original. Asegúrate de haber ejecutado el seed anterior.');
    return;
  }

  console.log('Actualizando restaurante a Paloma Blanca...');
  const palomaBlanca = await prisma.restaurant.update({
    where: { id: kebabReal.id },
    data: {
      name: 'Paloma Blanca',
      description: 'Comida para llevar (100% Halal). Teléfono: 631 565 162',
      address: 'Avda Andalucia, N. 47, Palmones',
      // We keep the generic kebab image since we don't have a direct URL for the provided screenshot
    }
  });

  console.log('Eliminando productos antiguos (si los hay)...');
  await prisma.product.deleteMany({
    where: { restaurantId: palomaBlanca.id }
  });

  console.log('Añadiendo el nuevo menú...');
  const menuItems = [
    { name: "BANDEJA GRANDE COMPLETA", price: 6.00, category: "Bandejas" },
    { name: "BANDEJA GRANDE, CARNE + PATATA + SALSA", price: 6.50, category: "Bandejas" },
    { name: "BANDEJA MEDIANA COMPLETA", price: 4.50, category: "Bandejas" },
    { name: "BANDEJA MEDIANA SOLO PATATA", price: 2.50, category: "Bandejas" },
    { name: "BANDEJA PEQUEÑA COMPLETA", price: 3.50, category: "Bandejas" },
    { name: "BANDEJA PEQUEÑA SOLO PATATA", price: 2.00, category: "Bandejas" },
    { name: "CAMPERO DE POLLO", price: 4.50, category: "Camperos" },
    { name: "CAMPERO DE TERNERA", price: 4.50, category: "Camperos" },
    { name: "CAMPERO DE PINCHITO", price: 4.50, category: "Camperos" },
    { name: "CAMPERO FILETE DE POLLO", price: 5.00, category: "Camperos" },
    { name: "PITA DE POLLO + PIN PINCHITO", price: 4.50, category: "Pitas y Media Luna" },
    { name: "PITA DE TERNERA + PINCHITO", price: 4.50, category: "Pitas y Media Luna" },
    { name: "MEDIA LUNA DE POLLO + PINCHITO", price: 4.50, category: "Pitas y Media Luna" },
    { name: "MEDIA LUNA DE TERNERA + PINCHITO", price: 4.50, category: "Pitas y Media Luna" },
    { name: "CHAWARMA DE POLLO + PINCHITO", price: 4.50, category: "Chawarmas" },
    { name: "CHAWARMA DE TERNERA + PINCHITO", price: 4.50, category: "Chawarmas" },
    { name: "HAMBURGUESA DE POLLO", price: 4.50, category: "Hamburguesas" },
    { name: "HAMBURGUESA DE TERNERA", price: 4.50, category: "Hamburguesas" },
    { name: "HAMBURGUESA DE PINCHITO", price: 4.50, category: "Hamburguesas" },
    { name: "ROLLO DE PIZZA COMPLETA", price: 5.50, category: "Pizzas" },
    { name: "PIZZA DE CARNE", price: 7.00, category: "Pizzas" },
    { name: "PIZZA DE ATUN", price: 7.00, category: "Pizzas" },
    { name: "PIZZA DE QUESO", price: 7.00, category: "Pizzas" },
    { name: "INGREDIENTES EXTRAS: HUEVO FRITO", price: 0.50, category: "Extras" },
    { name: "INGREDIENTES EXTRAS: QUESO", price: 0.50, category: "Extras" },
  ];

  for (const item of menuItems) {
    await prisma.product.create({
      data: {
        name: item.name,
        price: item.price,
        category: item.category,
        description: 'Ingredientes: Lechuga, Cebolla, Tomate, Aceituna, Zanahoria, Maiz. Salsas: Yogur, Mahonesa, Ketchup, Picante, Ali-Oli, Gaucha',
        restaurantId: palomaBlanca.id
      }
    });
  }

  console.log('¡Menú de Paloma Blanca añadido con éxito!');
  await prisma.$disconnect();
}

updatePalomaBlanca().catch(e => {
  console.error(e);
  process.exit(1);
});
