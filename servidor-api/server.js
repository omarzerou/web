require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { PrismaClient } = require('@prisma/client');
const admin = require('firebase-admin');
const { validarTokenFirebase } = require('./controllers/authController');

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
const VALID_RESTAURANT_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'];
const VALID_ORDER_STATUSES = ['PENDING', 'PREPARING', 'ON_THE_WAY', 'DELIVERED', 'CANCELLED'];

// ──────────────────────────────────────────────────────────────
// INICIALIZAR PRISMA
// ──────────────────────────────────────────────────────────────
const prisma = new PrismaClient({
  log: ['error'], // Solo logear errores, no queries (evita filtrar datos en logs)
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
// MIDDLEWARES DE SEGURIDAD
// ──────────────────────────────────────────────────────────────
const app = express();

// 1. Helmet — cabeceras HTTP de seguridad
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// 2. CORS — solo orígenes permitidos
app.use(cors({
  origin: (origin, callback) => {
    // Permitir sin origin (Postman, curl, mobile) o si está en la lista
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS: Origen no permitido'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
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

// 4. Rate Limiting estricto para auth — máximo 10 req/min
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Demasiados intentos de autenticación. Espera 1 minuto.' },
});

// 5. JSON con límite de tamaño — previene ataques de payload masivo
app.use(express.json({ limit: '1mb' }));

// ──────────────────────────────────────────────────────────────
// MIDDLEWARES DE AUTORIZACIÓN
// ──────────────────────────────────────────────────────────────

// Solo el SuperAdmin puede acceder
const soloSuperAdmin = async (req, res, next) => {
  const user = await prisma.user.findUnique({ where: { email: req.usuario.email } });
  if (!user || user.role !== 'ADMIN' || !SUPERADMIN_EMAILS.includes(user.email)) {
    return res.status(403).json({ error: 'Acceso denegado: Solo el SuperAdmin puede realizar esta acción' });
  }
  req.dbUser = user;
  next();
};

// Solo cualquier usuario con rol ADMIN (SuperAdmin)
const soloAdmin = async (req, res, next) => {
  const user = await prisma.user.findUnique({ where: { email: req.usuario.email } });
  if (!user || user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  req.dbUser = user;
  next();
};

// Solo dueños de restaurante o SuperAdmin impersonando
const soloRestaurantOwner = async (req, res, next) => {
  const user = await prisma.user.findUnique({ where: { email: req.usuario.email } });
  if (!user || (user.role !== 'RESTAURANT_OWNER' && user.role !== 'ADMIN')) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  req.dbUser = user;

  const impersonateId = req.headers['x-impersonate-restaurant'];
  if (impersonateId && user.role === 'ADMIN') {
    const targetRestaurant = await prisma.restaurant.findUnique({ where: { id: impersonateId } });
    if (targetRestaurant) {
      // Engañamos a las rutas para que piensen que el usuario autenticado es el dueño real
      req.dbUser.id = targetRestaurant.ownerId;
    }
  }

  next();
};

// Cualquier usuario autenticado (que exista en DB)
const usuarioAutenticado = async (req, res, next) => {
  const user = await prisma.user.findUnique({ where: { email: req.usuario.email } });
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  req.dbUser = user;
  next();
};

// Helper para sanitizar strings
const sanitize = (str) => {
  if (typeof str !== 'string') return str;
  return str.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').substring(0, 2000);
};

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
// RUTAS PÚBLICAS
// ──────────────────────────────────────────────────────────────

// Health check
app.get('/api/health', (req, res) => res.json({ ok: true, version: '2.0' }));

// Restaurantes aprobados (público)
app.get('/api/restaurants', async (req, res) => {
  try {
    const restaurants = await prisma.restaurant.findMany({
      where: { status: 'APPROVED' },
      include: { products: true }
    });
    res.json(restaurants);
  } catch (error) {
    console.error('[/api/restaurants]', error.message);
    res.status(500).json({ error: 'Error obteniendo restaurantes' });
  }
});

// ──────────────────────────────────────────────────────────────
// RUTAS DE AUTENTICACIÓN (con rate limiter estricto)
// ──────────────────────────────────────────────────────────────

// Sincronizar usuario cliente
app.post('/api/auth/sync', authLimiter, validarTokenFirebase, async (req, res) => {
  const email = req.usuario.email;
  const name = sanitize(req.body.name) || email.split('@')[0];
  const phone = sanitize(req.body.phone) || null;
  const address = sanitize(req.body.address) || null;
  try {
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({ data: { email, name, role: 'CLIENT', phone, address } });
    } else {
      user = await prisma.user.update({ where: { email }, data: { phone, address } });
    }
    // NUNCA devolver info sensible de otros usuarios
    res.json({ id: user.id, email: user.email, name: user.name, role: user.role, phone: user.phone, address: user.address });
  } catch (error) {
    console.error('[auth/sync]', error.message);
    res.status(500).json({ error: 'Error de sincronización' });
  }
});

// Sincronizar dueño de restaurante
app.post('/api/auth/sync-restaurant', authLimiter, validarTokenFirebase, async (req, res) => {
  const email = req.usuario.email;
  const userName = sanitize(req.body.userName) || email.split('@')[0];
  const restaurantName = sanitize(req.body.restaurantName);
  const restaurantAddress = sanitize(req.body.restaurantAddress);
  const subscriptionPlan = req.body.subscriptionPlan || 'MONTHLY';
  const paymentConfigured = Boolean(req.body.paymentConfigured);

  if (!restaurantName || !restaurantAddress) {
    return res.status(400).json({ error: 'Nombre y dirección del restaurante son obligatorios' });
  }
  if (restaurantName.length < 2 || restaurantName.length > 100) {
    return res.status(400).json({ error: 'El nombre del restaurante debe tener entre 2 y 100 caracteres' });
  }

  try {
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({ data: { email, name: userName, role: 'RESTAURANT_OWNER' } });
    } else {
      user = await prisma.user.update({ where: { email }, data: { role: 'RESTAURANT_OWNER' } });
    }

    const restaurant = await prisma.restaurant.create({
      data: {
        name: restaurantName,
        address: restaurantAddress,
        ownerId: user.id,
        status: 'PENDING',
        subscriptionPlan,
        paymentConfigured,
        products: {
          create: [
            { name: "Hamburguesa Clásica", description: "Carne de res, queso, lechuga y tomate", price: 8.50, imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800" },
            { name: "Patatas Fritas", description: "Patatas doradas y crujientes", price: 3.50, imageUrl: "https://images.unsplash.com/photo-1576107232684-1279f390859f?w=800" },
            { name: "Refresco de Cola", description: "Bebida refrescante", price: 2.00, imageUrl: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=800" }
          ]
        }
      }
    });

    res.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      restaurant: { id: restaurant.id, name: restaurant.name, status: restaurant.status }
    });
  } catch (error) {
    console.error('[auth/sync-restaurant]', error.message);
    res.status(500).json({ error: 'Error al registrar el restaurante' });
  }
});

// Perfil de usuario
app.get('/api/auth/profile', validarTokenFirebase, usuarioAutenticado, async (req, res) => {
  const user = req.dbUser;
  res.json({ id: user.id, email: user.email, name: user.name, phone: user.phone, address: user.address, role: user.role });
});

// Actualizar perfil (solo teléfono y dirección, nunca el rol)
app.put('/api/auth/profile', validarTokenFirebase, usuarioAutenticado, async (req, res) => {
  const phone = sanitize(req.body.phone);
  const address = sanitize(req.body.address);
  // Validar longitudes
  if (phone && phone.length > 20) return res.status(400).json({ error: 'Teléfono inválido' });
  if (address && address.length > 200) return res.status(400).json({ error: 'Dirección demasiado larga' });
  try {
    const user = await prisma.user.update({
      where: { email: req.usuario.email },
      data: { phone: phone || null, address: address || null }
    });
    res.json({ id: user.id, email: user.email, name: user.name, phone: user.phone, address: user.address });
  } catch (error) {
    console.error('[auth/profile PUT]', error.message);
    res.status(500).json({ error: 'Error actualizando perfil' });
  }
});

// ──────────────────────────────────────────────────────────────
// RUTAS DE PEDIDOS (Clientes)
// ──────────────────────────────────────────────────────────────

// Crear pedido
app.post('/api/orders', validarTokenFirebase, usuarioAutenticado, async (req, res) => {
  const { restaurantId, paymentMethod, deliveryAddress, totalAmount, items } = req.body;

  // Validación básica
  if (!restaurantId || !paymentMethod || !deliveryAddress || !totalAmount || !items?.length) {
    return res.status(400).json({ error: 'Faltan campos obligatorios en el pedido' });
  }
  if (!['CASH', 'DATAPHONE'].includes(paymentMethod)) {
    return res.status(400).json({ error: 'Método de pago inválido' });
  }
  if (typeof totalAmount !== 'number' || totalAmount <= 0 || totalAmount > 9999) {
    return res.status(400).json({ error: 'Importe inválido' });
  }
  if (!Array.isArray(items) || items.length > 50) {
    return res.status(400).json({ error: 'Lista de artículos inválida' });
  }

  try {
    // Verificar que el restaurante existe y está aprobado
    const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
    if (!restaurant || restaurant.status !== 'APPROVED') {
      return res.status(400).json({ error: 'Restaurante no disponible' });
    }

    const order = await prisma.order.create({
      data: {
        clientId: req.dbUser.id,
        restaurantId,
        paymentMethod,
        deliveryAddress: sanitize(deliveryAddress),
        totalAmount,
        items: {
          create: items.map(item => ({
            productId: item.productId,
            quantity: Math.max(1, Math.min(99, parseInt(item.quantity) || 1)),
            price: parseFloat(item.price),
            options: item.options ? JSON.stringify(item.options).substring(0, 500) : null
          }))
        }
      }
    });
    res.status(201).json({ id: order.id, status: order.status, totalAmount: order.totalAmount });
  } catch (error) {
    console.error('[orders POST]', error.message);
    res.status(500).json({ error: 'Error creando pedido' });
  }
});

// Mis pedidos
app.get('/api/orders/me', validarTokenFirebase, usuarioAutenticado, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { clientId: req.dbUser.id },
      include: { restaurant: { select: { id: true, name: true, imageUrl: true } }, items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50 // límite
    });
    res.json(orders);
  } catch (error) {
    console.error('[orders/me]', error.message);
    res.status(500).json({ error: 'Error obteniendo pedidos' });
  }
});

