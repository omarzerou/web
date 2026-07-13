const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ log: ['error'] });

const { validarTokenFirebase } = require('../controllers/authController');

const SUPERADMIN_EMAILS = ['poleljesus@gmail.com', 'hhhhh@gmail.com'];  // ← SuperAdmins permitidos
const SUPERADMIN_EMAIL = SUPERADMIN_EMAILS[0]; // legacy compat
const VALID_RESTAURANT_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'];

// Helper para sanitizar strings
const sanitize = (str) => {
  if (typeof str !== 'string') return str;
  return str.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').substring(0, 2000);
};

// Solo el SuperAdmin puede acceder
const soloSuperAdmin = async (req, res, next) => {
  const user = await prisma.user.findUnique({ where: { email: req.usuario.email } });
  if (!user || user.role !== 'ADMIN' || !SUPERADMIN_EMAILS.includes(user.email)) {
    return res.status(403).json({ error: 'Acceso denegado: Solo el SuperAdmin puede realizar esta acción' });
  }
  req.dbUser = user;
  next();
};

// Todas las rutas de este archivo están protegidas por soloSuperAdmin
router.use(validarTokenFirebase);
router.use(soloSuperAdmin);

// Estadísticas globales
router.get('/stats', async (req, res) => {
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
    res.status(500).json({ error: 'Error obteniendo estadísticas' });
  }
});

// Todos los restaurantes
router.get('/restaurants', async (req, res) => {
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
router.put('/restaurants/:id/status', async (req, res) => {
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

// Cambiar suscripción del restaurante
router.put('/restaurants/:id/subscription', async (req, res) => {
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

// Todos los pedidos globales
router.get('/orders', async (req, res) => {
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
router.get('/customers', async (req, res) => {
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
router.get('/restaurants/:id/products', async (req, res) => {
  const { id } = req.params;
  if (!/^[a-zA-Z0-9-]+$/.test(id)) return res.status(400).json({ error: 'ID inválido' });
  try {
    const products = await prisma.product.findMany({ where: { restaurantId: id }, orderBy: { createdAt: 'desc' } });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Error' });
  }
});

// Crear producto en restaurante (superadmin)
router.post('/restaurants/:id/products', async (req, res) => {
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
    res.status(500).json({ error: 'Error creando producto' });
  }
});

// Pedidos de un restaurante
router.get('/restaurants/:id/orders', async (req, res) => {
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
    res.status(500).json({ error: 'Error' });
  }
});

// Cambiar rol de un usuario
router.put('/users/:id/role', async (req, res) => {
  const { id } = req.params;
  const { role, reason } = req.body;
  if (!/^[a-zA-Z0-9-]+$/.test(id)) return res.status(400).json({ error: 'ID inválido' });
  if (!['CLIENT', 'RESTAURANT_OWNER', 'ADMIN'].includes(role)) return res.status(400).json({ error: 'Rol inválido' });

  // Proteger al propio SuperAdmin de modificarse a sí mismo
  if (id === req.dbUser.id) return res.status(400).json({ error: 'No puedes modificar tu propio rol' });

  try {
    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (SUPERADMIN_EMAILS.includes(targetUser.email)) return res.status(400).json({ error: 'No se puede modificar al SuperAdmin' });

    const updated = await prisma.user.update({ where: { id }, data: { role } });
    res.json({ id: updated.id, email: updated.email, role: updated.role });
  } catch (error) {
    res.status(500).json({ error: 'Error cambiando rol' });
  }
});

// Pedidos por día — para gráfica del superadmin
router.get('/chart-data', async (req, res) => {
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
    res.status(500).json({ error: 'Error' });
  }
});

// Configuración de la plataforma
router.get('/settings', async (req, res) => {
  try {
    let config = await prisma.platformConfig.findFirst();
    if (!config) {
      config = await prisma.platformConfig.create({ data: {} });
    }
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo configuración' });
  }
});

router.put('/settings', async (req, res) => {
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
    res.status(500).json({ error: 'Error actualizando configuración' });
  }
});

module.exports = router;
