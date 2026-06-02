let watchUbicacionId = null;
let socketUbicacion = null;

function cargarSocketUbicacion(callback) {
  const socketUrl = window.SOCKET_URL;

  if (window.io) {
    socketUbicacion = io(socketUrl);
    callback();
    return;
  }

  const script = document.createElement('script');
  script.src = `${socketUrl}/socket.io/socket.io.js`;

  script.onload = () => {
    socketUbicacion = io(socketUrl);
    callback();
  };

  script.onerror = () => {
    alert('No se pudo cargar Socket.IO. Verifica que el backend esté encendido.');
  };

  document.head.appendChild(script);
}

function iniciarCompartirUbicacion(solicitudId) {
  const sesion = getSession();

  if (!sesion || !sesion.usuario) {
    alert('Debes iniciar sesión.');
    return;
  }

  if (!solicitudId) {
    alert('No se recibió el ID de la solicitud.');
    return;
  }

  if (!navigator.geolocation) {
    alert('Tu navegador no permite geolocalización.');
    return;
  }

  if (watchUbicacionId) {
    alert('Ya estás compartiendo ubicación.');
    return;
  }

  cargarSocketUbicacion(() => {
    socketUbicacion.emit('unirse_usuario', sesion.usuario.id);
    socketUbicacion.emit('unirse_solicitud', solicitudId);

    watchUbicacionId = navigator.geolocation.watchPosition(
      async (position) => {
        const latitud = position.coords.latitude;
        const longitud = position.coords.longitude;

        socketUbicacion.emit('ubicacion_trabajador', {
          solicitud_id: solicitudId,
          trabajador_id: sesion.usuario.id,
          latitud,
          longitud,
          estado_recorrido: 'trabajador_en_camino'
        });

        try {
          await TiempoReal.ubicacionTrabajador(
            solicitudId,
            latitud,
            longitud,
            'trabajador_en_camino'
          );
        } catch (error) {
          console.error('Error guardando ubicación:', error);
        }
      },
      (error) => {
        alert('No se pudo obtener ubicación: ' + error.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000
      }
    );

    alert('Compartiendo ubicación en tiempo real.');
  });
}

function detenerCompartirUbicacion() {
  if (watchUbicacionId) {
    navigator.geolocation.clearWatch(watchUbicacionId);
    watchUbicacionId = null;
    alert('Se detuvo la ubicación en tiempo real.');
  } else {
    alert('No estabas compartiendo ubicación.');
  }
}

async function marcarTrabajadorLlego(solicitudId) {
  if (!solicitudId) {
    alert('No se recibió el ID de la solicitud.');
    return;
  }

  try {
    await TiempoReal.estadoRecorrido(solicitudId, 'trabajador_llego');
    alert('Marcaste que llegaste.');
  } catch (error) {
    alert(error.message);
  }
}

async function marcarEnCurso(solicitudId) {
  if (!solicitudId) {
    alert('No se recibió el ID de la solicitud.');
    return;
  }

  try {
    await TiempoReal.estadoRecorrido(solicitudId, 'en_curso');
    await Solicitudes.iniciarTrabajo(solicitudId);
    alert('Trabajo iniciado.');
  } catch (error) {
    alert(error.message);
  }
}

async function marcarFinalizado(solicitudId) {
  if (!solicitudId) {
    alert('No se recibió el ID de la solicitud.');
    return;
  }

  try {
    await TiempoReal.estadoRecorrido(solicitudId, 'finalizada');
    await Solicitudes.finalizarTrabajo(solicitudId);
    detenerCompartirUbicacion();
    alert('Trabajo finalizado.');
  } catch (error) {
    alert(error.message);
  }
}

window.iniciarCompartirUbicacion = iniciarCompartirUbicacion;
window.detenerCompartirUbicacion = detenerCompartirUbicacion;
window.marcarTrabajadorLlego = marcarTrabajadorLlego;
window.marcarEnCurso = marcarEnCurso;
window.marcarFinalizado = marcarFinalizado;