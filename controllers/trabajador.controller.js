const { sql, poolPromise } = require('../config/db');

exports.listarProfesionales = async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool.request().query(`
      SELECT 
        u.id,
        u.nombres,
        u.apellidos,
        u.email,
        u.telefono,
        u.zona,
        u.foto_url,
        u.rol,
        u.es_trabajador,
        u.email_verificado,
        u.verificado,
        p.id AS perfil_id,
        p.descripcion,
        p.experiencia,
        p.ubicacion,
        p.tarifa_referencial,
        p.disponible,
        c.id AS categoria_id,
        c.nombre AS categoria,
        ISNULL(AVG(CAST(cal.puntuacion AS FLOAT)), 0) AS calificacion_promedio,
        COUNT(cal.id) AS total_calificaciones
      FROM usuarios u
      LEFT JOIN perfiles_trabajador p ON p.usuario_id = u.id
      LEFT JOIN categorias c ON c.id = p.categoria_id
      LEFT JOIN calificaciones cal ON cal.calificado_id = u.id
      WHERE u.rol = 'trabajador'
         OR u.es_trabajador = 1
         OR p.id IS NOT NULL
      GROUP BY 
        u.id,
        u.nombres,
        u.apellidos,
        u.email,
        u.telefono,
        u.zona,
        u.foto_url,
        u.rol,
        u.es_trabajador,
        u.email_verificado,
        u.verificado,
        p.id,
        p.descripcion,
        p.experiencia,
        p.ubicacion,
        p.tarifa_referencial,
        p.disponible,
        c.id,
        c.nombre
      ORDER BY u.nombres ASC
    `);

    res.json({
      ok: true,
      profesionales: result.recordset,
      trabajadores: result.recordset
    });

  } catch (error) {
    console.error('Error al cargar profesionales:', error);

    res.status(500).json({
      ok: false,
      mensaje: 'Error al cargar profesionales.',
      error: error.message,
      profesionales: [],
      trabajadores: []
    });
  }
};

exports.detalleProfesional = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;

    const result = await pool.request()
      .input('id', sql.Int, Number(id))
      .query(`
        SELECT TOP 1
          u.id,
          u.nombres,
          u.apellidos,
          u.email,
          u.telefono,
          u.zona,
          u.foto_url,
          u.rol,
          u.email_verificado,
          u.verificado,
          p.id AS perfil_id,
          p.descripcion,
          p.experiencia,
          p.ubicacion,
          p.tarifa_referencial,
          p.disponible,
          c.id AS categoria_id,
          c.nombre AS categoria
        FROM usuarios u
        LEFT JOIN perfiles_trabajador p ON p.usuario_id = u.id
        LEFT JOIN categorias c ON c.id = p.categoria_id
        WHERE u.id = @id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        ok: false,
        mensaje: 'Profesional no encontrado.'
      });
    }

    res.json({
      ok: true,
      profesional: result.recordset[0],
      trabajador: result.recordset[0]
    });

  } catch (error) {
    console.error('Error al obtener profesional:', error);

    res.status(500).json({
      ok: false,
      mensaje: 'Error al obtener profesional.',
      error: error.message
    });
  }
};