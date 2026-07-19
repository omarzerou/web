const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ log: ['error'] });

// IMPORTANTE: Traemos los dos candados de seguridad
const { validarTokenFirebase, verificarPropietarioRestaurante } = require('../controllers/authController');

/**
 * Rutas para Restaurantes (/api/restaurantes)
 */

// GET: Obtener todos los restaurantes (PÚBLICO)
router.get('/', async (req, res) => {
    try {
        const CATEGORY_ORDER = ["Menús", "Bandejas", "Camperos", "Hamburguesas", "Kebabs", "Shawarmas", "Chawarmas", "Pizzas", "Tacos", "Pitas y Media Luna", "Media Luna", "Bocadillos", "Entrantes", "Guarniciones", "Postres", "Bebidas", "Extras"];

        const restaurantes = await prisma.restaurant.findMany({
            orderBy: { id: 'asc' },
            include: { products: true }
        });

        // Get sales counts for all products across all restaurants
        const salesData = await prisma.orderItem.groupBy({
            by: ['productId'],
            _sum: { quantity: true }
        });
        const salesMap = new Map(salesData.map(s => [s.productId, s._sum.quantity || 0]));

        const sorted = restaurantes.map(r => {
            // Sort products by category order, then featured first, then by sales desc
            const products = [...r.products].sort((a, b) => {
                const iA = CATEGORY_ORDER.indexOf(a.category || '');
                const iB = CATEGORY_ORDER.indexOf(b.category || '');
                const catA = iA === -1 ? 998 : iA;
                const catB = iB === -1 ? 998 : iB;
                if (catA !== catB) return catA - catB;
                // Within same category: featured first, then by sales count
                if (b.isFeatured !== a.isFeatured) return b.isFeatured ? 1 : -1;
                return (salesMap.get(b.id) || 0) - (salesMap.get(a.id) || 0);
            });

            // Auto-mark top sellers if no products are manually featured
            const hasManualFeatured = products.some(p => p.isFeatured);
            if (!hasManualFeatured) {
                // Top 5 non-extras by sales count
                const nonExtras = products.filter(p => p.category !== 'Extras');
                const topIds = new Set(
                    [...nonExtras].sort((a, b) => (salesMap.get(b.id) || 0) - (salesMap.get(a.id) || 0))
                        .slice(0, 5).map(p => p.id)
                );
                products.forEach(p => { p.isFeatured = topIds.has(p.id); });
            }

            return { ...r, products };
        });

        res.json(sorted);
    } catch (error) {
        console.error('Error al obtener restaurantes:', error);
        res.status(500).json({ error: 'Error del servidor al obtener restaurantes' });
    }
});


// POST: Crear un nuevo restaurante (PROTEGIDO - Solo Admin/Dueños)
// Fíjate cómo ponemos los dos candados en fila antes de ejecutar el código
router.post('/', validarTokenFirebase, verificarPropietarioRestaurante, async (req, res) => {
    const { nombre, descripcion, imagen_url } = req.body;

    if (!nombre) {
        return res.status(400).json({ error: 'El nombre es requerido' });
    }

    try {
        const createSlug = (str) => str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        let baseSlug = createSlug(nombre);
        let slug = baseSlug;
        let counter = 1;
        while (true) {
            const existing = await prisma.restaurant.findUnique({ where: { slug } });
            if (!existing) break;
            slug = `${baseSlug}-${counter}`;
            counter++;
        }

        const nuevoRestaurante = await prisma.restaurant.create({
            data: {
                name: nombre,
                slug: slug,
                description: descripcion || '',
                imageUrl: imagen_url || '',
                ownerId: req.dbUser.id
            }
        });

        res.status(201).json({
            mensaje: 'Restaurante creado exitosamente',
            restaurante: nuevoRestaurante
        });
    } catch (error) {
        console.error('Error al insertar restaurante:', error);
        res.status(500).json({ error: 'Error del servidor al crear restaurante' });
    }
});

module.exports = router;
