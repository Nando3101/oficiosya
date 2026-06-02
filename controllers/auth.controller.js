const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sql, poolPromise } = require('../config/db');
const { enviarBienvenida, enviarResetPassword } = require('../utils/email');
const { OAuth2Client } = require('google-auth-library');
const axios = require('axios');

function generarToken(usuario) {
  return jwt.sign(
    {
      id: usuario.id,
      email: usuario.email,
      rol: usuario.rol
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES || '7d'
    }
  );
}

function limpiarUsuario(usuario) {
  if (!usuario) return null;

  delete usuario.password_hash;
  delete usuario.email_token;
  delete usuario.reset_token;
  delete usuario.reset_token_expiry;
  delete usuario.token_recuperacion;
  delete usuario.token_expiracion;

  usuario.nombre = usuario.nombres || usuario.nombre || '';
  usuario.apellido = usuario.apellidos || usuario.apellido || '';

  return usuario;
}

exports.register = async (req, res) => {
  try {
    const {
      nombre,
      apellido,
      nombres,
      apellidos,
      email,
      telefono,
      zona,
      password
    } = req.body;

    const nombreFinal = nombres || nombre;
    const apellidoFinal = apellidos || apellido;

    if (!nombreFinal || !apellidoFinal || !email || !password) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Complete los campos obligatorios.'
      });
    }

    const pool = await poolPromise;

    const existe = await pool.request()
      .input('email', sql.VarChar(150), email)
      .query(`
        SELECT TOP 1 id
        FROM usuarios
        WHERE email = @email
      `);

    if (existe.recordset.length > 0) {
      return res.status(400).json({
        ok: false,
        mensaje: 'El correo ya está registrado.'
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const emailToken = crypto.randomBytes(32).toString('hex');

    const result = await pool.request()
      .input('nombres', sql.VarChar(100), nombreFinal)
      .input('apellidos', sql.VarChar(100), apellidoFinal)
      .input('email', sql.VarChar(150), email)
      .input('telefono', sql.VarChar(20), telefono || null)
      .input('zona', sql.VarChar(150), zona || null)
      .input('password_hash', sql.VarChar(255), passwordHash)
      .input('email_token', sql.VarChar(255), emailToken)
      .query(`
        INSERT INTO usuarios (
          nombres,
          apellidos,
          email,
          telefono,
          zona,
          password_hash,
          rol,
          estado,
          is_admin,
          email_token,
          email_verificado,
          verificado,
          es_cliente,
          es_trabajador,
          createdat
        )
        OUTPUT INSERTED.*
        VALUES (
          @nombres,
          @apellidos,
          @email,
          @telefono,
          @zona,
          @password_hash,
          'cliente',
          1,
          0,
          @email_token,
          0,
          0,
          1,
          0,
          GETDATE()
        )
      `);

    const usuario = result.recordset[0];

    await enviarBienvenida(usuario, emailToken, usuario.id);

    const token = generarToken(usuario);

    res.status(201).json({
      ok: true,
      mensaje: 'Usuario registrado correctamente.',
      token,
      usuario: limpiarUsuario(usuario)
    });

  } catch (error) {
    console.error('Error en register:', error);

    res.status(500).json({
      ok: false,
      mensaje: 'Error al registrar usuario.',
      error: error.message
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Ingrese correo y contraseña.'
      });
    }

    const pool = await poolPromise;

    const result = await pool.request()
      .input('email', sql.VarChar(150), email)
      .query(`
        SELECT TOP 1 *
        FROM usuarios
        WHERE email = @email
      `);

    if (result.recordset.length === 0) {
      return res.status(401).json({
        ok: false,
        mensaje: 'Correo o contraseña incorrectos.'
      });
    }

    const usuario = result.recordset[0];

    let passwordValida = false;

    if (usuario.password_hash && usuario.password_hash.startsWith('$2')) {
      passwordValida = await bcrypt.compare(password, usuario.password_hash);
    } else {
      passwordValida = password === usuario.password_hash;
    }

    if (!passwordValida) {
      return res.status(401).json({
        ok: false,
        mensaje: 'Correo o contraseña incorrectos.'
      });
    }

    const token = generarToken(usuario);

    res.json({
      ok: true,
      mensaje: 'Inicio de sesión correcto.',
      token,
      usuario: limpiarUsuario(usuario)
    });

  } catch (error) {
    console.error('Error en login:', error);

    res.status(500).json({
      ok: false,
      mensaje: 'Error al iniciar sesión.',
      error: error.message
    });
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const { token, id } = req.query;

    if (!token || !id) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Token o ID faltante.'
      });
    }

    const pool = await poolPromise;

    const result = await pool.request()
      .input('id', sql.Int, Number(id))
      .input('email_token', sql.VarChar(255), token)
      .query(`
        UPDATE usuarios
        SET email_verificado = 1,
            verificado = 1,
            email_token = NULL,
            updatedat = GETDATE()
        OUTPUT INSERTED.*
        WHERE id = @id
          AND email_token = @email_token
      `);

    if (result.recordset.length === 0) {
      return res.status(400).json({
        ok: false,
        mensaje: 'El enlace no es válido o ya fue utilizado.'
      });
    }

    res.json({
      ok: true,
      mensaje: 'Correo verificado correctamente.',
      usuario: limpiarUsuario(result.recordset[0])
    });

  } catch (error) {
    console.error('Error al verificar correo:', error);

    res.status(500).json({
      ok: false,
      mensaje: 'Error al verificar correo.',
      error: error.message
    });
  }
};

