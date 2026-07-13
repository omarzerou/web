const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ log: ['error'] });

// Importar el middleware de seguridad base
const { validarTokenFirebase } = require('../controllers/authController');

/**
 * RUTAS DE USUARIOS / CLIENTES (/api/usuarios)
 */

// GET PROTEGIDO: Obtener el perfil del propio usuario
router.get('/me', validarTokenFirebase, async (req, res) => {
    try {
        const email = req.usuario.email;
        
        // Buscamos el usuario por su email del token
        const user = await prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                phone: true,
                address: true,
                createdAt: true
            }
        });

        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado en la base de datos' });
        }

        res.json(user);

    } catch (error) {
        console.error('[GET /api/usuarios/me] Error:', error.message);
        res.status(500).json({ error: 'Error interno obteniendo el perfil' });
    }
});

// PATCH PROTEGIDO: Actualizar los datos del propio usuario
router.patch('/me', validarTokenFirebase, async (req, res) => {
    try {
        const email = req.usuario.email;
        const { phone, address } = req.body;

        // Validaciones básicas de longitud para seguridad
        if (phone && phone.length > 20) {
            return res.status(400).json({ error: 'El teléfono es demasiado largo' });
        }
        if (address && address.length > 200) {
            return res.status(400).json({ error: 'La dirección es demasiado larga' });
        }

        // Primero verificamos que el usuario existe
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Actualizamos estrictamente solo el teléfono y la dirección
        const datosActualizados = {
            ...(phone !== undefined && { phone }),
            ...(address !== undefined && { address })
        };

        const usuarioActualizado = await prisma.user.update({
            where: { email },
            data: datosActualizados,
            select: {
                id: true,
                email: true,
                name: true,
                phone: true,
                address: true
            }
        });

        res.json({
            mensaje: 'Perfil actualizado correctamente',
            usuario: usuarioActualizado
        });

    } catch (error) {
        console.error('[PATCH /api/usuarios/me] Error:', error.message);
        res.status(500).json({ error: 'Error interno actualizando el perfil' });
    }
});

module.exports = router;
