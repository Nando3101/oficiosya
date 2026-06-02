const { sql, poolPromise } = require('../config/db');

function normalizarUsuario(u) {
  if (!u) return null;

  return {
    ...u,
    nombre: u.nombre ?? u.nombres ?? '',
    apellido: u.apellido ?? u.apellidos ?? '',
    nombres: u.nombres ?? u.nombre ?? '',
    apellidos: u.apellidos ?? u.apellido ?? '',
    activo: u.activo === undefined || u.activo === null ? true : Boolean(u.activo),
    bloqueado: Boolean(u.bloqueado || false),
    suspendido: Boolean(u.suspendido || false),
    email_verificado: Boolean(u.email_verificado || false),
    is_admin: Boolean(u.is_admin || false),
    es_trabajador: Boolean(u.es_trabajador || false),
    es_cliente: u.es_cliente === undefined || u.es_cliente === null ? true : Boolean(u.es_cliente)
  };
}

const UsuarioModel = {
  async findByEmail(email) {
    const pool = await poolPromise;

    const res = await pool.request()
      .input('email', sql.VarChar(150), email)
      .query(`
        SELECT TOP 1 *
        FROM usuarios
        WHERE email = @email
      `);

    return normalizarUsuario(res.recordset[0]);
  },

  async findById(id) {
    const pool = await poolPromise;

    const res = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT TOP 1 *
        FROM usuarios
        WHERE id = @id
      `);

    return normalizarUsuario(res.recordset[0]);
  },

  async findByResetToken(token) {
    const pool = await poolPromise;

    const res = await pool.request()
      .input('token', sql.VarChar(255), token)
      .query(`
        SELECT TOP 1 *
        FROM usuarios
        WHERE reset_token = @token
          AND reset_token_expiry > GETDATE()
      `);

    return normalizarUsuario(res.recordset[0]);
  },

  async create({
    nombre,
    apellido,
    email,
    password_hash,
    telefono,
    zona,
    email_token,
    email_verificado = false,
    activo = true
  }) {
    const pool = await poolPromise;

    const res = await pool.request()
      .input('nombres', sql.VarChar(100), nombre || '')
      .input('apellidos', sql.VarChar(100), apellido || '')
      .input('email', sql.VarChar(150), email)
      .input('password_hash', sql.VarChar(255), password_hash || null)
      .input('telefono', sql.VarChar(20), telefono || null)
      .input('zona', sql.VarChar(150), zona || null)
      .input('email_token', sql.VarChar(255), email_token || null)
      .input('email_verificado', sql.Bit, email_verificado ? 1 : 0)
      .input('activo', sql.Bit, activo ? 1 : 0)
      .query(`
        INSERT INTO usuarios (
          nombres,
          apellidos,
          email,
          password_hash,
          telefono,
          zona,
          email_token,
          email_verificado,
          activo,
          estado,
          rol,
          es_cliente,
          es_trabajador
        )
        OUTPUT INSERTED.*
        VALUES (
          @nombres,
          @apellidos,
          @email,
          @password_hash,
          @telefono,
          @zona,
          @email_token,
          @email_verificado,
          @activo,
          1,
          'cliente',
          1,
          0
        )
      `);

    return normalizarUsuario(res.recordset[0]);
  },

  async updatePassword(id, password_hash) {
    const pool = await poolPromise;

    await pool.request()
      .input('id', sql.Int, id)
      .input('password_hash', sql.VarChar(255), password_hash)
      .query(`
        UPDATE usuarios
        SET password_hash = @password_hash,
            reset_token = NULL,
            reset_token_expiry = NULL,
            token_recuperacion = NULL,
            token_expiracion = NULL,
            updatedat = GETDATE()
        WHERE id = @id
      `);
  },

  async setResetToken(id, token, expiry) {
    const pool = await poolPromise;

    await pool.request()
      .input('id', sql.Int, id)
      .input('token', sql.VarChar(255), token)
      .input('expiry', sql.DateTime, expiry)
      .query(`
        UPDATE usuarios
        SET reset_token = @token,
            reset_token_expiry = @expiry,
            token_recuperacion = @token,
            token_expiracion = @expiry,
            updatedat = GETDATE()
        WHERE id = @id
      `);
  },

  async setEmailToken(id, email_token) {
    const pool = await poolPromise;

    await pool.request()
      .input('id', sql.Int, id)
      .input('email_token', sql.VarChar(255), email_token)
      .query(`
        UPDATE usuarios
        SET email_token = @email_token,
            updatedat = GETDATE()
        WHERE id = @id
      `);
  },

  async verificarEmail(id) {
    const pool = await poolPromise;

    await pool.request()
      .input('id', sql.Int, id)
      .query(`
        UPDATE usuarios
        SET email_verificado = 1,
            email_token = NULL,
            verificado = 1,
            updatedat = GETDATE()
        WHERE id = @id
      `);
  },

  async updateFoto(id, foto_url, foto_public_id) {
    const pool = await poolPromise;

    const res = await pool.request()
      .input('id', sql.Int, id)
      .input('foto_url', sql.VarChar(500), foto_url || null)
      .input('foto_public_id', sql.VarChar(255), foto_public_id || null)
      .query(`
        UPDATE usuarios
        SET foto_url = @foto_url,
            foto_public_id = @foto_public_id,
            updatedat = GETDATE()
        OUTPUT INSERTED.*
        WHERE id = @id
      `);

    return normalizarUsuario(res.recordset[0]);
  },

  async updatePerfil(id, { nombre, apellido, telefono, zona }) {
    const pool = await poolPromise;

    const res = await pool.request()
      .input('id', sql.Int, id)
      .input('nombres', sql.VarChar(100), nombre || '')
      .input('apellidos', sql.VarChar(100), apellido || '')
      .input('telefono', sql.VarChar(20), telefono || null)
      .input('zona', sql.VarChar(150), zona || null)
      .query(`
        UPDATE usuarios
        SET nombres = @nombres,
            apellidos = @apellidos,
            telefono = @telefono,
            zona = @zona,
            updatedat = GETDATE()
        OUTPUT INSERTED.*
        WHERE id = @id
      `);

    return normalizarUsuario(res.recordset[0]);
  },

  sanitize(u) {
    const usuario = normalizarUsuario(u);

    if (!usuario) return null;

    const {
      password_hash,
      reset_token,
      reset_token_expiry,
      token_recuperacion,
      token_expiracion,
      email_token,
      ...safe
    } = usuario;

    return safe;
  }
};

module.exports = UsuarioModel;