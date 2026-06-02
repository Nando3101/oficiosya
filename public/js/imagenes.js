function imagenBackend(ruta) {
  if (!ruta) {
    return '../img/default-user.png';
  }

  if (ruta.startsWith('http')) {
    return ruta;
  }

  return `${window.BACKEND_URL || window.location.origin}${ruta}`;
}

function imagenUsuario(usuario) {
  if (!usuario) {
    return '../img/default-user.png';
  }

  if (usuario.foto_thumb) {
    return imagenBackend(usuario.foto_thumb);
  }

  if (usuario.foto_url) {
    return imagenBackend(usuario.foto_url);
  }

  return '../img/default-user.png';
}