// ──────────────────────────────────────────────────────────────
// RUTAS DE RESTAURANT ADMIN (dueños de restaurante)
// ──────────────────────────────────────────────────────────────

// Estadísticas propias
app.get('/api/restaurant-admin/stats', validarTokenFirebase, soloRestaurantOwner, async (req, res) => {
  try {
    const restaurant = await prisma.restaurant.findFirst({ where: { ownerId: req.dbUser.id } });
    if (!restaurant) return res.status(404).json({ error: 'No tienes restaurante asignado' });

    const [totalOrders, revenueObj, customers] = await Promise.all([
      prisma.order.count({ where: { restaurantId: restaurant.id } }),
      prisma.order.aggregate({ _sum: { totalAmount: true }, where: { restaurantId: restaurant.id, status: 'DELIVERED' } }),
      prisma.order.findMany({ where: { restaurantId: restaurant.id }, select: { clientId: true }, distinct: ['clientId'] }),
    ]);

    res.json({
      restaurant: { id: restaurant.id, name: restaurant.name, address: restaurant.address, imageUrl: restaurant.imageUrl, status: restaurant.status, subscriptionPlan: restaurant.subscriptionPlan, paymentConfigured: restaurant.paymentConfigured },
      orders: totalOrders,
      revenue: revenueObj._sum.totalAmount || 0,
      customers: customers.length
    });
  } catch (error) {
    console.error('[restaurant-admin/stats]', error.message);
    res.status(500).json({ error: 'Error obteniendo estadísticas' });
  }
});

