const { sql, poolPromise } = require('../config/db');

const TrabajoModel = {
  async listarPorTrabajador(trabajadorId) {
    const pool = await poolPromise;

    const result = await pool.request()
      .input('trabajador_id', sql.Int, Number(trabajadorId))
      .query(`
        SELECT 
          id,
          trabajador_id,
          url_imagen,
          public_id,
          descripcion,
          createdat
        FROM trabajos_realizados
        WHERE trabajador_id = @trabajador_id
        ORDER BY createdat DESC
      `);

    return result.recordset;
  },

  async crear({ trabajador_id, url_imagen, public_id, descripcion }) {
    const pool = await poolPromise;

    const result = await pool.request()
      .input('trabajador_id', sql.Int, Number(trabajador_id))
      .input('url_imagen', sql.VarChar(500), url_imagen)
      .input('public_id', sql.VarChar(255), public_id || null)
      .input('descripcion', sql.VarChar(sql.MAX), descripcion || null)
      .query(`
        INSERT INTO trabajos_realizados (
          trabajador_id,
          url_imagen,
          public_id,
          descripcion,
          createdat
        )
        OUTPUT INSERTED.*
        VALUES (
          @trabajador_id,
          @url_imagen,
          @public_id,
          @descripcion,
          GETDATE()
        )
      `);

    return result.recordset[0];
  },

  async obtenerPorId(id) {
    const pool = await poolPromise;

    const result = await pool.request()
      .input('id', sql.Int, Number(id))
      .query(`
        SELECT TOP 1 *
        FROM trabajos_realizados
        WHERE id = @id
      `);

    return result.recordset[0] || null;
  },

  async eliminar(id, trabajadorId) {
    const pool = await poolPromise;

    const result = await pool.request()
      .input('id', sql.Int, Number(id))
      .input('trabajador_id', sql.Int, Number(trabajadorId))
      .query(`
        DELETE FROM trabajos_realizados
        OUTPUT DELETED.*
        WHERE id = @id
          AND trabajador_id = @trabajador_id
      `);

    return result.recordset[0] || null;
  }
};

module.exports = TrabajoModel;