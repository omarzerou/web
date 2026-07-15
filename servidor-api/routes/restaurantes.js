const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ log: ['error'] });

// IMPORTANTE: Traemos los dos candados de seguridad
const { validarTokenFirebase, verificarPropietarioRestaurante } = require('../controllers/authController');

/**
 * Rutas para Restaurantes (/api/restaurantes)
 */

// GET: Obtener todos los restaurantes (PÚBLICO - No necesita middleware porque los clientes deben ver el menú)
router.get('/', async (req, res) => {
    try {
        const restaurantes = await prisma.restaurant.findMany({
            orderBy: { id: 'asc' },
            include: { products: true }
        });
        res.json(restaurantes);
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
        const nuevoRestaurante = await prisma.restaurant.create({
            data: {
                name: nombre,
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