// Configurar pago (Simulación)
app.post('/api/restaurant-admin/payment', validarTokenFirebase, soloRestaurantOwner, async (req, res) => {
  try {
    const restaurant = await prisma.restaurant.updateMany({
      where: { ownerId: req.dbUser.id },
      data: { paymentConfigured: true }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('[restaurant-admin/payment]', error.message);
    res.status(500).json({ error: 'Error configurando pago' });
  }
});

// Pedidos propios
app.get('/api/restaurant-admin/orders', validarTokenFirebase, soloRestaurantOwner, async (req, res) => {
  try {
    const restaurant = await prisma.restaurant.findFirst({ where: { ownerId: req.dbUser.id } });
    if (!restaurant) return res.status(404).json({ error: 'Sin restaurante asignado' });

    const orders = await prisma.order.findMany({
      where: { restaurantId: restaurant.id },
      include: { client: { select: { id: true, name: true, email: true } }, items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    res.json(orders);
  } catch (error) {
    console.error('[restaurant-admin/orders]', error.message);
    res.status(500).json({ error: 'Error obteniendo pedidos' });
  }
});

// Productos propios
app.get('/api/restaurant-admin/products', validarTokenFirebase, soloRestaurantOwner, async (req, res) => {
  try {
    const restaurant = await prisma.restaurant.findFirst({ where: { ownerId: req.dbUser.id } });
    if (!restaurant) return res.status(404).json({ error: 'Sin restaurante' });

    const products = await prisma.product.findMany({
      where: { restaurantId: restaurant.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json(products);
  } catch (error) {
    console.error('[restaurant-admin/products]', error.message);
    res.status(500).json({ error: 'Error' });
  }
});

// Añadir producto (solo si el restaurante está APPROVED)
app.post('/api/products', validarTokenFirebase, soloRestaurantOwner, async (req, res) => {
  const name = sanitize(req.body.name);
  const description = sanitize(req.body.description);
  const imageUrl = sanitize(req.body.imageUrl);
  const price = parseFloat(req.body.price);
  const category = sanitize(req.body.category);
  const isOutofStock = Boolean(req.body.isOutofStock);
  const isFeatured = Boolean(req.body.isFeatured);

  if (!name || name.length < 2) return res.status(400).json({ error: 'Nombre del producto obligatorio' });
  if (isNaN(price) || price <= 0 || price > 9999) return res.status(400).json({ error: 'Precio inválido' });

  try {
    const restaurant = await prisma.restaurant.findFirst({ where: { ownerId: req.dbUser.id } });
    if (!restaurant || restaurant.status !== 'APPROVED') {
      return res.status(403).json({ error: 'Restaurante no aprobado' });
    }

    const product = await prisma.product.create({
      data: { name, description, price, imageUrl, category, isOutofStock, isFeatured, restaurantId: restaurant.id }
    });
    res.json(product);
  } catch (error) {
    console.error('[products POST]', error.message);
    res.status(500).json({ error: 'Error añadiendo producto' });
  }
});

// Actualizar producto
app.put('/api/products/:id', validarTokenFirebase, soloRestaurantOwner, async (req, res) => {
  const { id } = req.params;
  const { name, description, imageUrl, price, category, isOutofStock, isFeatured } = req.body;
  if (!/^[a-zA-Z0-9-]+$/.test(id)) return res.status(400).json({ error: 'ID inválido' });
  
  try {
    const product = await prisma.product.findUnique({ where: { id }, include: { restaurant: true } });
    if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
    if (product.restaurant.ownerId !== req.dbUser.id) return res.status(403).json({ error: 'Sin permiso' });

    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: sanitize(name) }),
        ...(description !== undefined && { description: sanitize(description) }),
        ...(imageUrl !== undefined && { imageUrl: sanitize(imageUrl) }),
        ...(price !== undefined && { price: parseFloat(price) }),
        ...(category !== undefined && { category: sanitize(category) }),
        ...(isOutofStock !== undefined && { isOutofStock: Boolean(isOutofStock) }),
        ...(isFeatured !== undefined && { isFeatured: Boolean(isFeatured) }),
      }
    });
    res.json(updated);
  } catch (error) {
    console.error('[products PUT]', error.message);
    res.status(500).json({ error: 'Error actualizando producto' });
  }
});

// Eliminar producto
app.delete('/api/products/:id', validarTokenFirebase, usuarioAutenticado, async (req, res) => {
  const { id } = req.params;
  if (!/^[a-zA-Z0-9-]+$/.test(id)) return res.status(400).json({ error: 'ID inválido' });

  try {
    const product = await prisma.product.findUnique({ where: { id }, include: { restaurant: true } });
    if (!product) return res.status(404).json({ error: 'Producto no encontrado' });

    const isOwner = product.restaurant.ownerId === req.dbUser.id;
    const isSuperAdmin = req.dbUser.role === 'ADMIN' && req.dbUser.email === SUPERADMIN_EMAIL;
    if (!isOwner && !isSuperAdmin) return res.status(403).json({ error: 'Sin permiso' });

    await prisma.product.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('[products DELETE]', error.message);
    res.status(500).json({ error: 'Error eliminando producto' });
  }
});

// Actualizar estado de pedido (solo el dueño del restaurante correspondiente)
app.put('/api/orders/:id/status', validarTokenFirebase, soloRestaurantOwner, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!/^[a-zA-Z0-9-]+$/.test(id)) return res.status(400).json({ error: 'ID inválido' });
  if (!VALID_ORDER_STATUSES.includes(status)) return res.status(400).json({ error: 'Estado inválido' });

  try {
    const order = await prisma.order.findUnique({ where: { id }, include: { restaurant: true } });
    if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });
    if (order.restaurant.ownerId !== req.dbUser.id) return res.status(403).json({ error: 'Sin permiso' });

    const updated = await prisma.order.update({ where: { id }, data: { status } });
    res.json({ id: updated.id, status: updated.status });
  } catch (error) {
    console.error('[orders/:id/status]', error.message);
    res.status(500).json({ error: 'Error actualizando pedido' });
  }
});

