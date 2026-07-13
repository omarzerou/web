const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ log: ['error'] });

const { validarTokenFirebase } = require('../controllers/authController');

// Helper para sanitizar strings
const sanitize = (str) => {
  if (typeof str !== 'string') return str;
  return str.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').substring(0, 2000);
};

// Rate Limiting estricto para auth — máximo 10 req/min
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Demasiados intentos de autenticación. Espera 1 minuto.' },
});

// Sincronizar usuario cliente
router.post('/sync', authLimiter, validarTokenFirebase, async (req, res) => {
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
router.post('/sync-restaurant', authLimiter, validarTokenFirebase, async (req, res) => {
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

// Perfil de usuario (retrocompatibilidad)
router.get('/profile', validarTokenFirebase, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { email: req.usuario.email } });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ id: user.id, email: user.email, name: user.name, phone: user.phone, address: user.address, role: user.role });
  } catch (error) {
    res.status(500).json({ error: 'Error' });
  }
});

// Actualizar perfil (retrocompatibilidad)
router.put('/profile', validarTokenFirebase, async (req, res) => {
  const phone = sanitize(req.body.phone);
  const address = sanitize(req.body.address);
  if (phone && phone.length > 20) return res.status(400).json({ error: 'Teléfono inválido' });
  if (address && address.length > 200) return res.status(400).json({ error: 'Dirección demasiado larga' });
  try {
    const user = await prisma.user.update({
      where: { email: req.usuario.email },
      data: { phone: phone || null, address: address || null }
    });
    res.json({ id: user.id, email: user.email, name: user.name, phone: user.phone, address: user.address });
  } catch (error) {
    res.status(500).json({ error: 'Error actualizando perfil' });
  }
});

module.exports = router;
