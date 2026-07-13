const { getAuth } = require('firebase-admin/auth');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ log: ['error'] });

/**
 * Controlador de Autenticación
 * Valida el token JWT de Firebase que viene en los headers.
 */
const validarTokenFirebase = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ mensaje: 'No se proporcionó token de autenticación válido' });
        }

        const token = authHeader.split(' ')[1];

        // Validar token con Firebase Admin
        const decodedToken = await getAuth().verifyIdToken(token);
        
        // Guardar el usuario en la request para usarlo en otras rutas (ej. req.usuario.uid)
        req.usuario = decodedToken;
        
        next();
    } catch (error) {
        console.error('Error validando token de Firebase:', error);
        res.status(401).json({ mensaje: 'Token inválido o expirado' });
    }
};

/**
 * Middleware para validar que el usuario no sea CLIENT 
 * y que sea el dueño legítimo del restaurante que intenta administrar.
 */
const verificarPropietarioRestaurante = async (req, res, next) => {
    try {
        if (!req.usuario || !req.usuario.email) {
            return res.status(401).json({ error: 'Usuario no autenticado' });
        }

        const email = req.usuario.email;
        const user = await prisma.user.findUnique({ where: { email } });
        
        // BLOQUEO INMEDIATO si es CLIENT o no existe en la BD
        if (!user || user.role === 'CLIENT') {
            return res.status(403).json({ error: 'Acceso Denegado: Los clientes no tienen acceso al panel de administración' });
        }

        req.dbUser = user; // Guardar para siguientes middlewares

        // Si es ADMIN (SuperAdmin), puede acceder a cualquier cosa
        if (user.role === 'ADMIN') {
            const impersonateId = req.headers['x-impersonate-restaurant'];
            if (impersonateId) {
                const targetRestaurant = await prisma.restaurant.findUnique({ where: { id: impersonateId } });
                if (targetRestaurant) {
                    req.dbUser.id = targetRestaurant.ownerId; // Suplantación segura
                }
            }
            return next();
        }

        // Si es RESTAURANT_OWNER, verificamos que el ID del restaurante le pertenece
        if (user.role === 'RESTAURANT_OWNER') {
            // Buscamos si el usuario tiene al menos un restaurante asignado
            const restaurant = await prisma.restaurant.findFirst({ where: { ownerId: user.id } });
            
            if (!restaurant) {
                return res.status(403).json({ error: 'Acceso Denegado: No tienes ningún restaurante registrado' });
            }

            // Si la ruta provee un ID de restaurante específico por URL (ej. /api/restaurants/:id)
            const paramRestId = req.params.id || req.params.restaurantId;
            if (paramRestId && restaurant.id !== paramRestId) {
                return res.status(403).json({ error: 'Acceso Denegado: No eres el dueño de este restaurante' });
            }

            return next();
        }

        return res.status(403).json({ error: 'Rol no reconocido' });

    } catch (error) {
        console.error('Error en verificarPropietarioRestaurante:', error);
        res.status(500).json({ error: 'Error interno del servidor verificando accesos' });
    }
};

module.exports = {
    validarTokenFirebase,
    verificarPropietarioRestaurante
};
