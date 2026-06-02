const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { OAuth2Client } = require('google-auth-library');
const { pgPool } = require('../config/db');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/* =====================================================
   GENERAR TOKEN JWT
===================================================== */
function generarToken(usuario) {
  return jwt.sign(
    {
      id: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
      is_admin: usuario.is_admin,
      es_cliente: usuario.es_cliente,
      es_trabajador: usuario.es_trabajador
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES || '7d'
    }
  );
}

/* =====================================================
   LIMPIAR USUARIO
===================================================== */
function limpiarUsuario(usuario) {
  if (!usuario) return null;

  const copia = { ...usuario };

  delete copia.password_hash;
  delete copia.email_token;
  delete copia.reset_token;
  delete copia.reset_token_expiry;

  return copia;
}

/* =====================================================
   CREAR TRANSPORTER DE CORREO
===================================================== */
function crearTransporter() {
  const user = process.env.EMAIL_USER || process.env.MAIL_USER;
  const pass = process.env.EMAIL_PASS || process.env.MAIL_PASS;

  if (!user || !pass) {
    console.log('Email no configurado. Se omitirán envíos de correo.');
    return null;
  }

  return nodemailer.createTransport({
    service: process.env.MAIL_SERVICE || 'gmail',
    auth: {
      user,
      pass
    }
  });
}

/* =====================================================
   ENVIAR CORREO DE VERIFICACIÓN
===================================================== */
async function enviarCorreoVerificacion(email, token) {
  const transporter = crearTransporter();

  if (!transporter) return;

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const link = `${frontendUrl}/pages/verificar-email.html?token=${encodeURIComponent(token)}`;

  await transporter.sendMail({
    from:
      process.env.MAIL_FROM ||
      `OficiosYA <${process.env.EMAIL_USER || process.env.MAIL_USER}>`,
    to: email,
    subject: 'Verificación de cuenta - OficiosYA',
    html: `
      <h2>Verificación de cuenta</h2>
      <p>Gracias por registrarte en OficiosYA.</p>
      <p>Haz clic en el siguiente enlace para verificar tu cuenta:</p>
      <a href="${link}">${link}</a>
    `
  });
}

/* =====================================================
   REGISTRO
===================================================== */
exports.registro = async (req, res) => {
  try {
    let {
      nombres,
      apellidos,
      email,
      telefono,
      password,
      ciudad,
      zona,
      direccion,
      rol
    } = req.body;

    nombres = nombres || req.body.nombre;
    apellidos = apellidos || req.body.apellido;

    if (!nombres || !apellidos || !email || !password) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Nombres, apellidos, correo y contraseña son obligatorios.'
      });
    }

    const existe = await pgPool.query(
      `
      SELECT id
      FROM usuarios
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1
      `,
      [email]
    );

    if (existe.rows.length > 0) {
      return res.status(400).json({
        ok: false,
        mensaje: 'El correo ya está registrado.'
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const emailToken = crypto.randomBytes(32).toString('hex');

    let rolFinal = rol || 'cliente';
    let esCliente = 1;
    let esTrabajador = 0;

    if (rolFinal === 'trabajador') {
      esCliente = 0;
      esTrabajador = 1;
    }

    if (rolFinal === 'cliente_trabajador') {
      esCliente = 1;
      esTrabajador = 1;
    }

    const nuevoUsuario = await pgPool.query(
      `
      INSERT INTO usuarios (
        nombres,
        apellidos,
        email,
        telefono,
        zona,
        ciudad,
        direccion,
        password_hash,
        rol,
        estado,
        is_admin,
        es_cliente,
        es_trabajador,
        email_verificado,
        verificado,
        email_token,
        estado_conexion,
        createdat,
        updatedat
      )
      VALUES (
        $1, $2, LOWER($3), $4, $5, $6, $7, $8,
        $9, 1, 0, $10, $11, 0, 0, $12, 'activo', NOW(), NOW()
      )
      RETURNING *
      `,
      [
        nombres,
        apellidos,
        email,
        telefono || null,
        zona || null,
        ciudad || null,
        direccion || null,
        passwordHash,
        rolFinal,
        esCliente,
        esTrabajador,
        emailToken
      ]
    );

    try {
      await enviarCorreoVerificacion(email, emailToken);
    } catch (errorCorreo) {
      console.log('No se pudo enviar correo de verificación:', errorCorreo.message);
    }

    const usuario = limpiarUsuario(nuevoUsuario.rows[0]);
    const token = generarToken(usuario);

    return res.status(201).json({
      ok: true,
      mensaje: 'Usuario registrado correctamente.',
      usuario,
      token,
      data: {
        usuario,
        token
      }
    });
  } catch (error) {
    console.error('Error en registro:', error);

    return res.status(500).json({
      ok: false,
      mensaje: 'Error al registrar usuario.',
      error: error.message
    });
  }
};

/* =====================================================
   LOGIN NORMAL
===================================================== */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Correo y contraseña son obligatorios.'
      });
    }

    const result = await pgPool.query(
      `
      SELECT *
      FROM usuarios
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1
      `,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        ok: false,
        mensaje: 'Credenciales incorrectas.'
      });
    }

    const usuarioDb = result.rows[0];

    if (Number(usuarioDb.estado) !== 1) {
      return res.status(403).json({
        ok: false,
        mensaje: 'Usuario inactivo.'
      });
    }

    const passwordValido = await bcrypt.compare(
      password,
      usuarioDb.password_hash
    );

    if (!passwordValido) {
      return res.status(401).json({
        ok: false,
        mensaje: 'Credenciales incorrectas.'
      });
    }

    await pgPool.query(
      `
      UPDATE usuarios
      SET ultima_conexion = NOW(),
          estado_conexion = 'activo',
          updatedat = NOW()
      WHERE id = $1
      `,
      [usuarioDb.id]
    );

    const usuario = limpiarUsuario(usuarioDb);
    const token = generarToken(usuario);

    return res.json({
      ok: true,
      mensaje: 'Inicio de sesión correcto.',
      usuario,
      token,
      data: {
        usuario,
        token
      }
    });
  } catch (error) {
    console.error('Error en login:', error);

    return res.status(500).json({
      ok: false,
      mensaje: 'Error al iniciar sesión.',
      error: error.message
    });
  }
};

