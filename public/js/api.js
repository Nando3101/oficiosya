/* =====================================================
   OFICIOSYA - API GENERAL FRONTEND
   Archivo: public/js/api.js
===================================================== */

if (typeof window.API_URL === 'undefined') {
  console.error('No se encontró API_URL. Revisa que config.js esté cargado antes de api.js.');
}

/* =====================================================
   SESIÓN
===================================================== */

function setSession(data) {
  if (!data) return;

  localStorage.setItem('oficiosya_session', JSON.stringify(data));

  if (data.token) {
    localStorage.setItem('oficiosya_token', data.token);
  }

  if (data.usuario) {
    localStorage.setItem('oficiosya_usuario', JSON.stringify(data.usuario));
  }
}

function getSession() {
  try {
    const session = localStorage.getItem('oficiosya_session');

    if (session) {
      return JSON.parse(session);
    }

    const token = localStorage.getItem('oficiosya_token');
    const usuario = localStorage.getItem('oficiosya_usuario');

    if (token && usuario) {
      return {
        token,
        usuario: JSON.parse(usuario)
      };
    }

    return null;
  } catch (error) {
    console.error('Error al leer sesión:', error);
    return null;
  }
}

function getToken() {
  const session = getSession();

  if (session && session.token) {
    return session.token;
  }

  return localStorage.getItem('oficiosya_token');
}

function getUsuario() {
  const session = getSession();

  if (session && session.usuario) {
    return session.usuario;
  }

  try {
    const usuario = localStorage.getItem('oficiosya_usuario');
    return usuario ? JSON.parse(usuario) : null;
  } catch (error) {
    return null;
  }
}

function clearSession() {
  localStorage.removeItem('oficiosya_session');
  localStorage.removeItem('oficiosya_token');
  localStorage.removeItem('oficiosya_usuario');
  sessionStorage.clear();
}

function logout() {
  clearSession();
  window.location.href = 'login.html';
}

function cerrarSesion() {
  logout();
}

function isLoggedIn() {
  return !!getToken();
}

function esAdmin(usuario = getUsuario()) {
  return usuario &&
    (
      usuario.rol === 'admin' ||
      usuario.is_admin === true ||
      usuario.is_admin === 1 ||
      usuario.is_admin === '1'
    );
}

function redirigirSegunRol(usuario = getUsuario()) {
  if (esAdmin(usuario)) {
    window.location.href = 'admin.html';
  } else {
    window.location.href = 'dashboard.html';
  }
}

/* =====================================================
   HELPERS
===================================================== */

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showAlert(message, type = 'info', containerId = 'alert-box') {
  const alertBox = document.getElementById(containerId) || document.getElementById('alert-box');

  if (!alertBox) {
    alert(message);
    return;
  }

  alertBox.style.display = 'block';
  alertBox.textContent = message;
  alertBox.className = `alert-box ${type} alert-${type}`;

  setTimeout(() => {
    alertBox.style.display = 'none';
  }, 4500);
}

function hideAlert(containerId = 'alert-box') {
  const alertBox = document.getElementById(containerId) || document.getElementById('alert-box');

  if (alertBox) {
    alertBox.style.display = 'none';
    alertBox.textContent = '';
  }
}

function setLoading(isLoading) {
  const btn = document.getElementById('submit-btn');
  const btnText = document.getElementById('btn-text');
  const spinner = document.getElementById('btn-spinner');

  if (btn) btn.disabled = isLoading;
  if (btnText) btnText.style.display = isLoading ? 'none' : 'inline';
  if (spinner) spinner.style.display = isLoading ? 'block' : 'none';
}

function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);

  if (!input) return;

  input.type = input.type === 'password' ? 'text' : 'password';

  if (btn) {
    btn.classList.toggle('active');
  }
}

function checkPasswordStrength(password) {
  const strengthDiv = document.getElementById('pass-strength');
  const label = document.getElementById('strength-label');

  const bars = [
    document.getElementById('bar1'),
    document.getElementById('bar2'),
    document.getElementById('bar3'),
    document.getElementById('bar4')
  ];

  if (!strengthDiv) return;

  if (!password) {
    strengthDiv.style.display = 'none';
    return;
  }

  strengthDiv.style.display = 'flex';

  let score = 0;

  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  bars.forEach((bar, index) => {
    if (!bar) return;

    bar.className = 'strength-bar';

    if (index < score) {
      bar.classList.add('active');
    }
  });

  if (label) {
    label.textContent = ['Muy débil', 'Débil', 'Media', 'Buena', 'Fuerte'][score];
  }
}

