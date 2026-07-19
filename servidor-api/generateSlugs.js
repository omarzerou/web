const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const createSlug = (str) => str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

async function main() {
  const restaurants = await prisma.restaurant.findMany();
  
  for (const rest of restaurants) {
    let baseSlug = createSlug(rest.name);
    let slug = baseSlug;
    let counter = 1;
    
    // Ensure uniqueness
    while (true) {
      const existing = await prisma.restaurant.findUnique({ where: { slug } });
      if (!existing || existing.id === rest.id) {
        break;
      }
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    
    await prisma.restaurant.update({
      where: { id: rest.id },
      data: { slug }
    });
    console.log(`Updated restaurant ${rest.id} with slug: ${slug}`);
  }
  
  console.log('All slugs generated successfully.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
