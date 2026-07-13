const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ log: ['error'] });


// IMPORTANTE: Traemos los dos candados
const { validarTokenFirebase, verificarPropietarioRestaurante } = require('../controllers/authController');

/**
 * Rutas para Pedidos (/api/pedidos)
 */

// Cualquier usuario autenticado (que exista en DB)
const usuarioAutenticado = async (req, res, next) => {
  const user = await prisma.user.findUnique({ where: { email: req.usuario.email } });
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  req.dbUser = user;
  next();
};

const VALID_ORDER_STATUSES = ['PENDING', 'PREPARING', 'ON_THE_WAY', 'DELIVERED', 'CANCELLED'];

// GET: Cliente viendo sus propios pedidos
router.get('/me', validarTokenFirebase, usuarioAutenticado, async (req, res) => {
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

// POST: Cliente creando un pedido de forma SEGURA calculando precios desde DB
router.post('/', validarTokenFirebase, async (req, res) => {
    const { restaurantId, paymentMethod, deliveryAddress, items } = req.body;

    if (!restaurantId || !paymentMethod || !deliveryAddress || !items?.length) {
        return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    try {
        const user = await prisma.user.findUnique({ where: { email: req.usuario.email } });
        if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

        const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
        if (!restaurant || restaurant.status !== 'APPROVED') {
            return res.status(400).json({ error: 'Restaurante no disponible' });
        }

        let totalAmount = 0;
        const processedItems = [];

        for (const item of items) {
            const productoBd = await prisma.product.findUnique({ where: { id: item.productId } });
            
            if (!productoBd || productoBd.restaurantId !== restaurantId) {
                return res.status(400).json({ error: `Producto inválido: ${item.productId}` });
            }

            const quantity = Math.max(1, parseInt(item.quantity) || 1);
            const itemPrice = productoBd.price; 
            
            // Si el frontend envía extrasPrice, tendríamos que validarlo contra una tabla de extras.
            // Para simplificar y hacer seguro el core, usamos solo el precio base.
            totalAmount += (itemPrice * quantity);

            processedItems.push({
                productId: productoBd.id,
                quantity: quantity,
                price: itemPrice, 
                options: item.options ? JSON.stringify(item.options).substring(0, 500) : null
            });
        }

        const order = await prisma.order.create({
            data: {
                clientId: user.id,
                restaurantId,
                paymentMethod,
                deliveryAddress,
                totalAmount: totalAmount,
                items: { create: processedItems }
            }
        });

        res.status(201).json({ 
            mensaje: 'Pedido seguro creado exitosamente',
            id: order.id, 
            status: order.status, 
            totalAmount: order.totalAmount 
        });

    } catch (error) {
        console.error('[POST /api/pedidos] Error:', error.message);
        res.status(500).json({ error: 'Error interno procesando el pedido' });
    }
});

// Actualizar estado de pedido (solo el dueño del restaurante correspondiente)
router.put('/:id/status', validarTokenFirebase, verificarPropietarioRestaurante, async (req, res) => {
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

module.exports = router;