/* =====================================================
   FETCH GENERAL
===================================================== */

async function apiFetch(endpoint, options = {}) {
  const token = getToken();

  const headers = {
    ...(options.headers || {})
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
  let data;

  try {
    response = await fetch(`${window.API_URL}${endpoint}`, {
      ...options,
      headers
    });

    data = await response.json().catch(() => ({}));
  } catch (error) {
    throw new Error('No se pudo conectar con el servidor. Verifica que el backend esté encendido.');
  }

  if (!response.ok) {
    throw new Error(data.mensaje || data.error || 'Error en la solicitud.');
  }

  return data;
}

/* =====================================================
   AUTH
===================================================== */

const Auth = {
  async login({ email, password }) {
    return apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  },

  async register(datos) {
    return apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify(datos)
    });
  },

  async googleLogin(credential) {
    return apiFetch('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential })
    });
  },

  async facebookLogin(accessToken) {
    return apiFetch('/auth/facebook', {
      method: 'POST',
      body: JSON.stringify({ accessToken })
    });
  },

  async verifyEmail(token, id = null) {
    if (id) {
      return apiFetch(`/auth/verify-email?token=${encodeURIComponent(token)}&id=${encodeURIComponent(id)}`);
    }

    return apiFetch(`/auth/verificar/${encodeURIComponent(token)}`);
  },

  async resendVerification(email) {
    return apiFetch('/auth/reenviar-verificacion', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  },

  async forgotPassword(email) {
    return apiFetch('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  },

  async resetPassword(tokenOrData, password = null) {
    const body = typeof tokenOrData === 'object'
      ? {
          ...tokenOrData,
          password: tokenOrData.password || tokenOrData.nuevaPassword
        }
      : { token: tokenOrData, password };

    return apiFetch('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(body)
    });
  },

  async changePassword(actual, nueva = null) {
    const body = typeof actual === 'object'
      ? actual
      : { actual, nueva };

    return apiFetch('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }
};

/* =====================================================
   PERFIL
===================================================== */

const Perfil = {
  async me() {
    return apiFetch('/perfil/me');
  },

  async actualizarDatos(datos) {
    return apiFetch('/perfil/me', {
      method: 'PUT',
      body: JSON.stringify(datos)
    });
  },

  async subirFoto(formData) {
    return apiFetch('/perfil/foto', {
      method: 'PUT',
      body: formData
    });
  },

  async profesional() {
    return apiFetch('/perfil/profesional');
  },

  async obtenerProfesional() {
    return apiFetch('/perfil/profesional');
  },

  async actualizarProfesional(datos) {
    return apiFetch('/perfil/profesional', {
      method: 'PUT',
      body: JSON.stringify(datos)
    });
  },

  async verificaciones() {
    return apiFetch('/perfil/verificaciones');
  },

  async misVerificaciones() {
    return apiFetch('/perfil/verificaciones');
  },

  async subirVerificacion(datos) {
    return apiFetch('/perfil/verificacion', {
      method: 'POST',
      body: datos instanceof FormData ? datos : JSON.stringify(datos)
    });
  },

  async publico(id) {
    const data = await apiFetch(`/perfil/${id}`);
    return data.perfil || data.usuario || data.trabajador || data;
  }
};

/* =====================================================
   SOLICITUDES
===================================================== */

const Solicitudes = {
  async categorias() {
    const data = await apiFetch('/solicitudes/categorias');
    const categorias = data.categorias || data || [];

    if (Array.isArray(categorias)) {
      categorias.categorias = categorias;
    }

    return categorias;
  },

  async listarAbiertas() {
    const data = await apiFetch('/solicitudes/abiertas');
    return data.solicitudes || data || [];
  },

  async misSolicitudes() {
    const data = await apiFetch('/solicitudes/mias/todas');
    return data.solicitudes || data || [];
  },

  async detalle(id) {
    const data = await apiFetch(`/solicitudes/${id}`);
    return data.solicitud || data;
  },

  async crear(datos) {
    return apiFetch('/solicitudes', {
      method: 'POST',
      body: JSON.stringify(datos)
    });
  },

  async editar(id, datos) {
    return apiFetch(`/solicitudes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(datos)
    });
  },

  async eliminar(id) {
    return apiFetch(`/solicitudes/${id}`, {
      method: 'DELETE'
    });
  },

  async cancelar(id) {
    return apiFetch(`/solicitudes/${id}/cancelar`, {
      method: 'PUT'
    });
  },

  async iniciarTrabajo(id) {
    return apiFetch(`/solicitudes/${id}/iniciar`, {
      method: 'PUT'
    });
  },

  async finalizarTrabajo(id) {
    return apiFetch(`/solicitudes/${id}/finalizar`, {
      method: 'PUT'
    });
  },

  async aplicar(id, datos) {
    return apiFetch(`/solicitudes/${id}/aplicar`, {
      method: 'POST',
      body: JSON.stringify(datos)
    });
  },

  async miPostulacion(id) {
    return apiFetch(`/solicitudes/${id}/mi-postulacion`);
  },

  async editarMiPostulacion(id, datos) {
    return apiFetch(`/solicitudes/${id}/mi-postulacion`, {
      method: 'PUT',
      body: JSON.stringify(datos)
    });
  },

  async cancelarPostulacion(id) {
    return apiFetch(`/solicitudes/${id}/cancelar-post`, {
      method: 'PUT'
    });
  },

  async verPostulaciones(id) {
    const data = await apiFetch(`/solicitudes/${id}/postulaciones`);
    return data.postulaciones || data || [];
  },

  async gestionarPostulacion(postulacionId, estado) {
    return apiFetch(`/solicitudes/postulacion/${postulacionId}`, {
      method: 'PUT',
      body: JSON.stringify({ estado })
    });
  },

  async estadisticas() {
    return apiFetch('/solicitudes/estadisticas');
  }
};

/* =====================================================
   TRABAJADORES
===================================================== */

const Trabajadores = {
  async listar() {
    const data = await apiFetch('/trabajadores');
    return data.trabajadores || data.profesionales || data || [];
  },

  async profesionales() {
    const data = await apiFetch('/trabajadores/profesionales');
    return data.trabajadores || data.profesionales || data || [];
  },

  async detalle(id) {
    const data = await apiFetch(`/trabajadores/${id}`);
    return data.trabajador || data.profesional || data.perfil || data;
  }
};

/* =====================================================
   CALIFICACIONES
===================================================== */

const Calificaciones = {
  async crear(datos) {
    return apiFetch('/calificaciones', {
      method: 'POST',
      body: JSON.stringify(datos)
    });
  },

  async recibidas(usuarioId) {
    const data = await apiFetch(`/calificaciones/usuario/${usuarioId}`);
    return data.calificaciones || data || [];
  },

  async porSolicitud(solicitudId) {
    const data = await apiFetch(`/calificaciones/solicitud/${solicitudId}`);
    return data.calificacion || null;
  }
};

/* =====================================================
   ADMIN
===================================================== */

const Admin = {
  async resumen() {
    const data = await apiFetch('/admin/resumen');
    return data.resumen || data;
  },

  async usuarios(page = 1, limit = 20) {
    return apiFetch(`/admin/usuarios?page=${page}&limit=${limit}`);
  },

  async solicitudes(page = 1, limit = 20) {
    return apiFetch(`/admin/solicitudes?page=${page}&limit=${limit}`);
  },

  async postulaciones(page = 1, limit = 20) {
    return apiFetch(`/admin/postulaciones?page=${page}&limit=${limit}`);
  },

  async calificaciones(page = 1, limit = 20) {
    return apiFetch(`/admin/calificaciones?page=${page}&limit=${limit}`);
  },

  async verificaciones(page = 1, limit = 20) {
    return apiFetch(`/admin/verificaciones?page=${page}&limit=${limit}`);
  },

  async cambiarEstadoUsuario(id, estado) {
    return apiFetch(`/admin/usuarios/${id}/estado`, {
      method: 'PUT',
      body: JSON.stringify({ estado })
    });
  },

  async gestionarVerificacion(id, estado, observacion = '') {
    return apiFetch(`/admin/verificaciones/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ estado, observacion })
    });
  }
};