// ──────────────────────────────────────────────────────────────
// RUTAS DE SUPERADMIN (SOLO poleljesus@gmail.com)
// ──────────────────────────────────────────────────────────────

// Estadísticas globales
app.get('/api/superadmin/stats', validarTokenFirebase, soloSuperAdmin, async (req, res) => {
  try {
    const [totalUsers, totalRestaurants, totalOrders, revenueObj] = await Promise.all([
      prisma.user.count(),
      prisma.restaurant.count(),
      prisma.order.count(),
      prisma.order.aggregate({ _sum: { totalAmount: true }, where: { status: 'DELIVERED' } }),
    ]);
    res.json({ users: totalUsers, restaurants: totalRestaurants, orders: totalOrders, revenue: revenueObj._sum.totalAmount || 0 });
  } catch (error) {
    console.error('[superadmin/stats]', error.message);
    res.status(500).json({ error: 'Error' });
  }
});

// Todos los restaurantes
app.get('/api/admin/restaurants', validarTokenFirebase, soloSuperAdmin, async (req, res) => {
  try {
    const restaurants = await prisma.restaurant.findMany({
      include: { owner: { select: { id: true, name: true, email: true, role: true, phone: true, address: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(restaurants);
  } catch (error) {
    console.error('[admin/restaurants]', error.message);
    res.status(500).json({ error: 'Error' });
  }
});

// Aprobar/Rechazar restaurante
app.put('/api/admin/restaurants/:id/status', validarTokenFirebase, soloSuperAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!/^[a-zA-Z0-9-]+$/.test(id)) return res.status(400).json({ error: 'ID inválido' });
  if (!VALID_RESTAURANT_STATUSES.includes(status)) return res.status(400).json({ error: 'Estado inválido' });

  try {
    const restaurant = await prisma.restaurant.update({ where: { id }, data: { status } });
    res.json({ id: restaurant.id, status: restaurant.status });
  } catch (error) {
    console.error('[admin/restaurants status]', error.message);
    res.status(500).json({ error: 'Error actualizando restaurante' });
  }
});

// Cambiar suscripción del restaurante (SuperAdmin)
app.put('/api/admin/restaurants/:id/subscription', validarTokenFirebase, soloSuperAdmin, async (req, res) => {
  const { id } = req.params;
  const { subscriptionPlan } = req.body;
  if (!/^[a-zA-Z0-9-]+$/.test(id)) return res.status(400).json({ error: 'ID inválido' });

  try {
    const restaurant = await prisma.restaurant.update({ where: { id }, data: { subscriptionPlan } });
    res.json({ id: restaurant.id, subscriptionPlan: restaurant.subscriptionPlan });
  } catch (error) {
    console.error('[admin/restaurants subscription]', error.message);
    res.status(500).json({ error: 'Error actualizando suscripción' });
  }
});

// Chat de restaurante (SuperAdmin)
app.get('/api/admin/restaurants/:id/chat', validarTokenFirebase, soloSuperAdmin, async (req, res) => {
  const { id } = req.params;
  if (!/^[a-zA-Z0-9-]+$/.test(id)) return res.status(400).json({ error: 'ID inválido' });

  try {
    const messages = await prisma.chatMessage.findMany({
      where: { restaurantId: id },
      orderBy: { createdAt: 'asc' }
    });
    res.json(messages);
  } catch (error) {
    console.error('[admin/restaurants/chat GET]', error.message);
    res.status(500).json({ error: 'Error cargando chat' });
  }
});

app.post('/api/admin/restaurants/:id/chat', validarTokenFirebase, soloSuperAdmin, async (req, res) => {
  const { id } = req.params;
  const content = sanitize(req.body.content);
  if (!/^[a-zA-Z0-9-]+$/.test(id)) return res.status(400).json({ error: 'ID inválido' });
  if (!content || content.length === 0) return res.status(400).json({ error: 'Mensaje vacío' });
  if (content.length > 1000) return res.status(400).json({ error: 'Mensaje demasiado largo' });

  try {
    const message = await prisma.chatMessage.create({
      data: {
        restaurantId: id,
        senderRole: 'ADMIN',
        senderName: req.dbUser.name || 'Soporte Tastio',
        content: content
      }
    });
    res.status(201).json(message);
  } catch (error) {
    console.error('[admin/restaurants/chat POST]', error.message);
    res.status(500).json({ error: 'Error enviando mensaje' });
  }
});

// Todos los pedidos globales
app.get('/api/superadmin/orders', validarTokenFirebase, soloSuperAdmin, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        client: { select: { id: true, name: true, email: true } },
        restaurant: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 200
    });
    res.json(orders);
  } catch (error) {
    console.error('[superadmin/orders]', error.message);
    res.status(500).json({ error: 'Error' });
  }
});

