const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ log: ['error'] });

const { validarTokenFirebase } = require('../controllers/authController');

const SUPERADMIN_EMAILS = ['poleljesus@gmail.com', 'hhhhh@gmail.com'];
const SUPERADMIN_EMAIL = SUPERADMIN_EMAILS[0]; // legacy compat
const VALID_RESTAURANT_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'];
const VALID_SUBSCRIPTION_PLANS  = ['FREE', 'BASIC', 'PREMIUM', 'ENTERPRISE']; // [PARCHE] lista blanca de planes

// Helper sanitize
const sanitize = (str) => {
  if (typeof str !== 'string') return str;
  return str.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').substring(0, 2000);
};

// Solo SuperAdmin
const soloSuperAdmin = async (req, res, next) => {
  const user = await prisma.user.findUnique({ where: { email: req.usuario.email } });
  if (!user || user.role !== 'ADMIN' || !SUPERADMIN_EMAILS.includes(user.email)) {
    return res.status(403).json({ error: 'Acceso denegado: Solo el SuperAdmin puede realizar esta acciÃ³n' });
  }
  req.dbUser = user;
  next();
};

router.use(validarTokenFirebase);
router.use(soloSuperAdmin);

// â”€â”€â”€ ESTADÃSTICAS GLOBALES CON TENDENCIAS REALES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/stats', async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const [
      totalUsers, totalRestaurants, totalOrders, revenueObj,
      usersThisMonth, usersLastMonth,
      ordersThisMonth, ordersLastMonth,
      revenueThisMonth, revenueLastMonth
    ] = await Promise.all([
      prisma.user.count(),
      prisma.restaurant.count(),
      prisma.order.count(),
      prisma.order.aggregate({ _sum: { totalAmount: true }, where: { status: 'DELIVERED' } }),
      prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.user.count({ where: { createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } } }),
      prisma.order.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.order.count({ where: { createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } } }),
      prisma.order.aggregate({ _sum: { totalAmount: true }, where: { status: 'DELIVERED', createdAt: { gte: startOfMonth } } }),
      prisma.order.aggregate({ _sum: { totalAmount: true }, where: { status: 'DELIVERED', createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } } }),
    ]);

    const calcTrend = (current, prev) => {
      if (!prev || prev === 0) return current > 0 ? '+100%' : '0%';
      const pct = Math.round(((current - prev) / prev) * 100);
      return (pct >= 0 ? '+' : '') + pct + '%';
    };

    const revThis = revenueThisMonth._sum.totalAmount || 0;
    const revLast = revenueLastMonth._sum.totalAmount || 0;

    res.json({
      users: totalUsers,
      restaurants: totalRestaurants,
      orders: totalOrders,
      revenue: revenueObj._sum.totalAmount || 0,
      trends: {
        users: calcTrend(usersThisMonth, usersLastMonth),
        restaurants: calcTrend(totalRestaurants, Math.max(0, totalRestaurants - 1)),
        orders: calcTrend(ordersThisMonth, ordersLastMonth),
        revenue: calcTrend(revThis, revLast),
      }
    });
  } catch (error) {
    console.error('[superadmin/stats]', error.message);
    res.status(500).json({ error: 'Error obteniendo estadÃ­sticas' });
  }
});

// â”€â”€â”€ RESTAURANTES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

router.put('/restaurants/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!/^[a-zA-Z0-9-]+$/.test(id)) return res.status(400).json({ error: 'ID invÃ¡lido' });
  if (!VALID_RESTAURANT_STATUSES.includes(status)) return res.status(400).json({ error: 'Estado invÃ¡lido' });
  try {
    const restaurant = await prisma.restaurant.update({ where: { id }, data: { status } });
    res.json({ id: restaurant.id, status: restaurant.status });
  } catch (error) {
    res.status(500).json({ error: 'Error actualizando restaurante' });
  }
});

router.put('/restaurants/:id/subscription', async (req, res) => {
  const { id } = req.params;
  const { subscriptionPlan } = req.body;
  if (!/^[a-zA-Z0-9-]+$/.test(id)) return res.status(400).json({ error: 'ID inválido' });
  // [PARCHE] Validar contra lista blanca — impide strings arbitrarios en la BD
  if (!VALID_SUBSCRIPTION_PLANS.includes(subscriptionPlan)) {
    return res.status(400).json({ error: `Plan inválido. Valores permitidos: ${VALID_SUBSCRIPTION_PLANS.join(', ')}` });
  }
  try {
    const restaurant = await prisma.restaurant.update({ where: { id }, data: { subscriptionPlan } });
    res.json({ id: restaurant.id, subscriptionPlan: restaurant.subscriptionPlan });
  } catch (error) {
    res.status(500).json({ error: 'Error actualizando suscripción' });
  }
});