/* =====================================================
   CHAT
===================================================== */

const Chat = {
  async mensajes(solicitudId) {
    return apiFetch(`/chat/solicitud/${solicitudId}`);
  },

  async enviar(solicitudId, mensaje) {
    return apiFetch(`/chat/solicitud/${solicitudId}`, {
      method: 'POST',
      body: JSON.stringify({ mensaje })
    });
  },

  async marcarLeido(solicitudId) {
    return apiFetch(`/chat/solicitud/${solicitudId}/leido`, {
      method: 'PUT'
    });
  }
};

/* =====================================================
   NOTIFICACIONES
===================================================== */

const Notificaciones = {
  async listar() {
    const data = await apiFetch('/notificaciones');
    return data.notificaciones || [];
  },

  async marcarLeida(id) {
    return apiFetch(`/notificaciones/${id}/leida`, {
      method: 'PUT'
    });
  },

  async marcarTodasLeidas() {
    return apiFetch('/notificaciones/todas/leidas', {
      method: 'PUT'
    });
  }
};

/* =====================================================
   TIEMPO REAL / UBICACIÓN
===================================================== */

const TiempoReal = {
  async ubicacionCliente(solicitudId, latitud, longitud) {
    return apiFetch(`/solicitudes/${solicitudId}/ubicacion-cliente`, {
      method: 'PUT',
      body: JSON.stringify({ latitud, longitud })
    });
  },

  async ubicacionTrabajador(solicitudId, latitud, longitud, estado_recorrido = 'trabajador_en_camino') {
    return apiFetch(`/solicitudes/${solicitudId}/ubicacion`, {
      method: 'PUT',
      body: JSON.stringify({ latitud, longitud, estado_recorrido })
    });
  },

  async estadoRecorrido(solicitudId, estado_recorrido) {
    return apiFetch(`/solicitudes/${solicitudId}/recorrido`, {
      method: 'PUT',
      body: JSON.stringify({ estado_recorrido })
    });
  }
};