/* =====================================================
   LOGIN CON GOOGLE
===================================================== */
exports.googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Credencial de Google no proporcionada.'
      });
    }

    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(500).json({
        ok: false,
        mensaje: 'Google login no está configurado en el servidor.'
      });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();

    const {
      sub: googleId,
      email,
      given_name: nombres,
      family_name: apellidos,
      picture: fotoUrl
    } = payload;

    if (!email) {
      return res.status(400).json({
        ok: false,
        mensaje: 'No se pudo obtener el correo de Google.'
      });
    }

    let result = await pgPool.query(
      `
      SELECT *
      FROM usuarios
      WHERE google_id = $1
         OR LOWER(email) = LOWER($2)
      LIMIT 1
      `,
      [googleId, email]
    );

    let usuarioDb;

    if (result.rows.length > 0) {
      const updated = await pgPool.query(
        `
        UPDATE usuarios
        SET google_id = $1,
            provider = 'google',
            foto_url = COALESCE(foto_url, $2),
            ultima_conexion = NOW(),
            estado_conexion = 'activo',
            updatedat = NOW()
        WHERE id = $3
        RETURNING *
        `,
        [googleId, fotoUrl || null, result.rows[0].id]
      );

      usuarioDb = updated.rows[0];
    } else {
      const passwordGoogle = await bcrypt.hash(
        `google:${googleId}:${Date.now()}`,
        10
      );

      const inserted = await pgPool.query(
        `
        INSERT INTO usuarios (
          nombres,
          apellidos,
          email,
          password_hash,
          google_id,
          provider,
          foto_url,
          rol,
          estado,
          is_admin,
          es_cliente,
          es_trabajador,
          email_verificado,
          verificado,
          estado_conexion,
          ultima_conexion,
          createdat,
          updatedat
        )
        VALUES (
          $1, $2, LOWER($3), $4, $5, 'google', $6,
          'cliente', 1, 0, 1, 0, 1, 1, 'activo', NOW(), NOW(), NOW()
        )
        RETURNING *
        `,
        [
          nombres || email.split('@')[0],
          apellidos || '',
          email,
          passwordGoogle,
          googleId,
          fotoUrl || null
        ]
      );

      usuarioDb = inserted.rows[0];
    }

    if (Number(usuarioDb.estado) !== 1) {
      return res.status(403).json({
        ok: false,
        mensaje: 'Usuario inactivo.'
      });
    }

    const usuario = limpiarUsuario(usuarioDb);
    const token = generarToken(usuario);

    return res.json({
      ok: true,
      mensaje: 'Inicio de sesión con Google correcto.',
      usuario,
      token,
      data: {
        usuario,
        token
      }
    });
  } catch (error) {
    console.error('Error en Google login:', error);

    return res.status(500).json({
      ok: false,
      mensaje: 'Error al iniciar sesión con Google.',
      error: error.message
    });
  }
};