// â”€â”€â”€ PEDIDOS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    res.status(500).json({ error: 'Error' });
  }
});

// alias usado por algunos fetches del frontend
router.get('/all-orders', async (req, res) => {
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
    res.status(500).json({ error: 'Error' });
  }
});

// â”€â”€â”€ CLIENTES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    res.status(500).json({ error: 'Error' });
  }
});

// â”€â”€â”€ PRODUCTOS DE UN RESTAURANTE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/restaurants/:id/products', async (req, res) => {
  const { id } = req.params;
  if (!/^[a-zA-Z0-9-]+$/.test(id)) return res.status(400).json({ error: 'ID invÃ¡lido' });
  try {
    const products = await prisma.product.findMany({ where: { restaurantId: id }, orderBy: { createdAt: 'desc' } });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Error' });
  }
});

router.post('/restaurants/:id/products', async (req, res) => {
  const { id } = req.params;
  if (!/^[a-zA-Z0-9-]+$/.test(id)) return res.status(400).json({ error: 'ID invÃ¡lido' });
  const name = sanitize(req.body.name);
  const description = sanitize(req.body.description);
  const imageUrl = sanitize(req.body.imageUrl);
  const price = parseFloat(req.body.price);
  if (!name || name.length < 2) return res.status(400).json({ error: 'Nombre obligatorio' });
  if (isNaN(price) || price <= 0) return res.status(400).json({ error: 'Precio invÃ¡lido' });
  try {
    const product = await prisma.product.create({ data: { name, description, price, imageUrl, restaurantId: id } });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Error creando producto' });
  }
});

// â”€â”€â”€ PEDIDOS DE UN RESTAURANTE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/restaurants/:id/orders', async (req, res) => {
  const { id } = req.params;
  if (!/^[a-zA-Z0-9-]+$/.test(id)) return res.status(400).json({ error: 'ID invÃ¡lido' });
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

// â”€â”€â”€ ROLES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.put('/users/:id/role', async (req, res) => {
  const { id } = req.params;
  const { role, reason } = req.body;
  if (!/^[a-zA-Z0-9-]+$/.test(id)) return res.status(400).json({ error: 'ID invÃ¡lido' });
  if (!['CLIENT', 'RESTAURANT_OWNER', 'ADMIN'].includes(role)) return res.status(400).json({ error: 'Rol invÃ¡lido' });
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

