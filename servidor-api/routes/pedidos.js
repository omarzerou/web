const express = require('express');
const router = express.Router();
// Importar el middleware de autenticación 
const { validarTokenFirebase } = require('../controllers/authController');

/**
 * Rutas para Pedidos (/api/pedidos)
 */

// GET: Obtener todos los pedidos del usuario (requiere autenticación)
router.get('/', validarTokenFirebase, (req, res) => {
    // TODO: HUECO PARA CONSULTAR PEDIDOS EN LA BASE DE DATOS
    res.json({ mensaje: 'Tus pedidos (ejemplo)' });
});

// POST: Crear un nuevo pedido
router.post('/', validarTokenFirebase, (req, res) => {
    const datosPedido = req.body;
    // TODO: HUECO PARA INSERTAR EL PEDIDO EN LA BASE DE DATOS
    res.status(201).json({ 
        mensaje: 'Pedido procesado exitosamente',
        pedido: datosPedido 
    });
});

module.exports = router;
