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

// Obtener mensajes del restaurante propio
router.get('/messages', validarTokenFirebase, soloRestaurantOwner, async (req, res) => {
  try {
    const reqRestId = req.headers['x-restaurant-id'];
    const restaurant = reqRestId 
      ? await prisma.restaurant.findFirst({ where: { id: reqRestId, ownerId: req.dbUser.id } })
      : await prisma.restaurant.findFirst({ where: { ownerId: req.dbUser.id } });
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
router.post('/messages', validarTokenFirebase, soloRestaurantOwner, async (req, res) => {
  const content = sanitize(req.body.content);
  if (!content || content.length === 0) return res.status(400).json({ error: 'Mensaje vacío' });
  if (content.length > 1000) return res.status(400).json({ error: 'Mensaje demasiado largo' });

  try {
    const reqRestId = req.headers['x-restaurant-id'];
    const restaurant = reqRestId 
      ? await prisma.restaurant.findFirst({ where: { id: reqRestId, ownerId: req.dbUser.id } })
      : await prisma.restaurant.findFirst({ where: { ownerId: req.dbUser.id } });
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

module.exports = router;