/* =====================================================
   STATS
===================================================== */

const Stats = {
  async resumen() {
    return this.misStats();
  },

  async misStats() {
    const data = await apiFetch('/stats');
    const stats = data.stats || data || {};

    return {
      solicitudes_activas: Number(stats.solicitudes_activas ?? stats.solicitudes ?? 0),
      servicios_completados: Number(stats.servicios_completados ?? stats.trabajos ?? 0),
      calificacion_promedio: Number(stats.calificacion_promedio ?? stats.promedio ?? 0).toFixed(1),
      postulaciones_enviadas: Number(stats.postulaciones_enviadas ?? stats.postulaciones ?? 0),
      mensajes: Number(stats.mensajes ?? 0),
      trabajos: Number(stats.trabajos ?? stats.servicios_completados ?? 0),
      raw: stats
    };
  }
};

/* =====================================================
   TRABAJOS
===================================================== */

const Trabajos = {
  async listar() {
    return this.misTrabajos();
  },

  async misTrabajos() {
    const data = await apiFetch('/trabajos/mios');

    return {
      ...data,
      trabajos: data.trabajos || data.data || []
    };
  },

  async subir(formData) {
    return apiFetch('/trabajos', {
      method: 'POST',
      body: formData
    });
  },

  async eliminar(id) {
    return apiFetch(`/trabajos/${id}`, {
      method: 'DELETE'
    });
  },

  async detalle(id) {
    const data = await apiFetch(`/trabajos/${id}`);
    return data.trabajo || data;
  }
};

/* =====================================================
   EXPORTAR A WINDOW
===================================================== */

window.apiFetch = apiFetch;

window.Auth = Auth;
window.Perfil = Perfil;
window.Solicitudes = Solicitudes;
window.Trabajadores = Trabajadores;
window.Calificaciones = Calificaciones;
window.Admin = Admin;
window.Chat = Chat;
window.Notificaciones = Notificaciones;
window.TiempoReal = TiempoReal;
window.Stats = Stats;
window.Trabajos = Trabajos;

window.setSession = setSession;
window.getSession = getSession;
window.getToken = getToken;
window.getUsuario = getUsuario;
window.clearSession = clearSession;
window.logout = logout;
window.cerrarSesion = cerrarSesion;
window.isLoggedIn = isLoggedIn;
window.esAdmin = esAdmin;
window.redirigirSegunRol = redirigirSegunRol;

window.isValidEmail = isValidEmail;
window.showAlert = showAlert;
window.hideAlert = hideAlert;
window.setLoading = setLoading;
window.togglePassword = togglePassword;
window.checkPasswordStrength = checkPasswordStrength;