exports.resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Correo requerido.'
      });
    }

    const pool = await poolPromise;

    const buscar = await pool.request()
      .input('email', sql.VarChar(150), email)
      .query(`
        SELECT TOP 1 *
        FROM usuarios
        WHERE email = @email
      `);

    if (buscar.recordset.length === 0) {
      return res.status(404).json({
        ok: false,
        mensaje: 'Usuario no encontrado.'
      });
    }

    const usuario = buscar.recordset[0];

    if (usuario.email_verificado || usuario.verificado) {
      return res.json({
        ok: true,
        mensaje: 'El correo ya está verificado.'
      });
    }

    const nuevoToken = crypto.randomBytes(32).toString('hex');

    await pool.request()
      .input('id', sql.Int, usuario.id)
      .input('email_token', sql.VarChar(255), nuevoToken)
      .query(`
        UPDATE usuarios
        SET email_token = @email_token,
            updatedat = GETDATE()
        WHERE id = @id
      `);

    await enviarBienvenida(usuario, nuevoToken, usuario.id);

    res.json({
      ok: true,
      mensaje: 'Correo de verificación reenviado.'
    });

  } catch (error) {
    console.error('Error al reenviar verificación:', error);

    res.status(500).json({
      ok: false,
      mensaje: 'Error al reenviar verificación.',
      error: error.message
    });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const pool = await poolPromise;

    const buscar = await pool.request()
      .input('email', sql.VarChar(150), email)
      .query(`
        SELECT TOP 1 *
        FROM usuarios
        WHERE email = @email
      `);

    if (buscar.recordset.length === 0) {
      return res.json({
        ok: true,
        mensaje: 'Si el correo existe, se enviará un enlace.'
      });
    }

    const usuario = buscar.recordset[0];
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 1000 * 60 * 30);

    await pool.request()
      .input('id', sql.Int, usuario.id)
      .input('reset_token', sql.VarChar(255), resetToken)
      .input('reset_token_expiry', sql.DateTime, expiry)
      .query(`
        UPDATE usuarios
        SET reset_token = @reset_token,
            reset_token_expiry = @reset_token_expiry,
            token_recuperacion = @reset_token,
            token_expiracion = @reset_token_expiry,
            updatedat = GETDATE()
        WHERE id = @id
      `);

    await enviarResetPassword(usuario, resetToken, usuario.id);

    res.json({
      ok: true,
      mensaje: 'Si el correo existe, se enviará un enlace.'
    });

  } catch (error) {
    console.error('Error en forgotPassword:', error);

    res.status(500).json({
      ok: false,
      mensaje: 'Error al solicitar recuperación.',
      error: error.message
    });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { id, token, password, nuevaPassword } = req.body;

    const nueva = password || nuevaPassword;

    if (!id || !token || !nueva) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Datos incompletos.'
      });
    }

    const pool = await poolPromise;

    const buscar = await pool.request()
      .input('id', sql.Int, Number(id))
      .input('reset_token', sql.VarChar(255), token)
      .query(`
        SELECT TOP 1 *
        FROM usuarios
        WHERE id = @id
          AND reset_token = @reset_token
          AND reset_token_expiry > GETDATE()
      `);

    if (buscar.recordset.length === 0) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Token inválido o expirado.'
      });
    }

    const passwordHash = await bcrypt.hash(nueva, 10);

    await pool.request()
      .input('id', sql.Int, Number(id))
      .input('password_hash', sql.VarChar(255), passwordHash)
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

    res.json({
      ok: true,
      mensaje: 'Contraseña actualizada correctamente.'
    });

  } catch (error) {
    console.error('Error en resetPassword:', error);

    res.status(500).json({
      ok: false,
      mensaje: 'Error al cambiar contraseña.',
      error: error.message
    });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const usuarioId = req.user?.id;
    const { passwordActual, nuevaPassword } = req.body;

    if (!usuarioId) {
      return res.status(401).json({
        ok: false,
        mensaje: 'No autorizado.'
      });
    }

    const pool = await poolPromise;

    const buscar = await pool.request()
      .input('id', sql.Int, Number(usuarioId))
      .query(`
        SELECT TOP 1 *
        FROM usuarios
        WHERE id = @id
      `);

    const usuario = buscar.recordset[0];

    const valida = await bcrypt.compare(passwordActual, usuario.password_hash);

    if (!valida) {
      return res.status(400).json({
        ok: false,
        mensaje: 'La contraseña actual no es correcta.'
      });
    }

    const passwordHash = await bcrypt.hash(nuevaPassword, 10);

    await pool.request()
      .input('id', sql.Int, Number(usuarioId))
      .input('password_hash', sql.VarChar(255), passwordHash)
      .query(`
        UPDATE usuarios
        SET password_hash = @password_hash,
            updatedat = GETDATE()
        WHERE id = @id
      `);

    res.json({
      ok: true,
      mensaje: 'Contraseña actualizada correctamente.'
    });

  } catch (error) {
    console.error('Error al cambiar contraseña:', error);

    res.status(500).json({
      ok: false,
      mensaje: 'Error al cambiar contraseña.',
      error: error.message
    });
  }
};
exports.googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Token de Google no recibido.'
      });
    }

    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();

    const googleId = payload.sub;
    const email = payload.email;
    const nombres = payload.given_name || payload.name || 'Usuario';
    const apellidos = payload.family_name || '';
    const fotoUrl = payload.picture || null;

    if (!email) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Google no devolvió un correo válido.'
      });
    }

    const pool = await poolPromise;

    let buscar = await pool.request()
      .input('email', sql.VarChar(150), email)
      .query(`
        SELECT TOP 1 *
        FROM usuarios
        WHERE email = @email
      `);

    let usuario;

    if (buscar.recordset.length > 0) {
      const existente = buscar.recordset[0];

      const actualizado = await pool.request()
        .input('id', sql.Int, existente.id)
        .input('google_id', sql.VarChar(255), googleId)
        .input('foto_url', sql.VarChar(500), fotoUrl)
        .query(`
          UPDATE usuarios
          SET google_id = @google_id,
              provider = 'google',
              foto_url = COALESCE(foto_url, @foto_url),
              email_verificado = 1,
              verificado = 1,
              updatedat = GETDATE()
          OUTPUT INSERTED.*
          WHERE id = @id
        `);

      usuario = actualizado.recordset[0];

    } else {
      const creado = await pool.request()
        .input('nombres', sql.VarChar(100), nombres)
        .input('apellidos', sql.VarChar(100), apellidos)
        .input('email', sql.VarChar(150), email)
        .input('password_hash', sql.VarChar(255), 'GOOGLE_LOGIN')
        .input('google_id', sql.VarChar(255), googleId)
        .input('foto_url', sql.VarChar(500), fotoUrl)
        .query(`
          INSERT INTO usuarios (
            nombres,
            apellidos,
            email,
            password_hash,
            rol,
            estado,
            is_admin,
            es_cliente,
            es_trabajador,
            email_verificado,
            verificado,
            google_id,
            provider,
            foto_url,
            createdat
          )
          OUTPUT INSERTED.*
          VALUES (
            @nombres,
            @apellidos,
            @email,
            @password_hash,
            'cliente',
            1,
            0,
            1,
            0,
            1,
            1,
            @google_id,
            'google',
            @foto_url,
            GETDATE()
          )
        `);

      usuario = creado.recordset[0];
    }

    const token = generarToken(usuario);

    delete usuario.password_hash;
    delete usuario.email_token;
    delete usuario.reset_token;
    delete usuario.reset_token_expiry;

    res.json({
      ok: true,
      mensaje: 'Inicio de sesión con Google correcto.',
      token,
      usuario
    });

  } catch (error) {
    console.error('Error en Google Login:', error);

    res.status(500).json({
      ok: false,
      mensaje: 'Error al iniciar sesión con Google.',
      error: error.message
    });
  }
};
