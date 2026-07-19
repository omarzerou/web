const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const { body, validationResult } = require('express-validator');

// Almacén en memoria temporal para los OTPs (En producción usar Redis o DB)
const otpCache = new Map();

// Configuración de Nodemailer (Plantilla)
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER || 'tu-correo@gmail.com',
        pass: process.env.SMTP_PASS || 'tu-contraseña-de-aplicacion'
    }
});

// Enviar OTP
router.post('/send', 
  body('email').isEmail().withMessage('Correo electrónico inválido'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email } = req.body;
    const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6 dígitos
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutos

    otpCache.set(email, { code, expiresAt });

    try {
        // En un entorno real se descomenta esto. Por ahora simulamos el envío en consola para pruebas.
        /*
        await transporter.sendMail({
            from: '"Tastio Seguridad" <no-reply@tastio.com>',
            to: email,
            subject: 'Tu código de verificación de Tastio',
            text: `Tu código seguro de acceso es: ${code}`,
            html: `<h3>Bienvenido a Tastio</h3><p>Tu código seguro de acceso es: <b>${code}</b></p><p>Este código expira en 10 minutos.</p>`
        });
        */
        console.log(`\n=========================================`);
        console.log(`[SIMULACIÓN OTP] Enviado a: ${email}`);
        console.log(`[SIMULACIÓN OTP] Código: ${code}`);
        console.log(`=========================================\n`);
        
        res.json({ success: true, message: 'Código enviado' });
    } catch (error) {
        console.error('[OTP] Error al enviar correo:', error);
        res.status(500).json({ error: 'No se pudo enviar el correo de verificación' });
    }
});

// Verificar OTP
router.post('/verify',
  body('email').isEmail().withMessage('Correo electrónico inválido'),
  body('code').isLength({ min: 6, max: 6 }).isNumeric().withMessage('El código debe tener 6 dígitos numéricos'),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, code } = req.body;
    const record = otpCache.get(email);

    if (!record) return res.status(400).json({ error: 'No hay código pendiente para este correo' });
    if (Date.now() > record.expiresAt) {
        otpCache.delete(email);
        return res.status(400).json({ error: 'El código ha expirado. Por favor, solicita uno nuevo.' });
    }
    if (record.code !== code) return res.status(400).json({ error: 'El código es incorrecto. Inténtalo de nuevo.' });

    // Código válido
    otpCache.delete(email);
    res.json({ success: true, message: 'Código verificado exitosamente' });
});

module.exports = router;
