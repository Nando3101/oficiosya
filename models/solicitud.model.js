const pool = require('../config/db');

const SolicitudModel = {

  // ── CREAR ────────────────────────────────────────────
  async crear({ cliente_id, categoria_id, titulo, descripcion, zona, presupuesto, fecha_preferida, urgencia }) {
    const res = await pool.query(
      `INSERT INTO solicitudes (cliente_id, categoria_id, titulo, descripcion, zona, presupuesto, fecha_preferida, urgencia)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [cliente_id, categoria_id || null, titulo, descripcion || '', zona || '', presupuesto || null, fecha_preferida || null, urgencia || 'normal']
    );
    return res.rows[0];
  },

  // ── LISTAR ABIERTAS (todas) ──────────────────────────
  async listarAbiertas() {
    const res = await pool.query(
      `SELECT s.*, u.nombre, u.apellido, u.zona as zona_cliente,
              c.nombre as categoria_nombre
       FROM solicitudes s
       JOIN usuarios u ON s.cliente_id = u.id
       LEFT JOIN categorias c ON s.categoria_id = c.id
       WHERE s.estado = 'abierta'
       ORDER BY s.createdat DESC`
    );
    return res.rows;
  },

  // ── MIS SOLICITUDES (cliente) ────────────────────────
  async listarPorCliente(cliente_id) {
    const res = await pool.query(
      `SELECT s.*, c.nombre as categoria_nombre
       FROM solicitudes s
       LEFT JOIN categorias c ON s.categoria_id = c.id
       WHERE s.cliente_id = $1
       ORDER BY s.createdat DESC`,
      [cliente_id]
    );
    return res.rows;
  },

  // ── BUSCAR POR ID ────────────────────────────────────
  async findById(id) {
    const res = await pool.query(
      `SELECT s.*, u.nombre, u.apellido, c.nombre as categoria_nombre
       FROM solicitudes s
       JOIN usuarios u ON s.cliente_id = u.id
       LEFT JOIN categorias c ON s.categoria_id = c.id
       WHERE s.id = $1`,
      [id]
    );
    return res.rows[0] || null;
  },

  // ── EDITAR (dueño) ───────────────────────────────────
  async editar(id, cliente_id, { categoria_id, titulo, descripcion, zona, presupuesto, fecha_preferida, urgencia }) {
    const res = await pool.query(
      `UPDATE solicitudes
       SET categoria_id=$1, titulo=$2, descripcion=$3, zona=$4, presupuesto=$5,
           fecha_preferida=$6, urgencia=$7, updatedat=NOW()
       WHERE id=$8 AND cliente_id=$9
       RETURNING *`,
      [categoria_id || null, titulo, descripcion || '', zona || '', presupuesto || null,
       fecha_preferida || null, urgencia || 'normal', id, cliente_id]
    );
    return res.rows[0];
  },

  // ── ELIMINAR (dueño) – CON VERIFICACIÓN DE POSTULACIONES ──
  async eliminar(id, cliente_id) {
    // Verificar si tiene postulaciones
    const check = await pool.query(
      'SELECT id FROM postulaciones WHERE solicitud_id = $1 LIMIT 1',
      [id]
    );
    if (check.rows.length > 0) {
      // Si tiene postulaciones, la cancelamos en lugar de eliminar físicamente
      await this.cancelar(id, cliente_id);
      return { cancelado: true };
    }
    // Si no tiene postulaciones, eliminamos físicamente
    await pool.query('DELETE FROM solicitudes WHERE id = $1 AND cliente_id = $2', [id, cliente_id]);
    return { cancelado: false };
  },

  // ── CANCELAR (dueño) ─────────────────────────────────
  async cancelar(id, cliente_id) {
    await pool.query(
      `UPDATE solicitudes SET estado = 'cancelada', updatedat = NOW()
       WHERE id = $1 AND cliente_id = $2`,
      [id, cliente_id]
    );
  },

  // ── POSTULARSE (trabajador) ──────────────────────────
async aplicar(solicitud_id, trabajador_id, mensaje, precio_oferta, disponibilidad) {
  const existente = await pool.query(
    'SELECT id, estado FROM postulaciones WHERE solicitud_id=$1 AND trabajador_id=$2',
    [solicitud_id, trabajador_id]
  );

  if (existente.rows.length > 0) {
    if (existente.rows[0].estado === 'cancelado') {
      // Permitir re-postularse actualizando el registro existente
      const res = await pool.query(
        `UPDATE postulaciones SET estado='pendiente', mensaje=$1, precio_oferta=$2, disponibilidad=$3, createdat=NOW()
         WHERE solicitud_id=$4 AND trabajador_id=$5 RETURNING *`,
        [mensaje || null, precio_oferta || null, disponibilidad || null, solicitud_id, trabajador_id]
      );
      return res.rows[0];
    }
    throw new Error('Ya te has postulado a esta solicitud.');
  }

  const res = await pool.query(
    `INSERT INTO postulaciones (solicitud_id, trabajador_id, mensaje, precio_oferta, disponibilidad)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [solicitud_id, trabajador_id, mensaje || null, precio_oferta || null, disponibilidad || null]
  );
  return res.rows[0];
},

  // ── CANCELAR POSTULACIÓN (trabajador) ────────────────
  async cancelarPostulacion(solicitud_id, trabajador_id) {
    await pool.query(
      `UPDATE postulaciones SET estado = 'cancelado' WHERE solicitud_id = $1 AND trabajador_id = $2`,
      [solicitud_id, trabajador_id]
    );
  },

  // ── LISTAR POSTULACIONES DE UNA SOLICITUD (dueño) ───
  async listarPostulaciones(solicitud_id) {
    const res = await pool.query(
      `SELECT p.*, u.nombre, u.apellido, u.foto_url, u.telefono, pf.titulo as perfil_titulo, pf.rating_promedio
       FROM postulaciones p
       JOIN usuarios u ON p.trabajador_id = u.id
       LEFT JOIN perfiles_trabajador pf ON pf.usuario_id = u.id
       WHERE p.solicitud_id = $1
       ORDER BY p.createdat DESC`,
      [solicitud_id]
    );
    return res.rows;
  },

  // ── GESTIONAR POSTULACIÓN (aceptar/rechazar) ────────
  async gestionarPostulacion(postulacion_id, estado) {
    const res = await pool.query(
      `UPDATE postulaciones SET estado = $1 WHERE id = $2 RETURNING *`,
      [estado, postulacion_id]
    );
    if (res.rows.length === 0) throw new Error('Postulación no encontrada.');
    return res.rows[0];
  },

  // ── INICIAR TRABAJO (trabajador) ─────────────────────
  async iniciarTrabajo(id, trabajador_id) {
    const res = await pool.query(
      `UPDATE solicitudes 
       SET estado = 'en_curso', updatedat = NOW()
       WHERE id = $1 AND estado = 'confirmada' AND trabajador_id = $2
       RETURNING *`,
      [id, trabajador_id]
    );
    if (res.rows.length === 0) throw new Error('No se puede iniciar el trabajo. Estado inválido o no eres el trabajador asignado.');
    return res.rows[0];
  },

  // ── FINALIZAR TRABAJO (trabajador) ───────────────────
  async finalizarTrabajo(id, trabajador_id) {
    const res = await pool.query(
      `UPDATE solicitudes 
       SET estado = 'finalizado', updatedat = NOW()
       WHERE id = $1 AND estado = 'en_curso' AND trabajador_id = $2
       RETURNING *`,
      [id, trabajador_id]
    );
    if (res.rows.length === 0) throw new Error('No se puede finalizar. El trabajo no está en curso o no eres el responsable.');
    return res.rows[0];
  }

  
};

module.exports = SolicitudModel;