/* =====================================================
   VERIFICAR CORREO POR PARAMS
   Ruta ejemplo: /api/auth/verificar/:token
===================================================== */
exports.verificarCorreo = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Token no proporcionado.'
      });
    }

    const result = await pgPool.query(
      `
      UPDATE usuarios
      SET email_verificado = 1,
          verificado = 1,
          email_token = NULL,
          updatedat = NOW()
      WHERE email_token = $1
      RETURNING id, email
      `,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Token inválido o expirado.'
      });
    }

    return res.json({
      ok: true,
      mensaje: 'Correo verificado correctamente.',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error verificando correo:', error);

    return res.status(500).json({
      ok: false,
      mensaje: 'Error al verificar correo.',
      error: error.message
    });
  }
};

/* =====================================================
   VERIFICAR CORREO POR QUERY
   Ruta ejemplo: /api/auth/verify-email?token=...
===================================================== */
exports.verificarCorreoQuery = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Token no proporcionado.'
      });
    }

    const result = await pgPool.query(
      `
      UPDATE usuarios
      SET email_verificado = 1,
          verificado = 1,
          email_token = NULL,
          updatedat = NOW()
      WHERE email_token = $1
      RETURNING id, email
      `,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Token inválido o expirado.'
      });
    }

    return res.json({
      ok: true,
      mensaje: 'Correo verificado correctamente.',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error verificando correo:', error);

    return res.status(500).json({
      ok: false,
      mensaje: 'Error al verificar correo.',
      error: error.message
    });
  }
};

/* =====================================================
   REENVIAR VERIFICACIÓN
===================================================== */
exports.reenviarVerificacion = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        ok: false,
        mensaje: 'El correo es obligatorio.'
      });
    }

    const result = await pgPool.query(
      `
      SELECT id, email, email_verificado
      FROM usuarios
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1
      `,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        mensaje: 'Usuario no encontrado.'
      });
    }

    if (Number(result.rows[0].email_verificado) === 1) {
      return res.json({
        ok: true,
        mensaje: 'El correo ya está verificado.'
      });
    }

    const nuevoToken = crypto.randomBytes(32).toString('hex');

    await pgPool.query(
      `
      UPDATE usuarios
      SET email_token = $1,
          updatedat = NOW()
      WHERE id = $2
      `,
      [nuevoToken, result.rows[0].id]
    );

    try {
      await enviarCorreoVerificacion(email, nuevoToken);
    } catch (errorCorreo) {
      console.log('No se pudo reenviar correo:', errorCorreo.message);
    }

    return res.json({
      ok: true,
      mensaje: 'Correo de verificación reenviado.'
    });
  } catch (error) {
    console.error('Error reenviando verificación:', error);

    return res.status(500).json({
      ok: false,
      mensaje: 'Error al reenviar verificación.',
      error: error.message
    });
  }
};

/* =====================================================
   SOLICITAR RESET DE CONTRASEÑA
===================================================== */
exports.solicitarResetPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        ok: false,
        mensaje: 'El correo es obligatorio.'
      });
    }

    const usuario = await pgPool.query(
      `
      SELECT id, email
      FROM usuarios
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1
      `,
      [email]
    );

    if (usuario.rows.length === 0) {
      return res.json({
        ok: true,
        mensaje: 'Si el correo existe, se enviarán instrucciones.'
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiracion = new Date(Date.now() + 1000 * 60 * 30);

    await pgPool.query(
      `
      UPDATE usuarios
      SET reset_token = $1,
          reset_token_expiry = $2,
          updatedat = NOW()
      WHERE id = $3
      `,
      [resetToken, expiracion, usuario.rows[0].id]
    );

    const transporter = crearTransporter();

    if (transporter) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const link = `${frontendUrl}/pages/nueva-password.html?token=${encodeURIComponent(resetToken)}`;

      await transporter.sendMail({
        from:
          process.env.MAIL_FROM ||
          `OficiosYA <${process.env.EMAIL_USER || process.env.MAIL_USER}>`,
        to: email,
        subject: 'Recuperar contraseña - OficiosYA',
        html: `
          <h2>Recuperar contraseña</h2>
          <p>Haz clic en el siguiente enlace para cambiar tu contraseña:</p>
          <a href="${link}">${link}</a>
          <p><small>Este enlace expira en 30 minutos.</small></p>
        `
      });
    }

    return res.json({
      ok: true,
      mensaje: 'Si el correo existe, se enviarán instrucciones.'
    });
  } catch (error) {
    console.error('Error solicitando reset:', error);

    return res.status(500).json({
      ok: false,
      mensaje: 'Error solicitando recuperación.',
      error: error.message
    });
  }
};

