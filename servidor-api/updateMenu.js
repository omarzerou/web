const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const products = await prisma.product.findMany();
  const saucesSection = { id: 'sauces', title: '¿Qué salsas quieres?', type: 'pill', max: 3, options: [{id:'s_yog',label:'Yogurt',price:0},{id:'s_may',label:'Mayonesa',price:0},{id:'s_ket',label:'Ketchup',price:0},{id:'s_gau',label:'Gaucha',price:0},{id:'s_ali',label:'Alioli',price:0},{id:'s_pic',label:'Picante',price:0},{id:'s_bar',label:'Barbacoa',price:0},{id:'s_mos',label:'Mostaza',price:0},{id:'s_and',label:'Andaluza',price:0}] };
  const veggiesSection = { id: 'veggies', title: 'Elige tus vegetales', type: 'pill', max: 7, options: [{id:'v_lec',label:'Lechuga',price:0},{id:'v_tom',label:'Tomate',price:0},{id:'v_ceb',label:'Cebolla',price:0},{id:'v_ace',label:'Aceitunas',price:0},{id:'v_pep',label:'Pepinillo',price:0},{id:'v_mai',label:'Maíz',price:0},{id:'v_zan',label:'Zanahoria',price:0}] };

  for (const p of products) {
    let updated = false;
    let data = { ...p };
    const name = p.name.toLowerCase();
    const cat = (p.category || '').toLowerCase();

    // Main dishes
    if (name.includes('hamburguesa') || name.includes('campero') || name.includes('pita') || name.includes('media luna') || name.includes('kebab') || name.includes('shawarma') || name.includes('chawarma') || cat.includes('kebab') || cat.includes('shawarma')) {
      data.sectionsData = JSON.stringify([veggiesSection, saucesSection]);
      updated = true;
      if (name.includes('pollo')) { data.imageUrl = 'https://images.unsplash.com/photo-1529042410759-befb1204b468?w=600&h=400&fit=crop'; }
      if (name.includes('ternera')) { data.imageUrl = 'https://images.unsplash.com/photo-1561651823-34feb02250e4?w=600&h=400&fit=crop'; }
    }
    
    // Sides
    if (name.includes('patata') || cat === 'entrantes') {
      data.sectionsData = JSON.stringify([saucesSection]);
      updated = true;
    }

    if (updated) {
      await prisma.product.update({ where: { id: p.id }, data: { sectionsData: data.sectionsData, imageUrl: data.imageUrl } });
      console.log('Updated: ' + p.name);
    }
  }
}
main().catch(console.error).finally(()=>prisma.$disconnect());
