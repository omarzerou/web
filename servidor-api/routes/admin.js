const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ log: ['error'] });

const { validarTokenFirebase, verificarPropietarioRestaurante } = require('../controllers/authController');
const soloRestaurantOwner = verificarPropietarioRestaurante;

// Helper para sanitizar strings
const sanitize = (str) => {
  if (typeof str !== 'string') return str;
  return str.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').substring(0, 2000);
};

// [PARCHE #1] Validador de formato para el header x-restaurant-id
// Previene inyección de strings arbitrarios o excesivamente largos en las queries
const isValidId = (str) => typeof str === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(str);

// Estadísticas propias
router.get('/stats', validarTokenFirebase, soloRestaurantOwner, async (req, res) => {
  try {
    const rawRestId = req.headers['x-restaurant-id'];
    const reqRestId = isValidId(rawRestId) ? rawRestId : null; // [PARCHE #1]
    const restaurant = reqRestId
      ? await prisma.restaurant.findFirst({ where: { OR: [{ id: reqRestId }, { slug: reqRestId }], ownerId: req.dbUser.id } })
      : await prisma.restaurant.findFirst({ where: { ownerId: req.dbUser.id } });
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
router.post('/payment', validarTokenFirebase, soloRestaurantOwner, async (req, res) => {
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
router.get('/orders', validarTokenFirebase, soloRestaurantOwner, async (req, res) => {
  try {
    const rawRestId = req.headers['x-restaurant-id'];
    const reqRestId = isValidId(rawRestId) ? rawRestId : null; // [PARCHE #1]
    const restaurant = reqRestId
      ? await prisma.restaurant.findFirst({ where: { OR: [{ id: reqRestId }, { slug: reqRestId }], ownerId: req.dbUser.id } })
      : await prisma.restaurant.findFirst({ where: { ownerId: req.dbUser.id } });
    if (!restaurant) return res.status(404).json({ error: 'Sin restaurante asignado' });

    const orders = await prisma.order.findMany({
      where: { restaurantId: restaurant.id },
      include: { client: { select: { id: true, name: true, email: true, phone: true, address: true } }, items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    res.json(orders);
  } catch (error) {
    console.error('[restaurant-admin/orders]', error.message);
    res.status(500).json({ error: 'Error obteniendo pedidos' });
  }
});

// Dashboard del restaurante (ruta usada por el panel web)
router.get('/my-restaurant', validarTokenFirebase, soloRestaurantOwner, async (req, res) => {
  try {
    const restaurant = await prisma.restaurant.findFirst({ where: { ownerId: req.dbUser.id } });
    if (!restaurant) return res.status(404).json({ error: 'Sin restaurante asignado' });

    const orders = await prisma.order.findMany({
      where: { restaurantId: restaurant.id },
      include: {
        client: { select: { id: true, name: true, email: true, phone: true, address: true } },
        items: { include: { product: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    res.json({
      id: restaurant.id,
      name: restaurant.name,
      status: restaurant.status,
      orders
    });
  } catch (error) {
    console.error('[dashboard/my-restaurant]', error.message);
    res.status(500).json({ error: 'Error obteniendo datos del restaurante' });
  }
});

// Productos propios
router.get('/products', validarTokenFirebase, soloRestaurantOwner, async (req, res) => {
  try {
    const rawRestId = req.headers['x-restaurant-id'];
    const reqRestId = isValidId(rawRestId) ? rawRestId : null; // [PARCHE #1]
    const restaurant = reqRestId
      ? await prisma.restaurant.findFirst({ where: { OR: [{ id: reqRestId }, { slug: reqRestId }], ownerId: req.dbUser.id } })
      : await prisma.restaurant.findFirst({ where: { ownerId: req.dbUser.id } });
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

// Pedidos para gráficas (semanal, mensual, anual)
router.get('/chart-data', validarTokenFirebase, soloRestaurantOwner, async (req, res) => {
  try {
    const rawRestId = req.headers['x-restaurant-id'];
    const reqRestId = isValidId(rawRestId) ? rawRestId : null; // [PARCHE #1]
    const restaurant = reqRestId
      ? await prisma.restaurant.findFirst({ where: { OR: [{ id: reqRestId }, { slug: reqRestId }], ownerId: req.dbUser.id } })
      : await prisma.restaurant.findFirst({ where: { ownerId: req.dbUser.id } });
    if (!restaurant) return res.status(404).json({ error: 'Sin restaurante' });

    const result = { weekly: [], monthly: [], yearly: [] };

    // Semanal (Últimos 7 días)
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const start = new Date(date.setHours(0, 0, 0, 0));
      const end = new Date(date.setHours(23, 59, 59, 999));
      const count = await prisma.order.count({ where: { restaurantId: restaurant.id, createdAt: { gte: start, lte: end } } });
      const revenue = await prisma.order.aggregate({ _sum: { totalAmount: true }, where: { restaurantId: restaurant.id, status: 'DELIVERED', createdAt: { gte: start, lte: end } } });
      result.weekly.push({ name: days[start.getDay()], pedidos: count, ingresos: revenue._sum.totalAmount || 0 });
    }

    // Mensual (Últimas 4 semanas)
    for (let i = 3; i >= 0; i--) {
      const end = new Date();
      end.setDate(end.getDate() - i * 7);
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      start.setHours(0,0,0,0);
      end.setHours(23,59,59,999);
      const count = await prisma.order.count({ where: { restaurantId: restaurant.id, createdAt: { gte: start, lte: end } } });
      const revenue = await prisma.order.aggregate({ _sum: { totalAmount: true }, where: { restaurantId: restaurant.id, status: 'DELIVERED', createdAt: { gte: start, lte: end } } });
      result.monthly.push({ name: `Sem ${4 - i}`, pedidos: count, ingresos: revenue._sum.totalAmount || 0 });
    }

    // Anual (Últimos 12 meses)
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const start = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0);
      const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
      const count = await prisma.order.count({ where: { restaurantId: restaurant.id, createdAt: { gte: start, lte: end } } });
      const revenue = await prisma.order.aggregate({ _sum: { totalAmount: true }, where: { restaurantId: restaurant.id, status: 'DELIVERED', createdAt: { gte: start, lte: end } } });
      result.yearly.push({ name: months[start.getMonth()], pedidos: count, ingresos: revenue._sum.totalAmount || 0 });
    }

    res.json(result);
  } catch (error) {
    console.error('[chart-data]', error.message);
    res.status(500).json({ error: 'Error obteniendo datos de gráfica' });
  }
});

// Actualizar perfil del restaurante
router.put('/profile', validarTokenFirebase, soloRestaurantOwner, async (req, res) => {
  const name = sanitize(req.body.name);
  const address = sanitize(req.body.address);
  const imageUrl = sanitize(req.body.imageUrl);
  const status = req.body.status;

  try {
    const rawRestId = req.headers['x-restaurant-id'];
    const reqRestId = isValidId(rawRestId) ? rawRestId : null; // [PARCHE #1]
    const restaurant = reqRestId
      ? await prisma.restaurant.findFirst({ where: { OR: [{ id: reqRestId }, { slug: reqRestId }], ownerId: req.dbUser.id } })
      : await prisma.restaurant.findFirst({ where: { ownerId: req.dbUser.id } });
    if (!restaurant) return res.status(404).json({ error: 'No tienes restaurante asignado' });

    const updated = await prisma.restaurant.update({
      where: { id: restaurant.id },
      data: {
        ...(name !== undefined && { name }),
        ...(address !== undefined && { address }),
        ...(imageUrl !== undefined && { imageUrl }),
        // NOTA: El estado normal no debería poder cambiarse por el dueño a APPROVED si está PENDING
      }
    });
    res.json(updated);
  } catch (error) {
    console.error('[restaurant-admin/profile PUT]', error.message);
    res.status(500).json({ error: 'Error actualizando perfil' });
  }
});

// Actualizar configuración
router.put('/settings', validarTokenFirebase, soloRestaurantOwner, async (req, res) => {
  try {
    const rawRestId = req.headers['x-restaurant-id'];
    const reqRestId = isValidId(rawRestId) ? rawRestId : null; // [PARCHE #1]
    const restaurant = reqRestId
      ? await prisma.restaurant.findFirst({ where: { OR: [{ id: reqRestId }, { slug: reqRestId }], ownerId: req.dbUser.id } })
      : await prisma.restaurant.findFirst({ where: { ownerId: req.dbUser.id } });
    if (!restaurant) return res.status(404).json({ error: 'No tienes restaurante asignado' });

    const { deliveryFee, minOrder, coverageRadius, bufferTime, operatingHours } = req.body;
    const data = {};
    if (deliveryFee !== undefined) data.deliveryFee = parseFloat(deliveryFee) || 0;
    if (minOrder !== undefined) data.minOrder = parseFloat(minOrder) || 0;
    if (coverageRadius !== undefined) data.coverageRadius = parseFloat(coverageRadius) || 0;
    if (bufferTime !== undefined) data.bufferTime = parseInt(bufferTime) || 30;
    if (operatingHours !== undefined) data.operatingHours = operatingHours;

    const updated = await prisma.restaurant.update({ where: { id: restaurant.id }, data });
    res.json({ message: 'Ajustes guardados correctamente', restaurant: updated });
  } catch (error) {
    console.error('[settings PUT]', error.message);
    res.status(500).json({ error: 'Error guardando ajustes' });
  }
});

module.exports = router;
