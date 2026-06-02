CREATE TABLE IF NOT EXISTS categorias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion VARCHAR(255),
    estado INTEGER NOT NULL DEFAULT 1,
    createdat TIMESTAMP NOT NULL DEFAULT NOW(),
    updatedat TIMESTAMP
);

CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    telefono VARCHAR(20),
    zona VARCHAR(150),
    ciudad VARCHAR(100),
    direccion VARCHAR(255),
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(30) NOT NULL DEFAULT 'cliente',
    estado INTEGER NOT NULL DEFAULT 1,
    is_admin INTEGER NOT NULL DEFAULT 0,
    es_cliente INTEGER NOT NULL DEFAULT 1,
    es_trabajador INTEGER NOT NULL DEFAULT 0,
    email_verificado INTEGER NOT NULL DEFAULT 0,
    verificado INTEGER NOT NULL DEFAULT 0,
    email_token VARCHAR(255),
    reset_token VARCHAR(255),
    reset_token_expiry TIMESTAMP,
    google_id VARCHAR(255),
    provider VARCHAR(50),
    foto_url VARCHAR(500),
    foto_thumb VARCHAR(500),
    foto_public_id VARCHAR(255),
    estado_conexion VARCHAR(30) DEFAULT 'inactivo',
    ultima_latitud DECIMAL(10,7),
    ultima_longitud DECIMAL(10,7),
    ultima_conexion TIMESTAMP,
    createdat TIMESTAMP NOT NULL DEFAULT NOW(),
    updatedat TIMESTAMP
);

CREATE TABLE IF NOT EXISTS perfiles_trabajador (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
    categoria_id INTEGER REFERENCES categorias(id) ON DELETE SET NULL,
    titulo VARCHAR(150),
    descripcion TEXT,
    experiencia TEXT,
    anos_experiencia INTEGER,
    ubicacion VARCHAR(150),
    tarifa_referencia DECIMAL(10,2),
    tarifa_referencial DECIMAL(10,2),
    precio_desde DECIMAL(10,2),
    disponibilidad VARCHAR(255),
    disponible INTEGER NOT NULL DEFAULT 1,
    createdat TIMESTAMP NOT NULL DEFAULT NOW(),
    updatedat TIMESTAMP
);

CREATE TABLE IF NOT EXISTS solicitudes (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    trabajador_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    categoria_id INTEGER REFERENCES categorias(id) ON DELETE SET NULL,
    titulo VARCHAR(150) NOT NULL,
    descripcion TEXT NOT NULL,
    direccion VARCHAR(255),
    ciudad VARCHAR(100),
    zona VARCHAR(150),
    presupuesto DECIMAL(10,2),
    fecha_servicio TIMESTAMP,
    fecha_preferida DATE,
    urgencia VARCHAR(30),
    estado VARCHAR(40) NOT NULL DEFAULT 'abierta',
    latitud_cliente DECIMAL(10,7),
    longitud_cliente DECIMAL(10,7),
    latitud_trabajador DECIMAL(10,7),
    longitud_trabajador DECIMAL(10,7),
    estado_recorrido VARCHAR(40) DEFAULT 'pendiente',
    createdat TIMESTAMP NOT NULL DEFAULT NOW(),
    updatedat TIMESTAMP
);

CREATE TABLE IF NOT EXISTS postulaciones (
    id SERIAL PRIMARY KEY,
    solicitud_id INTEGER NOT NULL REFERENCES solicitudes(id) ON DELETE CASCADE,
    trabajador_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    mensaje TEXT,
    precio_ofertado DECIMAL(10,2),
    precio_oferta DECIMAL(10,2),
    disponibilidad VARCHAR(255),
    estado VARCHAR(30) NOT NULL DEFAULT 'pendiente',
    createdat TIMESTAMP NOT NULL DEFAULT NOW(),
    updatedat TIMESTAMP,
    UNIQUE (solicitud_id, trabajador_id)
);

CREATE TABLE IF NOT EXISTS servicios (
    id SERIAL PRIMARY KEY,
    solicitud_id INTEGER REFERENCES solicitudes(id) ON DELETE CASCADE,
    trabajador_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    cliente_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    titulo VARCHAR(150),
    descripcion TEXT,
    precio_final DECIMAL(10,2),
    estado VARCHAR(40) NOT NULL DEFAULT 'pendiente',
    createdat TIMESTAMP NOT NULL DEFAULT NOW(),
    updatedat TIMESTAMP
);