/* =====================================================
   RESET PASSWORD CON TOKEN
===================================================== */
exports.resetPassword = async (req, res) => {
  try {
    const { token, password, nuevaPassword } = req.body;

    const nuevaClave = password || nuevaPassword;

    if (!token || !nuevaClave) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Token y nueva contraseña son obligatorios.'
      });
    }

    if (nuevaClave.length < 8) {
      return res.status(400).json({
        ok: false,
        mensaje: 'La nueva contraseña debe tener al menos 8 caracteres.'
      });
    }

    const usuario = await pgPool.query(
      `
      SELECT id
      FROM usuarios
      WHERE reset_token = $1
        AND reset_token_expiry > NOW()
      LIMIT 1
      `,
      [token]
    );

    if (usuario.rows.length === 0) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Token inválido o expirado.'
      });
    }

    const hash = await bcrypt.hash(nuevaClave, 10);

    await pgPool.query(
      `
      UPDATE usuarios
      SET password_hash = $1,
          reset_token = NULL,
          reset_token_expiry = NULL,
          updatedat = NOW()
      WHERE id = $2
      `,
      [hash, usuario.rows[0].id]
    );

    return res.json({
      ok: true,
      mensaje: 'Contraseña actualizada correctamente.'
    });
  } catch (error) {
    console.error('Error cambiando contraseña:', error);

    return res.status(500).json({
      ok: false,
      mensaje: 'Error al cambiar contraseña.',
      error: error.message
    });
  }
};

/* =====================================================
   CAMBIAR CONTRASEÑA DESDE MI PANEL
===================================================== */
exports.cambiarPassword = async (req, res) => {
  try {
    const usuarioId = req.user.id;

    const password_actual =
      req.body.password_actual ||
      req.body.passwordActual ||
      req.body.actual ||
      req.body.currentPassword ||
      req.body.contrasenaActual;

    const password_nuevo =
      req.body.password_nuevo ||
      req.body.nuevaPassword ||
      req.body.nueva ||
      req.body.password ||
      req.body.newPassword ||
      req.body.contrasenaNueva;

    const confirmarPassword =
      req.body.confirmarPassword ||
      req.body.password_confirmar ||
      req.body.confirmacion ||
      req.body.confirmar ||
      req.body.confirmPassword ||
      req.body.confirmar_password ||
      password_nuevo;

    if (!password_actual || !password_nuevo) {
      return res.status(400).json({
        ok: false,
        mensaje: 'La contraseña actual y la nueva son obligatorias.'
      });
    }

    if (password_nuevo.length < 8) {
      return res.status(400).json({
        ok: false,
        mensaje: 'La nueva contraseña debe tener al menos 8 caracteres.'
      });
    }

    if (password_nuevo !== confirmarPassword) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Las contraseñas no coinciden.'
      });
    }

    const result = await pgPool.query(
      `
      SELECT id, password_hash
      FROM usuarios
      WHERE id = $1
      LIMIT 1
      `,
      [usuarioId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        mensaje: 'Usuario no encontrado.'
      });
    }

    const passwordValido = await bcrypt.compare(
      password_actual,
      result.rows[0].password_hash
    );

    if (!passwordValido) {
      return res.status(401).json({
        ok: false,
        mensaje: 'La contraseña actual es incorrecta.'
      });
    }

    const nuevoHash = await bcrypt.hash(password_nuevo, 10);

    await pgPool.query(
      `
      UPDATE usuarios
      SET password_hash = $1,
          updatedat = NOW()
      WHERE id = $2
      `,
      [nuevoHash, usuarioId]
    );

    return res.json({
      ok: true,
      mensaje: 'Contraseña actualizada correctamente.'
    });
  } catch (error) {
    console.error('Error cambiando contraseña:', error);

    return res.status(500).json({
      ok: false,
      mensaje: 'Error al cambiar contraseña.',
      error: error.message
    });
  }
};

/* =====================================================
   OBTENER USUARIO AUTENTICADO
===================================================== */
exports.me = async (req, res) => {
  try {
    const result = await pgPool.query(
      `
      SELECT *
      FROM usuarios
      WHERE id = $1
      LIMIT 1
      `,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        mensaje: 'Usuario no encontrado.'
      });
    }

    const usuario = limpiarUsuario(result.rows[0]);

    return res.json({
      ok: true,
      usuario,
      data: {
        usuario
      }
    });
  } catch (error) {
    console.error('Error obteniendo usuario:', error);

    return res.status(500).json({
      ok: false,
      mensaje: 'Error obteniendo usuario.',
      error: error.message
    });
  }
};