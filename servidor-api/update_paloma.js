const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updatePalomaBlanca() {
  console.log('Buscando Paloma Blanca...');
  const palomaBlanca = await prisma.restaurant.findFirst({
    where: { name: 'Paloma Blanca' }
  });

  if (!palomaBlanca) {
    console.log('No se encontró el restaurante Paloma Blanca.');
    return;
  }

  console.log('Eliminando productos antiguos...');
  const orders = await prisma.order.findMany({ where: { restaurantId: palomaBlanca.id } });
  for (const order of orders) {
    await prisma.orderItem.deleteMany({ where: { orderId: order.id } });
  }
  await prisma.order.deleteMany({ where: { restaurantId: palomaBlanca.id } });
  await prisma.product.deleteMany({ where: { restaurantId: palomaBlanca.id } });

  console.log('Añadiendo el nuevo menú...');

  const meatOptions = [
    { id: "ter", label: "Ternera", price: 0 },
    { id: "pol", label: "Pollo", price: 0 },
    { id: "mix", label: "Mixto", price: 0 }
  ];

  const vegOptions = [
    { id: "v_lec", label: "Lechuga", price: 0 },
    { id: "v_tom", label: "Tomate", price: 0 },
    { id: "v_ceb", label: "Cebolla", price: 0 },
    { id: "v_ace", label: "Aceitunas", price: 0 },
    { id: "v_pep", label: "Pepinillo", price: 0 },
    { id: "v_mai", label: "Maíz", price: 0 },
    { id: "v_zan", label: "Zanahoria", price: 0 }
  ];
  
  const sauceOptions = [
    { id: "s_yog", label: "Yogurt", price: 0 },
    { id: "s_may", label: "Mayonesa", price: 0 },
    { id: "s_ket", label: "Ketchup", price: 0 },
    { id: "s_gau", label: "Gaucha", price: 0 },
    { id: "s_ali", label: "Alioli", price: 0 },
    { id: "s_pic", label: "Picante", price: 0 },
    { id: "s_bar", label: "Barbacoa", price: 0 },
    { id: "s_mos", label: "Mostaza", price: 0 },
    { id: "s_and", label: "Andaluza", price: 0 }
  ];

  const standardCustomization = [
    {
      id: "meat",
      title: "¿Qué carne prefieres?",
      type: "radio",
      options: meatOptions
    },
    {
      id: "veggies",
      title: "Elige tus ingredientes vegetales",
      type: "pill",
      max: 7,
      options: vegOptions
    },
    {
      id: "sauces",
      title: "Elige tus salsas",
      type: "pill",
      max: 3,
      options: sauceOptions
    }
  ];

  const menuItems = [
    { name: "Menú con Kebab, Patatas, Bebidas", price: 7.00, category: "Menús", sectionsData: JSON.stringify(standardCustomization) },
    { name: "Kebab", price: 4.50, category: "Kebabs", sectionsData: JSON.stringify(standardCustomization) },
    { name: "Shawarma", price: 4.50, category: "Shawarmas", sectionsData: JSON.stringify(standardCustomization) },
    { name: "Hamburguesa", price: 4.50, category: "Hamburguesas", sectionsData: JSON.stringify([{ id: "meat", title: "¿Qué carne prefieres?", type: "radio", options: [{ id: "ter", label: "Ternera", price: 0 }, { id: "pol", label: "Pollo", price: 0 }] }, { id: "veggies", title: "Ingredientes vegetales", type: "pill", options: vegOptions }, { id: "sauces", title: "Salsas", type: "pill", options: sauceOptions }]) },
    { name: "Bandeja de carne Grande", price: 6.50, category: "Bandejas", sectionsData: JSON.stringify(standardCustomization) },
    { name: "Bandeja de carne Mediana", price: 4.50, category: "Bandejas", sectionsData: JSON.stringify(standardCustomization) },
    { name: "Bandeja de carne Pequeña", price: 3.50, category: "Bandejas", sectionsData: JSON.stringify(standardCustomization) },
    { name: "Tacos", price: 5.00, category: "Tacos", sectionsData: JSON.stringify(standardCustomization) },
    { name: "Campero", price: 4.50, category: "Camperos", sectionsData: JSON.stringify(standardCustomization) },
    { name: "Media Luna de carne", price: 4.50, category: "Media Luna", sectionsData: JSON.stringify(standardCustomization) },
    { name: "Lahmacun (Pizza turca)", price: 5.50, category: "Pizzas" },
    { name: "Pizza Gamba", price: 8.00, category: "Pizzas" },
    { name: "Pizza Atún", price: 7.00, category: "Pizzas" },
    { name: "Pizza Carne", price: 7.00, category: "Pizzas" },
    { name: "Pastela", price: 2.00, category: "Entrantes" },
    { name: "Tiras de pollo", price: 4.50, category: "Entrantes" },
    { name: "Alitas de pollo", price: 5.50, category: "Entrantes" },
    { name: "Nuggets de pollo", price: 4.50, category: "Entrantes" },
    { name: "Falafel", price: 4.50, category: "Entrantes" },
    { name: "Briwat", price: 1.50, category: "Entrantes" },
    { name: "Bebida Lata", price: 1.20, category: "Bebidas" },
    { name: "Bebida Botella 2L", price: 2.50, category: "Bebidas" },
    { name: "Agua grande", price: 1.00, category: "Bebidas" },
    { name: "Agua pequeña", price: 0.50, category: "Bebidas" },
    { name: "Extra: Huevo", price: 0.50, category: "Extras" },
    { name: "Extra: Queso", price: 0.60, category: "Extras" },
  ];

  for (const item of menuItems) {
    await prisma.product.create({
      data: {
        name: item.name,
        price: item.price,
        category: item.category,
        description: item.sectionsData ? 'Personaliza tu plato a tu gusto.' : '',
        sectionsData: item.sectionsData || null,
        restaurantId: palomaBlanca.id
      }
    });
  }

  console.log('¡Menú de Paloma Blanca actualizado con customización!');
  await prisma.$disconnect();
}

updatePalomaBlanca().catch(e => {
  console.error(e);
  process.exit(1);
});
