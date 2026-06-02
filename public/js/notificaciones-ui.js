(function () {
  let socketNotificaciones = null;

  function crearEstilos() {
    if (document.getElementById('notificaciones-style')) return;

    const style = document.createElement('style');
    style.id = 'notificaciones-style';
    style.innerHTML = `
      .notif-widget {
        position: fixed;
        top: 86px;
        right: 22px;
        z-index: 9999;
        font-family: Arial, sans-serif;
      }

      .notif-btn {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        border: none;
        background: #111827;
        color: white;
        font-size: 20px;
        cursor: pointer;
        box-shadow: 0 8px 24px rgba(0,0,0,.25);
        position: relative;
      }

      .notif-count {
        position: absolute;
        top: -4px;
        right: -4px;
        background: #ef4444;
        color: white;
        font-size: 11px;
        font-weight: 900;
        border-radius: 999px;
        min-width: 20px;
        height: 20px;
        display: none;
        align-items: center;
        justify-content: center;
      }

      .notif-panel {
        display: none;
        width: 330px;
        max-height: 420px;
        overflow-y: auto;
        background: white;
        border-radius: 16px;
        box-shadow: 0 15px 40px rgba(0,0,0,.25);
        margin-top: 10px;
        border: 1px solid #e5e7eb;
      }

      .notif-head {
        padding: 14px;
        border-bottom: 1px solid #e5e7eb;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-weight: 900;
      }

      .notif-head button {
        border: none;
        background: none;
        color: #169b70;
        font-weight: 800;
        cursor: pointer;
      }

      .notif-item {
        padding: 12px 14px;
        border-bottom: 1px solid #f3f4f6;
      }

      .notif-item.unread {
        background: #ecfdf5;
      }

      .notif-title {
        font-weight: 900;
        margin-bottom: 4px;
        color: #111827;
      }

      .notif-msg {
        color: #4b5563;
        font-size: 13px;
      }

      .notif-date {
        color: #9ca3af;
        font-size: 11px;
        margin-top: 4px;
      }

      .notif-empty {
        padding: 18px;
        color: #6b7280;
        text-align: center;
      }

      @media(max-width: 600px) {
        .notif-widget {
          right: 12px;
          top: 80px;
        }

        .notif-panel {
          width: 300px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function formatearFecha(valor) {
    if (!valor) return '';

    const fecha = new Date(valor);

    if (isNaN(fecha.getTime())) return '';

    return fecha.toLocaleString('es-EC', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function crearWidget() {
    if (document.getElementById('notif-widget')) return;

    const div = document.createElement('div');
    div.id = 'notif-widget';
    div.className = 'notif-widget';

    div.innerHTML = `
      <button class="notif-btn" onclick="toggleNotificaciones()">
        🔔
        <span class="notif-count" id="notif-count">0</span>
      </button>

      <div class="notif-panel" id="notif-panel">
        <div class="notif-head">
          <span>Notificaciones</span>
          <button onclick="marcarTodasNotificaciones()">Marcar leídas</button>
        </div>
        <div id="notif-list">
          <div class="notif-empty">Cargando...</div>
        </div>
      </div>
    `;

    document.body.appendChild(div);
  }

  async function cargarNotificaciones() {
    const lista = document.getElementById('notif-list');
    const count = document.getElementById('notif-count');

    if (!lista || !count || !window.Notificaciones) return;

    try {
      const notificaciones = await Notificaciones.listar();

      const noLeidas = notificaciones.filter(n => !n.leida).length;

      if (noLeidas > 0) {
        count.style.display = 'flex';
        count.textContent = noLeidas > 9 ? '9+' : noLeidas;
      } else {
        count.style.display = 'none';
      }

      if (notificaciones.length === 0) {
        lista.innerHTML = `<div class="notif-empty">No tienes notificaciones.</div>`;
        return;
      }

      lista.innerHTML = notificaciones.map(n => `
        <div class="notif-item ${n.leida ? '' : 'unread'}" onclick="marcarNotificacion(${n.id})">
          <div class="notif-title">${n.titulo || 'Notificación'}</div>
          <div class="notif-msg">${n.mensaje || ''}</div>
          <div class="notif-date">${formatearFecha(n.createdat)}</div>
        </div>
      `).join('');

    } catch (error) {
      lista.innerHTML = `<div class="notif-empty">${error.message}</div>`;
    }
  }

  function conectarSocketNotificaciones() {
    const sesion = getSession();

    if (!sesion || !sesion.usuario) return;

    const socketUrl = window.SOCKET_URL;

    const cargar = () => {
      socketNotificaciones = io(socketUrl);
      socketNotificaciones.emit('unirse_usuario', sesion.usuario.id);

      socketNotificaciones.on('notificacion', () => {
        cargarNotificaciones();
      });
    };

    if (window.io) {
      cargar();
      return;
    }

    const script = document.createElement('script');
    script.src = `${socketUrl}/socket.io/socket.io.js`;
    script.onload = cargar;
    document.head.appendChild(script);
  }

  window.toggleNotificaciones = function () {
    const panel = document.getElementById('notif-panel');

    if (!panel) return;

    panel.style.display = panel.style.display === 'block' ? 'none' : 'block';

    if (panel.style.display === 'block') {
      cargarNotificaciones();
    }
  };

  window.marcarNotificacion = async function (id) {
    try {
      await Notificaciones.marcarLeida(id);
      await cargarNotificaciones();
    } catch (error) {
      alert(error.message);
    }
  };

  window.marcarTodasNotificaciones = async function () {
    try {
      await Notificaciones.marcarTodasLeidas();
      await cargarNotificaciones();
    } catch (error) {
      alert(error.message);
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    const sesion = getSession();

    if (!sesion || !sesion.usuario) return;

    crearEstilos();
    crearWidget();
    cargarNotificaciones();
    conectarSocketNotificaciones();
  });
})();