// â”€â”€â”€ GRÃFICA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/chart-data', async (req, res) => {
  try {
    const days = ['Dom', 'Lun', 'Mar', 'MiÃ©', 'Jue', 'Vie', 'SÃ¡b'];
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

// â”€â”€â”€ CHAT (SuperAdmin â†” Restaurantes) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Lista todos los restaurantes con su Ãºltimo mensaje
router.get('/chats', async (req, res) => {
  try {
    const restaurants = await prisma.restaurant.findMany({
      include: {
        owner: { select: { id: true, name: true, email: true } },
        chatMessages: { orderBy: { createdAt: 'desc' }, take: 1 }
      },
      orderBy: { createdAt: 'desc' }
    });
    const result = restaurants.map(r => ({
      id: r.id,
      name: r.name,
      imageUrl: r.imageUrl,
      owner: r.owner,
      status: r.status,
      lastMessage: r.chatMessages[0] || null,
      unread: r.chatMessages[0]?.senderRole === 'RESTAURANT_OWNER'
    }));
    res.json(result);
  } catch (error) {
    console.error('[superadmin/chats]', error.message);
    res.status(500).json({ error: 'Error obteniendo chats' });
  }
});

// Mensajes de un restaurante especÃ­fico
router.get('/chats/:restaurantId', async (req, res) => {
  const { restaurantId } = req.params;
  if (!/^[a-zA-Z0-9-]+$/.test(restaurantId)) return res.status(400).json({ error: 'ID invÃ¡lido' });
  try {
    const messages = await prisma.chatMessage.findMany({
      where: { restaurantId },
      orderBy: { createdAt: 'asc' },
      take: 200
    });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Error' });
  }
});

// Enviar mensaje como ADMIN a un restaurante
router.post('/chats/:restaurantId', async (req, res) => {
  const { restaurantId } = req.params;
  if (!/^[a-zA-Z0-9-]+$/.test(restaurantId)) return res.status(400).json({ error: 'ID invÃ¡lido' });
  const content = sanitize(req.body.content);
  if (!content || content.length === 0) return res.status(400).json({ error: 'Mensaje vacÃ­o' });
  if (content.length > 1000) return res.status(400).json({ error: 'Mensaje demasiado largo' });

  try {
    const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
    if (!restaurant) return res.status(404).json({ error: 'Restaurante no encontrado' });

    const message = await prisma.chatMessage.create({
      data: {
        restaurantId,
        senderRole: 'ADMIN',
        senderName: 'SuperAdmin Tastio',
        content
      }
    });
    res.json(message);
  } catch (error) {
    console.error('[superadmin/chats POST]', error.message);
    res.status(500).json({ error: 'Error enviando mensaje' });
  }
});

// â”€â”€â”€ CONFIGURACIÃ“N DE PLATAFORMA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/settings', async (req, res) => {
  try {
    let config = await prisma.platformConfig.findFirst();
    if (!config) {
      config = await prisma.platformConfig.create({ data: {} });
    }
    // Parse paymentGatewayKeys JSON
    if (config.paymentGatewayKeys && typeof config.paymentGatewayKeys === 'string') {
      try { config.paymentGatewayKeys = JSON.parse(config.paymentGatewayKeys); } catch (e) { config.paymentGatewayKeys = {}; }
    }
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo configuraciÃ³n' });
  }
});

router.put('/settings', async (req, res) => {
  try {
    let config = await prisma.platformConfig.findFirst();
    const {
      platformName, supportEmail, supportPhone,
      paymentGatewayKeys, currency, language,
      emailNotifications, pushNotifications,
      googleAnalyticsId, googleTagManagerId, googleAdsId, metaPixelId,
      seoTitle, seoDescription, platformCommission
    } = req.body;

    const data = {
      ...(platformName !== undefined && { platformName: sanitize(platformName) }),
      ...(supportEmail !== undefined && { supportEmail: sanitize(supportEmail) }),
      ...(supportPhone !== undefined && { supportPhone: sanitize(supportPhone) }),
      ...(paymentGatewayKeys !== undefined && { paymentGatewayKeys: typeof paymentGatewayKeys === 'object' ? JSON.stringify(paymentGatewayKeys) : paymentGatewayKeys }),
      ...(currency !== undefined && { currency: sanitize(currency) }),
      ...(language !== undefined && { language: sanitize(language) }),
      ...(emailNotifications !== undefined && { emailNotifications: Boolean(emailNotifications) }),
      ...(pushNotifications !== undefined && { pushNotifications: Boolean(pushNotifications) }),
      ...(googleAnalyticsId !== undefined && { googleAnalyticsId: sanitize(googleAnalyticsId) }),
      ...(googleTagManagerId !== undefined && { googleTagManagerId: sanitize(googleTagManagerId) }),
      ...(googleAdsId !== undefined && { googleAdsId: sanitize(googleAdsId) }),
      ...(metaPixelId !== undefined && { metaPixelId: sanitize(metaPixelId) }),
      ...(seoTitle !== undefined && { seoTitle: sanitize(seoTitle) }),
      ...(seoDescription !== undefined && { seoDescription: sanitize(seoDescription) }),
      ...(platformCommission !== undefined && { platformCommission: parseFloat(platformCommission) || 0 }),
    };

    if (!config) {
      config = await prisma.platformConfig.create({ data });
    } else {
      config = await prisma.platformConfig.update({ where: { id: config.id }, data });
    }
    // Parse back for response
    if (config.paymentGatewayKeys && typeof config.paymentGatewayKeys === 'string') {
      try { config.paymentGatewayKeys = JSON.parse(config.paymentGatewayKeys); } catch (e) { config.paymentGatewayKeys = {}; }
    }
    res.json(config);
  } catch (error) {
    console.error('[superadmin/settings PUT]', error.message);
    res.status(500).json({ error: 'Error actualizando configuraciÃ³n' });
  }
});


module.exports = router;