// Todos los clientes
app.get('/api/superadmin/customers', validarTokenFirebase, soloSuperAdmin, async (req, res) => {
  try {
    const customers = await prisma.user.findMany({
      where: { role: 'CLIENT' },
      select: { id: true, name: true, email: true, createdAt: true }
    });
    const customerStats = await Promise.all(customers.map(async (c) => {
      const spentObj = await prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { clientId: c.id, status: 'DELIVERED' }
      });
      return { ...c, spent: spentObj._sum.totalAmount || 0 };
    }));
    res.json(customerStats);
  } catch (error) {
    console.error('[superadmin/customers]', error.message);
    res.status(500).json({ error: 'Error' });
  }
});

// Productos de un restaurante
app.get('/api/superadmin/restaurants/:id/products', validarTokenFirebase, soloSuperAdmin, async (req, res) => {
  const { id } = req.params;
  if (!/^[a-zA-Z0-9-]+$/.test(id)) return res.status(400).json({ error: 'ID inválido' });
  try {
    const products = await prisma.product.findMany({ where: { restaurantId: id }, orderBy: { createdAt: 'desc' } });
    res.json(products);
  } catch (error) {
    console.error('[superadmin restaurants products]', error.message);
    res.status(500).json({ error: 'Error' });
  }
});