CREATE TABLE IF NOT EXISTS trabajos (
    id SERIAL PRIMARY KEY,
    solicitud_id INTEGER REFERENCES solicitudes(id) ON DELETE CASCADE,
    trabajador_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    cliente_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    descripcion TEXT,
    fecha_inicio TIMESTAMP,
    fecha_fin TIMESTAMP,
    estado VARCHAR(40) NOT NULL DEFAULT 'en_curso',
    createdat TIMESTAMP NOT NULL DEFAULT NOW(),
    updatedat TIMESTAMP
);

CREATE TABLE IF NOT EXISTS trabajos_realizados (
    id SERIAL PRIMARY KEY,
    solicitud_id INTEGER REFERENCES solicitudes(id) ON DELETE CASCADE,
    trabajador_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    cliente_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    descripcion TEXT,
    fecha_inicio TIMESTAMP,
    fecha_fin TIMESTAMP,
    estado VARCHAR(40) NOT NULL DEFAULT 'en_curso',
    createdat TIMESTAMP NOT NULL DEFAULT NOW(),
    updatedat TIMESTAMP
);

CREATE TABLE IF NOT EXISTS calificaciones (
    id SERIAL PRIMARY KEY,
    solicitud_id INTEGER REFERENCES solicitudes(id) ON DELETE CASCADE,
    calificador_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    calificado_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    puntuacion INTEGER NOT NULL CHECK (puntuacion BETWEEN 1 AND 5),
    comentario TEXT,
    createdat TIMESTAMP NOT NULL DEFAULT NOW(),
    updatedat TIMESTAMP,
    UNIQUE (solicitud_id, calificador_id, calificado_id)
);

CREATE TABLE IF NOT EXISTS mensajes (
    id SERIAL PRIMARY KEY,
    solicitud_id INTEGER NOT NULL REFERENCES solicitudes(id) ON DELETE CASCADE,
    emisor_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    receptor_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    mensaje TEXT NOT NULL,
    leido INTEGER NOT NULL DEFAULT 0,
    createdat TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notificaciones (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    titulo VARCHAR(150) NOT NULL,
    mensaje TEXT NOT NULL,
    tipo VARCHAR(50),
    leida INTEGER NOT NULL DEFAULT 0,
    createdat TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS verificaciones (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo_documento VARCHAR(100),
    documento_url VARCHAR(500),
    archivo_url VARCHAR(500),
    observacion TEXT,
    estado VARCHAR(40) NOT NULL DEFAULT 'pendiente',
    createdat TIMESTAMP NOT NULL DEFAULT NOW(),
    updatedat TIMESTAMP
);

CREATE TABLE IF NOT EXISTS imagenes (
    id SERIAL PRIMARY KEY,
    solicitud_id INTEGER REFERENCES solicitudes(id) ON DELETE CASCADE,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    url VARCHAR(500) NOT NULL,
    thumb_url VARCHAR(500),
    tipo VARCHAR(50),
    createdat TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reportes (
    id SERIAL PRIMARY KEY,
    solicitud_id INTEGER REFERENCES solicitudes(id) ON DELETE SET NULL,
    reportante_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    reportado_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    tipo VARCHAR(100),
    descripcion TEXT NOT NULL,
    estado VARCHAR(40) NOT NULL DEFAULT 'pendiente',
    createdat TIMESTAMP NOT NULL DEFAULT NOW(),
    updatedat TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios(rol);
CREATE INDEX IF NOT EXISTS idx_solicitudes_estado ON solicitudes(estado);
CREATE INDEX IF NOT EXISTS idx_solicitudes_cliente ON solicitudes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_trabajador ON solicitudes(trabajador_id);
CREATE INDEX IF NOT EXISTS idx_postulaciones_solicitud ON postulaciones(solicitud_id);
CREATE INDEX IF NOT EXISTS idx_postulaciones_trabajador ON postulaciones(trabajador_id);
CREATE INDEX IF NOT EXISTS idx_mensajes_solicitud ON mensajes(solicitud_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario ON notificaciones(usuario_id);