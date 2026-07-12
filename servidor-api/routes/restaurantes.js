const express = require('express');
const router = express.Router();

/**
 * Rutas para Restaurantes (/api/restaurantes)
 */

// GET: Obtener todos los restaurantes
router.get('/', async (req, res) => {
    try {
        // Consultar a la base de datos de PostgreSQL
        const resultado = await req.db.query('SELECT * FROM restaurantes ORDER BY id ASC');
        res.json(resultado.rows);
    } catch (error) {
        console.error('Error al obtener restaurantes:', error);
        res.status(500).json({ error: 'Error del servidor al obtener restaurantes' });
    }
});

// POST: Crear un nuevo restaurante
router.post('/', async (req, res) => {
    const { nombre, descripcion, imagen_url } = req.body;
    
    if (!nombre) {
        return res.status(400).json({ error: 'El nombre es requerido' });
    }

    try {
        const query = 'INSERT INTO restaurantes(nombre, descripcion, imagen_url) VALUES($1, $2, $3) RETURNING *';
        const values = [nombre, descripcion, imagen_url];
        
        const resultado = await req.db.query(query, values);
        
        res.status(201).json({ 
            mensaje: 'Restaurante creado exitosamente',
            restaurante: resultado.rows[0] 
        });
    } catch (error) {
        console.error('Error al insertar restaurante:', error);
        res.status(500).json({ error: 'Error del servidor al crear restaurante' });
    }
});

module.exports = router;