// Crear producto en restaurante (superadmin)
app.post('/api/superadmin/restaurants/:id/products', validarTokenFirebase, soloSuperAdmin, async (req, res) => {
  const { id } = req.params;
  if (!/^[a-zA-Z0-9-]+$/.test(id)) return res.status(400).json({ error: 'ID inválido' });
  const name = sanitize(req.body.name);
  const description = sanitize(req.body.description);
  const imageUrl = sanitize(req.body.imageUrl);
  const price = parseFloat(req.body.price);
  if (!name || name.length < 2) return res.status(400).json({ error: 'Nombre obligatorio' });
  if (isNaN(price) || price <= 0) return res.status(400).json({ error: 'Precio inválido' });
  try {
    const product = await prisma.product.create({ data: { name, description, price, imageUrl, restaurantId: id } });
    res.json(product);
  } catch (error) {
    console.error('[superadmin create product]', error.message);
    res.status(500).json({ error: 'Error creando producto' });
  }
});

// Pedidos de un restaurante (superadmin)
app.get('/api/superadmin/restaurants/:id/orders', validarTokenFirebase, soloSuperAdmin, async (req, res) => {
  const { id } = req.params;
  if (!/^[a-zA-Z0-9-]+$/.test(id)) return res.status(400).json({ error: 'ID inválido' });
  try {
    const orders = await prisma.order.findMany({
      where: { restaurantId: id },
      include: { client: { select: { id: true, name: true, email: true } }, items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    res.json(orders);
  } catch (error) {
    console.error('[superadmin restaurant orders]', error.message);
    res.status(500).json({ error: 'Error' });
  }
});

// ✅ NUEVO: Cambiar rol de un usuario (suspender / degradar a CLIENT)
app.put('/api/superadmin/users/:id/role', validarTokenFirebase, soloSuperAdmin, async (req, res) => {
  const { id } = req.params;
  const { role, reason } = req.body;
  if (!/^[a-zA-Z0-9-]+$/.test(id)) return res.status(400).json({ error: 'ID inválido' });
  if (!['CLIENT', 'RESTAURANT_OWNER', 'ADMIN'].includes(role)) return res.status(400).json({ error: 'Rol inválido' });

  // Proteger al propio SuperAdmin de modificarse a sí mismo
  if (id === req.dbUser.id) return res.status(400).json({ error: 'No puedes modificar tu propio rol' });

  try {
    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (targetUser.email === SUPERADMIN_EMAIL) return res.status(400).json({ error: 'No se puede modificar al SuperAdmin' });

    const updated = await prisma.user.update({ where: { id }, data: { role } });
    console.log(`🔐 [SUPERADMIN] Rol de ${targetUser.email} cambiado a ${role}. Razón: ${sanitize(reason) || 'sin especificar'}`);
    res.json({ id: updated.id, email: updated.email, role: updated.role });
  } catch (error) {
    console.error('[superadmin users role]', error.message);
    res.status(500).json({ error: 'Error cambiando rol' });
  }
});

// ──────────────────────────────────────────────────────────────
// DATOS REALES PARA GRÁFICAS
// ──────────────────────────────────────────────────────────────

// Pedidos por día de la semana (últimos 7 días) — para gráfica del admin
app.get('/api/restaurant-admin/chart-data', validarTokenFirebase, soloRestaurantOwner, async (req, res) => {
  try {
    const restaurant = await prisma.restaurant.findFirst({ where: { ownerId: req.dbUser.id } });
    if (!restaurant) return res.status(404).json({ error: 'Sin restaurante' });

    // Últimos 7 días
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const start = new Date(date.setHours(0, 0, 0, 0));
      const end = new Date(date.setHours(23, 59, 59, 999));
      const count = await prisma.order.count({
        where: { restaurantId: restaurant.id, createdAt: { gte: start, lte: end } }
      });
      const revenue = await prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { restaurantId: restaurant.id, status: 'DELIVERED', createdAt: { gte: start, lte: end } }
      });
      result.push({
        name: days[start.getDay()],
        pedidos: count,
        ingresos: revenue._sum.totalAmount || 0
      });
    }
    res.json(result);
  } catch (error) {
    console.error('[chart-data]', error.message);
    res.status(500).json({ error: 'Error obteniendo datos de gráfica' });
  }
});

// Pedidos por día — para gráfica del superadmin
app.get('/api/superadmin/chart-data', validarTokenFirebase, soloSuperAdmin, async (req, res) => {
  try {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const start = new Date(date.setHours(0, 0, 0, 0));
      const end = new Date(date.setHours(23, 59, 59, 999));
      const count = await prisma.order.count({ where: { createdAt: { gte: start, lte: end } } });
      const revenue = await prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { status: 'DELIVERED', createdAt: { gte: start, lte: end } }
      });
      result.push({ name: days[start.getDay()], pedidos: count, ingresos: revenue._sum.totalAmount || 0 });
    }
    res.json(result);
  } catch (error) {
    console.error('[superadmin chart-data]', error.message);
    res.status(500).json({ error: 'Error' });
  }
});

