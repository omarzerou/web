const Database = require('better-sqlite3');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const db = new Database('prisma/dev.db', { readonly: true });

async function migrateData() {
  console.log('Starting migration from SQLite to PostgreSQL...');

  const tables = [
    'User',
    'PlatformConfig',
    'Restaurant',
    'Product',
    'Order',
    'OrderItem',
    'ChatMessage',
    'Review'
  ];

  for (const table of tables) {
    console.log(`Migrating table ${table}...`);
    try {
      const rows = db.prepare(`SELECT * FROM "${table}"`).all();
      
      if (rows.length > 0) {
        // Convert dates if needed. better-sqlite3 returns numbers or strings for dates.
        // Prisma expects Date objects for createMany, but raw query or just mapping might be needed.
        const formattedRows = rows.map(row => {
          const newRow = { ...row };
          if (newRow.createdAt) newRow.createdAt = new Date(newRow.createdAt);
          if (newRow.updatedAt) newRow.updatedAt = new Date(newRow.updatedAt);
          // Boolean fields in SQLite are 0 or 1, Prisma expects boolean.
          if (table === 'Restaurant') {
            newRow.paymentConfigured = Boolean(newRow.paymentConfigured);
          }
          if (table === 'Product') {
            newRow.isOutofStock = Boolean(newRow.isOutofStock);
            newRow.isFeatured = Boolean(newRow.isFeatured);
          }
          if (table === 'PlatformConfig') {
            newRow.emailNotifications = Boolean(newRow.emailNotifications);
            newRow.pushNotifications = Boolean(newRow.pushNotifications);
          }
          return newRow;
        });

        const tableMap = {
          'User': 'user',
          'PlatformConfig': 'platformConfig',
          'Restaurant': 'restaurant',
          'Product': 'product',
          'Order': 'order',
          'OrderItem': 'orderItem',
          'ChatMessage': 'chatMessage',
          'Review': 'review'
        };

        // Insert using Prisma createMany (requires supported fields)
        await prisma[tableMap[table]].createMany({
          data: formattedRows,
          skipDuplicates: true
        });
        console.log(`✅ Inserted ${formattedRows.length} rows into ${table}`);
      } else {
        console.log(`⚠️ No data found in ${table}`);
      }
    } catch (err) {
      console.error(`❌ Error migrating ${table}:`, err.message);
    }
  }

  console.log('Migration completed successfully.');
  await prisma.$disconnect();
  db.close();
}

migrateData().catch(e => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
