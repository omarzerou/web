require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { PrismaClient } = require('@prisma/client');

// ──────────────────────────────────────────────────────────────
// CONFIGURACIÓN DE SEGURIDAD — Solo cambiar aquí
// ──────────────────────────────────────────────────────────────
const SUPERADMIN_EMAILS = ['poleljesus@gmail.com', 'hhhhh@gmail.com'];  // ← SuperAdmins permitidos
const SUPERADMIN_EMAIL = SUPERADMIN_EMAILS[0]; // legacy compat

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  // Añadir aquí dominio de producción cuando sea necesario
];

// ──────────────────────────────────────────────────────────────
// INICIALIZAR PRISMA
// ──────────────────────────────────────────────────────────────
const prisma = new PrismaClient({
  log: ['error'], // Solo logear errores, no queries
});

// ──────────────────────────────────────────────────────────────
// INICIALIZAR FIREBASE ADMIN
// ──────────────────────────────────────────────────────────────
try {
  const { initializeApp, cert, getApps } = require('firebase-admin/app');
  if (getApps().length === 0) {
    const serviceAccount = require('./firebase-service-account.json');
    initializeApp({ credential: cert(serviceAccount) });
    console.log('✅ Firebase Admin inicializado correctamente');
  }
} catch (error) {
  console.log('⚠️ Firebase Admin no pudo inicializarse:', error.message);
}

// ──────────────────────────────────────────────────────────────
// IMPORTAR ROUTERS MODULARES
// ──────────────────────────────────────────────────────────────
const rutasRestaurantes = require('./routes/restaurantes');
const rutasUsuarios = require('./routes/usuarios');
const rutasProductos = require('./routes/productos');
const rutasPedidos = require('./routes/pedidos');
const rutasAuth = require('./routes/auth');
const rutasAdmin = require('./routes/admin');
const rutasSuperAdmin = require('./routes/superadmin');
const rutasChat = require('./routes/chat');
const rutasOtp = require('./routes/otp');

// ──────────────────────────────────────────────────────────────
// APP Y MIDDLEWARES
// ──────────────────────────────────────────────────────────────
const app = express();

// 1. Helmet — cabeceras HTTP de seguridad
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// 2. CORS — solo orígenes permitidos
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS: Origen no permitido'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Restaurant-Id', 'X-Impersonate-Restaurant'],
  credentials: true,
}));

// 3. Rate Limiting global — máximo 100 req/min por IP
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas peticiones, espera un momento.' },
});
app.use(globalLimiter);

// 4. JSON con límite de tamaño — previene ataques de payload masivo (subido a 10mb para fotos)
app.use(express.json({ limit: '10mb' }));

// Health check público
app.get('/api/health', (req, res) => res.json({ ok: true, version: '2.0 (Modularized)' }));

// ──────────────────────────────────────────────────────────────
// REGISTRAR ROUTERS
// ──────────────────────────────────────────────────────────────
app.use('/api/auth', rutasAuth);
app.use('/api/usuarios', rutasUsuarios);

// Alias para compatibilidad hacia atrás
app.use('/api/restaurants', rutasRestaurantes);
app.use('/api/restaurantes', rutasRestaurantes);

app.use('/api/products', rutasProductos);
app.use('/api/productos', rutasProductos);

app.use('/api/orders', rutasPedidos);
app.use('/api/pedidos', rutasPedidos);

app.use('/api/restaurant-admin', rutasAdmin);
app.use('/api/dashboard', rutasAdmin);
app.use('/api/chat', rutasChat);

// Alias para el panel general
app.use('/api/superadmin', rutasSuperAdmin);
app.use('/api/admin', rutasSuperAdmin);
app.use('/api/otp', rutasOtp);

// ──────────────────────────────────────────────────────────────
// MANEJO DE ERRORES GLOBAL
// ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

app.use((err, req, res, next) => {
  console.error('[ERROR GLOBAL]', err.message);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// ──────────────────────────────────────────────────────────────
// SEED DATABASE
// ──────────────────────────────────────────────────────────────
async function seedDatabase() {
  const count = await prisma.restaurant.count();
  if (count === 0) {
    console.log('🍽️ Insertando restaurantes de prueba...');
    const owner = await prisma.user.create({
      data: { email: 'admin@kebab-algeciras.com', name: 'Dueño de Prueba', role: 'ADMIN' }
    });
    await prisma.restaurant.createMany({
      data: [
        { name: 'Kebab Istanbul Algeciras', description: 'El mejor durum de la ciudad', address: 'Calle Ancha 10, Algeciras', imageUrl: 'https://images.unsplash.com/photo-1529148482759-b3c18b14e918?w=800', status: 'APPROVED', ownerId: owner.id },
        { name: 'Pizzería Luigi', description: 'Masa fina a la leña', address: 'Plaza Alta 5, Algeciras', imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800', status: 'APPROVED', ownerId: owner.id },
        { name: 'Burger Kang', description: 'Hamburguesas bestiales', address: 'Paseo Marítimo, Algeciras', imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800', status: 'APPROVED', ownerId: owner.id }
      ]
    });
  }
}

// ──────────────────────────────────────────────────────────────
// ARRANCAR SERVIDOR
// ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
app.listen(PORT, async () => {
  console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
  console.log(`👑 SuperAdmin: ${SUPERADMIN_EMAIL}`);
  await prisma.$connect();
  console.log('🔌 Prisma conectado a PostgreSQL');
  await seedDatabase();
});