// ──────────────────────────────────────────────────────────────
// ACTUALIZAR PERFIL DEL RESTAURANTE (imagen, descripción)
// ──────────────────────────────────────────────────────────────

app.put('/api/restaurant-admin/profile', validarTokenFirebase, soloRestaurantOwner, async (req, res) => {
  const description = sanitize(req.body.description);
  const imageUrl = req.body.imageUrl; // base64 o URL

  if (description && description.length > 500) return res.status(400).json({ error: 'Descripción demasiado larga' });
  // Limitar tamaño de base64 (~2MB en base64 ≈ 2.7MB texto)
  if (imageUrl && imageUrl.length > 3 * 1024 * 1024) {
    return res.status(400).json({ error: 'La imagen es demasiado grande. Máximo 2MB.' });
  }

  try {
    const restaurant = await prisma.restaurant.findFirst({ where: { ownerId: req.dbUser.id } });
    if (!restaurant) return res.status(404).json({ error: 'Sin restaurante' });

    const updated = await prisma.restaurant.update({
      where: { id: restaurant.id },
      data: {
        ...(description !== undefined && { description }),
        ...(imageUrl !== undefined && { imageUrl })
      }
    });
    res.json({ id: updated.id, name: updated.name, description: updated.description, imageUrl: updated.imageUrl, status: updated.status });
  } catch (error) {
    console.error('[restaurant profile update]', error.message);
    res.status(500).json({ error: 'Error actualizando perfil del restaurante' });
  }
});

// Actualizar ajustes locales del restaurante
app.put('/api/restaurant-admin/settings', validarTokenFirebase, soloRestaurantOwner, async (req, res) => {
  const { operatingHours, deliveryFee, minOrder, coverageRadius, bufferTime } = req.body;
  try {
    const restaurant = await prisma.restaurant.findFirst({ where: { ownerId: req.dbUser.id } });
    if (!restaurant) return res.status(404).json({ error: 'Sin restaurante' });

    const updated = await prisma.restaurant.update({
      where: { id: restaurant.id },
      data: {
        ...(operatingHours !== undefined && { operatingHours }),
        ...(deliveryFee !== undefined && { deliveryFee: parseFloat(deliveryFee) }),
        ...(minOrder !== undefined && { minOrder: parseFloat(minOrder) }),
        ...(coverageRadius !== undefined && { coverageRadius: parseFloat(coverageRadius) }),
        ...(bufferTime !== undefined && { bufferTime: parseInt(bufferTime) }),
      }
    });
    res.json(updated);
  } catch (error) {
    console.error('[restaurant settings update]', error.message);
    res.status(500).json({ error: 'Error actualizando ajustes del restaurante' });
  }
});

// ──────────────────────────────────────────────────────────────
// CHAT (Restaurante ↔ SuperAdmin)
// ──────────────────────────────────────────────────────────────

// Obtener mensajes del restaurante propio
app.get('/api/chat/messages', validarTokenFirebase, soloRestaurantOwner, async (req, res) => {
  try {
    const restaurant = await prisma.restaurant.findFirst({ where: { ownerId: req.dbUser.id } });
    if (!restaurant) return res.status(404).json({ error: 'Sin restaurante' });

    const messages = await prisma.chatMessage.findMany({
      where: { restaurantId: restaurant.id },
      orderBy: { createdAt: 'asc' },
      take: 100
    });
    res.json(messages);
  } catch (error) {
    console.error('[chat/messages]', error.message);
    res.status(500).json({ error: 'Error' });
  }
});

// Enviar mensaje (restaurante owner)
app.post('/api/chat/messages', validarTokenFirebase, soloRestaurantOwner, async (req, res) => {
  const content = sanitize(req.body.content);
  if (!content || content.length === 0) return res.status(400).json({ error: 'Mensaje vacío' });
  if (content.length > 1000) return res.status(400).json({ error: 'Mensaje demasiado largo' });

  try {
    const restaurant = await prisma.restaurant.findFirst({ where: { ownerId: req.dbUser.id } });
    if (!restaurant) return res.status(404).json({ error: 'Sin restaurante' });

    const message = await prisma.chatMessage.create({
      data: {
        restaurantId: restaurant.id,
        senderRole: 'RESTAURANT_OWNER',
        senderName: req.dbUser.name || req.dbUser.email,
        content
      }
    });
    res.json(message);
  } catch (error) {
    console.error('[chat/messages POST]', error.message);
    res.status(500).json({ error: 'Error enviando mensaje' });
  }
});

