require('dotenv').config();

const nodemailer = require('nodemailer');
const os = require('os');

let transporter = null;

function obtenerIPLocal() {
  const interfaces = os.networkInterfaces();

  for (const nombre in interfaces) {
    for (const net of interfaces[nombre]) {
      if (
        net.family === 'IPv4' &&
        !net.internal &&
        !net.address.startsWith('169.254')
      ) {
        return net.address;
      }
    }
  }

  return 'localhost';
}

function obtenerFrontendUrl() {
  const puertoFrontend = process.env.FRONTEND_PORT || 5500;

  if (process.env.FRONTEND_URL && process.env.FRONTEND_URL !== 'auto') {
    return process.env.FRONTEND_URL;
  }

  const ip = obtenerIPLocal();

  return `http://${ip}:${puertoFrontend}`;
}

function emailConfigurado() {
  return Boolean(process.env.MAIL_USER && process.env.MAIL_PASS);
}

if (emailConfigurado()) {
  transporter = nodemailer.createTransport({
    service: process.env.MAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS
    }
  });

  console.log('✅ Email configurado correctamente.');
} else {
  console.log('⚠️ Email no configurado. Se omitirán envíos de correo.');
}

async function enviarCorreo({ to, subject, html, text }) {
  try {
    if (!transporter) {
      console.log('⚠️ Correo omitido: MAIL_USER o MAIL_PASS no configurado.');
      return {
        enviado: false,
        mensaje: 'Email no configurado.'
      };
    }

    const info = await transporter.sendMail({
      from: process.env.MAIL_FROM || process.env.MAIL_USER,
      to,
      subject,
      html,
      text
    });

    console.log('✅ Correo enviado:', info.messageId);

    return {
      enviado: true,
      messageId: info.messageId
    };

  } catch (error) {
    console.error('❌ Error al enviar correo:', error.message);

    return {
      enviado: false,
      mensaje: error.message
    };
  }
}

async function enviarBienvenida(usuarioOrEmail, token, id) {
  let email = '';
  let nombre = 'Usuario';
  let usuarioId = id;

  if (typeof usuarioOrEmail === 'object' && usuarioOrEmail !== null) {
    email = usuarioOrEmail.email;
    nombre =
      usuarioOrEmail.nombre ||
      usuarioOrEmail.nombres ||
      usuarioOrEmail.name ||
      'Usuario';

    usuarioId = usuarioOrEmail.id || id;
  } else {
    email = usuarioOrEmail;
  }

  const frontendUrl = obtenerFrontendUrl();

  const link = token
    ? `${frontendUrl}/pages/verificar-email.html?token=${encodeURIComponent(token)}&id=${encodeURIComponent(usuarioId || '')}`
    : `${frontendUrl}/pages/login.html`;

  console.log('🔗 Link de verificación generado:', link);

  return enviarCorreo({
    to: email,
    subject: 'Verifica tu cuenta en OficiosYA',
    text: `Hola ${nombre}. Verifica tu cuenta en OficiosYA ingresando a este enlace: ${link}`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827;">
        <h2>Bienvenido a OficiosYA</h2>

        <p>Hola <strong>${nombre}</strong>, gracias por registrarte.</p>

        <p>Para verificar tu cuenta, haz clic en el siguiente botón:</p>

        <p>
          <a href="${link}" style="display:inline-block;background:#1D9E75;color:white;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold;">
            Verificar cuenta
          </a>
        </p>

        <p>Si el botón no funciona, copia este enlace en tu navegador:</p>

        <p style="word-break:break-all;color:#2563EB;">
          ${link}
        </p>
      </div>
    `
  });
}

async function enviarResetPassword(usuarioOrEmail, token, id) {
  let email = '';
  let nombre = 'Usuario';
  let usuarioId = id;

  if (typeof usuarioOrEmail === 'object' && usuarioOrEmail !== null) {
    email = usuarioOrEmail.email;
    nombre =
      usuarioOrEmail.nombre ||
      usuarioOrEmail.nombres ||
      usuarioOrEmail.name ||
      'Usuario';

    usuarioId = usuarioOrEmail.id || id;
  } else {
    email = usuarioOrEmail;
  }

  const frontendUrl = obtenerFrontendUrl();

  const link = `${frontendUrl}/pages/nueva-password.html?token=${encodeURIComponent(token)}&id=${encodeURIComponent(usuarioId || '')}`;

  console.log('🔗 Link de recuperación generado:', link);

  return enviarCorreo({
    to: email,
    subject: 'Recuperar contraseña — OficiosYA',
    text: `Hola ${nombre}. Cambia tu contraseña ingresando a este enlace: ${link}`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827;">
        <h2>Recuperación de contraseña</h2>

        <p>Hola <strong>${nombre}</strong>, solicitaste cambiar tu contraseña.</p>

        <p>
          <a href="${link}" style="display:inline-block;background:#1D9E75;color:white;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold;">
            Cambiar contraseña
          </a>
        </p>

        <p>Si no solicitaste este cambio, ignora este mensaje.</p>

        <p style="word-break:break-all;color:#2563EB;">
          ${link}
        </p>
      </div>
    `
  });
}

module.exports = {
  enviarCorreo,
  enviarBienvenida,
  enviarResetPassword,
  emailConfigurado,
  obtenerIPLocal,
  obtenerFrontendUrl
};