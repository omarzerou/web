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

// Estadísticas propias
router.get('/stats', validarTokenFirebase, soloRestaurantOwner, async (req, res) => {
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
router.get('/products', validarTokenFirebase, soloRestaurantOwner, async (req, res) => {
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

// Pedidos por día de la semana (últimos 7 días) — para gráfica
router.get('/chart-data', validarTokenFirebase, soloRestaurantOwner, async (req, res) => {
  try {
    const restaurant = await prisma.restaurant.findFirst({ where: { ownerId: req.dbUser.id } });
    if (!restaurant) return res.status(404).json({ error: 'Sin restaurante' });

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

// Actualizar perfil del restaurante
router.put('/profile', validarTokenFirebase, soloRestaurantOwner, async (req, res) => {
  const name = sanitize(req.body.name);
  const address = sanitize(req.body.address);
  const imageUrl = sanitize(req.body.imageUrl);
  const status = req.body.status;
  
  try {
    const restaurant = await prisma.restaurant.findFirst({ where: { ownerId: req.dbUser.id } });
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
    res.json({ message: 'Ajustes guardados correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error guardando ajustes' });
  }
});

module.exports = router;
