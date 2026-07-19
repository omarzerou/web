const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ log: ['error'] });

// Importar los middlewares de seguridad
const { validarTokenFirebase, verificarPropietarioRestaurante } = require('../controllers/authController');

// Helper para sanitizar strings (Prevención XSS)
const sanitize = (str) => {
  if (typeof str !== 'string') return str;
  return str.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').substring(0, 2000);
};

/**
 * RUTAS DE PRODUCTOS (/api/productos)
 */

// GET PÚBLICO: Obtener todos los productos de un restaurante específico
router.get('/restaurante/:restaurantId', async (req, res) => {
    try {
        const { restaurantId } = req.params;
        
        if (!restaurantId) {
            return res.status(400).json({ error: 'Falta el ID del restaurante' });
        }

        const productos = await prisma.product.findMany({
            where: { restaurantId: restaurantId },
            orderBy: { createdAt: 'desc' }
        });

        res.json(productos);
    } catch (error) {
        console.error('[GET /api/productos/restaurante/:id] Error:', error.message);
        res.status(500).json({ error: 'Error interno obteniendo los productos' });
    }
});

// POST PROTEGIDO: Añadir un nuevo plato (Solo el dueño del restaurante)
// Usamos validarTokenFirebase y verificarPropietarioRestaurante
router.post('/', validarTokenFirebase, verificarPropietarioRestaurante, async (req, res) => {
    try {
        // En este punto, req.dbUser tiene el usuario de Prisma
        // y ya pasó la verificación de que es RESTAURANT_OWNER o ADMIN.
        let { name, description, price, imageUrl, category, isOutofStock, isFeatured } = req.body;
        
        name = sanitize(name);
        description = sanitize(description);
        imageUrl = sanitize(imageUrl);
        category = sanitize(category);
        // El frontend debe mandar el restaurantId (o podemos sacarlo de la base de datos si el dueño solo tiene uno)
        // Para más seguridad, forzamos que se asigne al restaurante del cual es dueño
        // [PARCHE] Validar formato del header x-restaurant-id antes de usarlo en la query
        const isValidId = (s) => typeof s === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(s);
        const rawRestId = req.headers['x-restaurant-id'];
        const reqRestId = isValidId(rawRestId) ? rawRestId : null;
        const restaurant = reqRestId 
            ? await prisma.restaurant.findFirst({ where: { id: reqRestId, ownerId: req.dbUser.id } })
            : await prisma.restaurant.findFirst({ where: { ownerId: req.dbUser.id } });
        
        if (!restaurant) {
            return res.status(403).json({ error: 'No tienes un restaurante asignado' });
        }

        if (!name || isNaN(price)) {
            return res.status(400).json({ error: 'Faltan campos obligatorios o precio inválido' });
        }

        const nuevoProducto = await prisma.product.create({
            data: {
                name,
                description: description || null,
                price: parseFloat(price),
                imageUrl: imageUrl || null,
                category: category || null,
                isOutofStock: Boolean(isOutofStock),
                isFeatured: Boolean(isFeatured),
                restaurantId: restaurant.id
            }
        });

        res.status(201).json(nuevoProducto);

    } catch (error) {
        console.error('[POST /api/productos] Error:', error.message);
        res.status(500).json({ error: 'Error interno creando el producto' });
    }
});

// PATCH PROTEGIDO: Actualizar un producto existente (Solo dueño)
router.patch('/:id', validarTokenFirebase, verificarPropietarioRestaurante, async (req, res) => {
    try {
        const { id } = req.params;
        let { price, isOutofStock, name, description, imageUrl, category, isFeatured } = req.body;
        
        name = name !== undefined ? sanitize(name) : undefined;
        description = description !== undefined ? sanitize(description) : undefined;
        imageUrl = imageUrl !== undefined ? sanitize(imageUrl) : undefined;
        category = category !== undefined ? sanitize(category) : undefined;

        // Primero verificar que el producto existe y pertenece al restaurante del usuario
        const productoExistente = await prisma.product.findUnique({
            where: { id },
            include: { restaurant: true }
        });

        if (!productoExistente) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        // Verificación extra de seguridad (aunque el middleware ya lo bloquea en su mayor parte, aquí lo comprobamos a nivel producto)
        if (req.dbUser.role !== 'ADMIN' && productoExistente.restaurant.ownerId !== req.dbUser.id) {
            return res.status(403).json({ error: 'No tienes permiso para modificar este producto' });
        }

        // Actualizamos solo los campos enviados
        const datosActualizados = {
            ...(name !== undefined && { name }),
            ...(description !== undefined && { description }),
            ...(price !== undefined && { price: parseFloat(price) }),
            ...(imageUrl !== undefined && { imageUrl }),
            ...(category !== undefined && { category }),
            ...(isOutofStock !== undefined && { isOutofStock: Boolean(isOutofStock) }),
            ...(isFeatured !== undefined && { isFeatured: Boolean(isFeatured) })
        };

        const productoActualizado = await prisma.product.update({
            where: { id },
            data: datosActualizados
        });

        res.json(productoActualizado);

    } catch (error) {
        console.error(`[PATCH /api/productos/${req.params.id}] Error:`, error.message);
        res.status(500).json({ error: 'Error interno actualizando el producto' });
    }
});

// DELETE PROTEGIDO: Eliminar producto
// [PARCHE #3] Usar el middleware oficial en lugar de lógica manual duplicada
router.delete('/:id', validarTokenFirebase, verificarPropietarioRestaurante, async (req, res) => {
  const { id } = req.params;
  if (!/^[a-zA-Z0-9-]+$/.test(id)) return res.status(400).json({ error: 'ID inválido' });

  try {
    const product = await prisma.product.findUnique({ where: { id }, include: { restaurant: true } });
    if (!product) return res.status(404).json({ error: 'Producto no encontrado' });

    // El middleware ya garantiza que req.dbUser es ADMIN o RESTAURANT_OWNER válido.
    // Solo añadimos la verificación de que el OWNER sea dueño de ESTE producto concreto.
    if (req.dbUser.role !== 'ADMIN' && product.restaurant.ownerId !== req.dbUser.id) {
      return res.status(403).json({ error: 'Sin permiso para eliminar este producto' });
    }

    await prisma.product.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('[products DELETE]', error.message);
    res.status(500).json({ error: 'Error eliminando producto' });
  }
});

module.exports = router;
