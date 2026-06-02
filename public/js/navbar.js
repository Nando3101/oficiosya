(function () {
  function obtenerUsuarioNavbar() {
    try {
      const session = localStorage.getItem('oficiosya_session');

      if (session) {
        const data = JSON.parse(session);
        return data.usuario || null;
      }

      const usuario = localStorage.getItem('oficiosya_usuario');

      return usuario ? JSON.parse(usuario) : null;
    } catch (error) {
      return null;
    }
  }

  function esAdminNavbar(usuario) {
    return usuario &&
      (
        usuario.rol === 'admin' ||
        usuario.is_admin === true ||
        usuario.is_admin === 1 ||
        usuario.is_admin === '1'
      );
  }

  function inicialesUsuario(usuario) {
    const n = usuario?.nombres || usuario?.nombre || '';
    const a = usuario?.apellidos || '';

    return `${n.charAt(0)}${a.charAt(0)}`.toUpperCase() || 'U';
  }

  function actualizarNavbar() {
    const usuario = obtenerUsuarioNavbar();

    const enlaces = document.querySelectorAll('a, button');

    enlaces.forEach((el) => {
      const texto = (el.textContent || '').trim().toLowerCase();

      if (usuario) {
        if (texto.includes('iniciar sesión') || texto.includes('registrarse')) {
          el.style.display = 'none';
        }
      }
    });

    const nav =
      document.querySelector('nav') ||
      document.querySelector('header') ||
      document.querySelector('.navbar');

    if (!nav || document.getElementById('user-navbar-box')) {
      return;
    }

    const contenedor = document.createElement('div');
    contenedor.id = 'user-navbar-box';
    contenedor.style.display = 'flex';
    contenedor.style.alignItems = 'center';
    contenedor.style.gap = '10px';
    contenedor.style.marginLeft = 'auto';

    if (usuario) {
      const panelDestino = esAdminNavbar(usuario) ? 'admin.html' : 'dashboard.html';

      contenedor.innerHTML = `
        <div style="
          width:34px;
          height:34px;
          border-radius:50%;
          background:#d1fae5;
          color:#065f46;
          display:flex;
          align-items:center;
          justify-content:center;
          font-weight:900;
          font-size:13px;
        ">
          ${inicialesUsuario(usuario)}
        </div>

        <span style="color:white;font-weight:700;font-size:14px;">
          ${usuario.nombres || usuario.nombre || 'Usuario'}
        </span>

        <a href="${panelDestino}" style="
          color:white;
          text-decoration:none;
          font-weight:800;
          padding:8px 12px;
          border-radius:8px;
          background:rgba(255,255,255,.12);
        ">Mi panel</a>

        <button onclick="cerrarSesionNavbar()" style="
          border:1px solid rgba(255,255,255,.45);
          background:transparent;
          color:white;
          padding:8px 12px;
          border-radius:8px;
          font-weight:800;
          cursor:pointer;
        ">Salir</button>
      `;
    }

    nav.appendChild(contenedor);
  }

  window.cerrarSesionNavbar = function () {
    localStorage.removeItem('oficiosya_session');
    localStorage.removeItem('oficiosya_token');
    localStorage.removeItem('oficiosya_usuario');
    sessionStorage.clear();
    window.location.href = 'login.html';
  };

  document.addEventListener('DOMContentLoaded', actualizarNavbar);
})();