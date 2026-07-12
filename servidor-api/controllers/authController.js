const { getAuth } = require('firebase-admin/auth');

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

module.exports = {
    validarTokenFirebase
};