// Obtener todos los chats (SuperAdmin)
app.get('/api/superadmin/chats', validarTokenFirebase, soloSuperAdmin, async (req, res) => {
  try {
    // Lista de restaurantes con su último mensaje
    const restaurants = await prisma.restaurant.findMany({
      include: {
        chatMessages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        owner: { select: { id: true, name: true, email: true } }
      }
    });
    res.json(restaurants.map(r => ({
      id: r.id, name: r.name, status: r.status, imageUrl: r.imageUrl,
      owner: r.owner,
      lastMessage: r.chatMessages[0] || null,
      unread: r.chatMessages.filter(m => m.senderRole === 'RESTAURANT_OWNER').length > 0 ? 1 : 0
    })));
  } catch (error) {
    console.error('[superadmin chats]', error.message);
    res.status(500).json({ error: 'Error' });
  }
});

// Obtener mensajes de un restaurante (SuperAdmin)
app.get('/api/superadmin/chats/:restaurantId', validarTokenFirebase, soloSuperAdmin, async (req, res) => {
  const { restaurantId } = req.params;
  if (!/^[a-zA-Z0-9-]+$/.test(restaurantId)) return res.status(400).json({ error: 'ID inválido' });
  try {
    const messages = await prisma.chatMessage.findMany({
      where: { restaurantId },
      orderBy: { createdAt: 'asc' },
      take: 200
    });
    res.json(messages);
  } catch (error) {
    console.error('[superadmin chat messages]', error.message);
    res.status(500).json({ error: 'Error' });
  }
});

// Enviar mensaje como SuperAdmin a un restaurante
app.post('/api/superadmin/chats/:restaurantId', validarTokenFirebase, soloSuperAdmin, async (req, res) => {
  const { restaurantId } = req.params;
  const content = sanitize(req.body.content);
  if (!/^[a-zA-Z0-9-]+$/.test(restaurantId)) return res.status(400).json({ error: 'ID inválido' });
  if (!content || content.length === 0) return res.status(400).json({ error: 'Mensaje vacío' });
  if (content.length > 1000) return res.status(400).json({ error: 'Mensaje demasiado largo' });

  try {
    const message = await prisma.chatMessage.create({
      data: {
        restaurantId,
        senderRole: 'ADMIN',
        senderName: 'SuperAdmin',
        content
      }
    });
    res.json(message);
  } catch (error) {
    console.error('[superadmin chat POST]', error.message);
    res.status(500).json({ error: 'Error' });
  }
});

// Configuración de la plataforma
app.get('/api/superadmin/settings', validarTokenFirebase, soloSuperAdmin, async (req, res) => {
  try {
    let config = await prisma.platformConfig.findFirst();
    if (!config) {
      config = await prisma.platformConfig.create({ data: {} });
    }
    res.json(config);
  } catch (error) {
    console.error('[superadmin settings GET]', error.message);
    res.status(500).json({ error: 'Error obteniendo configuración' });
  }
});

app.put('/api/superadmin/settings', validarTokenFirebase, soloSuperAdmin, async (req, res) => {
  try {
    let config = await prisma.platformConfig.findFirst();
    const { platformName, supportEmail, supportPhone, paymentGatewayKeys, currency, language, emailNotifications, pushNotifications } = req.body;
    
    const data = {
      ...(platformName !== undefined && { platformName: sanitize(platformName) }),
      ...(supportEmail !== undefined && { supportEmail: sanitize(supportEmail) }),
      ...(supportPhone !== undefined && { supportPhone: sanitize(supportPhone) }),
      ...(paymentGatewayKeys !== undefined && { paymentGatewayKeys }),
      ...(currency !== undefined && { currency: sanitize(currency) }),
      ...(language !== undefined && { language: sanitize(language) }),
      ...(emailNotifications !== undefined && { emailNotifications: Boolean(emailNotifications) }),
      ...(pushNotifications !== undefined && { pushNotifications: Boolean(pushNotifications) }),
    };

    if (!config) {
      config = await prisma.platformConfig.create({ data });
    } else {
      config = await prisma.platformConfig.update({ where: { id: config.id }, data });
    }
    res.json(config);
  } catch (error) {
    console.error('[superadmin settings PUT]', error.message);
    res.status(500).json({ error: 'Error actualizando configuración' });
  }
});

// ──────────────────────────────────────────────────────────────
// MANEJO DE ERRORES GLOBAL
// ──────────────────────────────────────────────────────────────

// Ruta no encontrada
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Errores globales (no revelar detalles internos en producción)
app.use((err, req, res, next) => {
  console.error('[ERROR GLOBAL]', err.message);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// ──────────────────────────────────────────────────────────────
// ARRANCAR SERVIDOR
// ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
app.listen(PORT, async () => {
  console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
  console.log(`🔒 SuperAdmin: ${SUPERADMIN_EMAIL}`);
  await prisma.$connect();
  console.log('✅ Prisma conectado a PostgreSQL');
  await seedDatabase();
});
