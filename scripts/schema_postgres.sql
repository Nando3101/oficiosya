
BEGIN;

CREATE TABLE IF NOT EXISTS categorias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion VARCHAR(255),
    icono VARCHAR(100),
    estado INTEGER NOT NULL DEFAULT 1,
    activa BOOLEAN NOT NULL DEFAULT TRUE,
    createdat TIMESTAMP NOT NULL DEFAULT NOW(),
    updatedat TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100),
    apellido VARCHAR(100),
    nombres VARCHAR(100),
    apellidos VARCHAR(100),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    telefono VARCHAR(30),
    zona VARCHAR(150),
    ciudad VARCHAR(100),
    rol VARCHAR(40) NOT NULL DEFAULT 'cliente',
    estado INTEGER NOT NULL DEFAULT 1,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    suspendido BOOLEAN NOT NULL DEFAULT FALSE,
    bloqueado BOOLEAN NOT NULL DEFAULT FALSE,
    is_admin INTEGER NOT NULL DEFAULT 0,
    es_cliente INTEGER NOT NULL DEFAULT 1,
    es_trabajador INTEGER NOT NULL DEFAULT 0,
    email_verificado INTEGER NOT NULL DEFAULT 0,
    verificado INTEGER NOT NULL DEFAULT 0,
    email_token VARCHAR(255),
    reset_token VARCHAR(255),
    reset_token_expiry TIMESTAMP,
    token_recuperacion VARCHAR(255),
    token_expiracion TIMESTAMP,
    google_id VARCHAR(255),
    provider VARCHAR(50),
    foto_url VARCHAR(500),
    foto_thumb VARCHAR(500),
    foto_public_id VARCHAR(255),
    estado_conexion VARCHAR(40) DEFAULT 'inactivo',
    ultima_latitud NUMERIC(10,7),
    ultima_longitud NUMERIC(10,7),
    ultima_conexion TIMESTAMP,
    createdat TIMESTAMP NOT NULL DEFAULT NOW(),
    updatedat TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS perfiles_trabajador (
    id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
    categoria_id INT REFERENCES categorias(id),
    titulo VARCHAR(200),
    descripcion TEXT,
    experiencia TEXT,
    anos_experiencia INT DEFAULT 0,
    tarifa_referencia NUMERIC(10,2),
    precio_desde NUMERIC(10,2),
    disponibilidad VARCHAR(255),
    disponible INTEGER DEFAULT 1,
    rating_promedio NUMERIC(3,2) DEFAULT 0,
    total_servicios INT DEFAULT 0,
    createdat TIMESTAMP NOT NULL DEFAULT NOW(),
    updatedat TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS solicitudes (
    id SERIAL PRIMARY KEY,
    cliente_id INT NOT NULL REFERENCES usuarios(id),
    trabajador_id INT NULL REFERENCES usuarios(id),
    categoria_id INT NULL REFERENCES categorias(id),
    titulo VARCHAR(200) NOT NULL,
    descripcion TEXT,
    presupuesto NUMERIC(10,2),
    urgencia VARCHAR(30) DEFAULT 'normal',
    zona VARCHAR(150),
    ciudad VARCHAR(100),
    direccion VARCHAR(255),
    fecha_preferida DATE,
    estado VARCHAR(40) NOT NULL DEFAULT 'abierta',
    latitud_cliente NUMERIC(10,7),
    longitud_cliente NUMERIC(10,7),
    latitud_trabajador NUMERIC(10,7),
    longitud_trabajador NUMERIC(10,7),
    estado_recorrido VARCHAR(40) DEFAULT 'pendiente',
    createdat TIMESTAMP NOT NULL DEFAULT NOW(),
    updatedat TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS postulaciones (
    id SERIAL PRIMARY KEY,
    solicitud_id INT NOT NULL REFERENCES solicitudes(id) ON DELETE CASCADE,
    trabajador_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    mensaje TEXT,
    precio_oferta NUMERIC(10,2),
    precio_ofertado NUMERIC(10,2),
    disponibilidad VARCHAR(255),
    estado VARCHAR(30) NOT NULL DEFAULT 'pendiente',
    createdat TIMESTAMP NOT NULL DEFAULT NOW(),
    updatedat TIMESTAMP NULL,
    UNIQUE(solicitud_id, trabajador_id)
);

CREATE TABLE IF NOT EXISTS servicios (
    id SERIAL PRIMARY KEY,
    solicitud_id INT REFERENCES solicitudes(id) ON DELETE SET NULL,
    postulacion_id INT REFERENCES postulaciones(id) ON DELETE SET NULL,
    trabajador_id INT NOT NULL REFERENCES usuarios(id),
    cliente_id INT NOT NULL REFERENCES usuarios(id),
    titulo VARCHAR(200),
    descripcion TEXT,
    estado VARCHAR(40) DEFAULT 'confirmado',
    precio_final NUMERIC(10,2),
    fecha_inicio TIMESTAMP,
    fecha_fin TIMESTAMP,
    createdat TIMESTAMP NOT NULL DEFAULT NOW(),
    updatedat TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS trabajos_realizados (
    id SERIAL PRIMARY KEY,
    solicitud_id INT NOT NULL REFERENCES solicitudes(id),
    trabajador_id INT NOT NULL REFERENCES usuarios(id),
    cliente_id INT NOT NULL REFERENCES usuarios(id),
    descripcion TEXT,
    fecha_inicio TIMESTAMP,
    fecha_fin TIMESTAMP,
    estado VARCHAR(40) DEFAULT 'en_curso',
    createdat TIMESTAMP NOT NULL DEFAULT NOW(),
    updatedat TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS calificaciones (
    id SERIAL PRIMARY KEY,
    servicio_id INT REFERENCES servicios(id) ON DELETE SET NULL,
    solicitud_id INT REFERENCES solicitudes(id) ON DELETE SET NULL,
    calificador_id INT NOT NULL REFERENCES usuarios(id),
    calificado_id INT NOT NULL REFERENCES usuarios(id),
    puntaje INT,
    puntuacion INT,
    comentario TEXT,
    tipo VARCHAR(30),
    createdat TIMESTAMP NOT NULL DEFAULT NOW(),
    updatedat TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS reportes (
    id SERIAL PRIMARY KEY,
    solicitud_id INT REFERENCES solicitudes(id) ON DELETE SET NULL,
    reportador_id INT REFERENCES usuarios(id),
    reportante_id INT REFERENCES usuarios(id),
    reportado_id INT REFERENCES usuarios(id),
    motivo VARCHAR(100),
    tipo VARCHAR(100),
    descripcion TEXT,
    estado VARCHAR(40) DEFAULT 'pendiente',
    accion_tomada VARCHAR(100),
    createdat TIMESTAMP NOT NULL DEFAULT NOW(),
    updatedat TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS imagenes (
    id SERIAL PRIMARY KEY,
    solicitud_id INT REFERENCES solicitudes(id) ON DELETE CASCADE,
    usuario_id INT REFERENCES usuarios(id) ON DELETE CASCADE,
    entidad_tipo VARCHAR(50),
    entidad_id INT,
    url VARCHAR(500) NOT NULL,
    thumb_url VARCHAR(500),
    public_id VARCHAR(255),
    descripcion VARCHAR(255),
    tipo VARCHAR(50),
    createdat TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS verificaciones (
    id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    doc_url VARCHAR(500),
    documento_url VARCHAR(500),
    doc_public_id VARCHAR(255),
    observacion TEXT,
    motivo_rechazo TEXT,
    revisado_por INT REFERENCES usuarios(id),
    estado VARCHAR(40) DEFAULT 'pendiente',
    createdat TIMESTAMP NOT NULL DEFAULT NOW(),
    updatedat TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS mensajes (
    id SERIAL PRIMARY KEY,
    solicitud_id INT NOT NULL REFERENCES solicitudes(id) ON DELETE CASCADE,
    emisor_id INT NOT NULL REFERENCES usuarios(id),
    receptor_id INT NOT NULL REFERENCES usuarios(id),
    mensaje TEXT NOT NULL,
    leido INTEGER NOT NULL DEFAULT 0,
    createdat TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notificaciones (
    id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    titulo VARCHAR(150) NOT NULL,
    mensaje TEXT NOT NULL,
    tipo VARCHAR(50),
    leida INTEGER NOT NULL DEFAULT 0,
    createdat TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS ix_usuarios_rol ON usuarios(rol);
CREATE INDEX IF NOT EXISTS ix_solicitudes_estado ON solicitudes(estado);
CREATE INDEX IF NOT EXISTS ix_solicitudes_cliente ON solicitudes(cliente_id);
CREATE INDEX IF NOT EXISTS ix_solicitudes_trabajador ON solicitudes(trabajador_id);
CREATE INDEX IF NOT EXISTS ix_postulaciones_solicitud ON postulaciones(solicitud_id);
CREATE INDEX IF NOT EXISTS ix_postulaciones_trabajador ON postulaciones(trabajador_id);
CREATE INDEX IF NOT EXISTS ix_mensajes_solicitud ON mensajes(solicitud_id, createdat);
CREATE INDEX IF NOT EXISTS ix_notificaciones_usuario ON notificaciones(usuario_id, leida, createdat);

INSERT INTO categorias (nombre, descripcion, icono, estado, activa)
VALUES
('Plomería', 'Reparación de fugas, tuberías, grifería y sanitarios.', 'wrench', 1, TRUE),
('Electricidad', 'Instalaciones y reparaciones eléctricas.', 'zap', 1, TRUE),
('Carpintería', 'Fabricación y reparación de muebles.', 'home', 1, TRUE),
('Pintura', 'Pintura de interiores, exteriores y acabados.', 'brush', 1, TRUE),
('Albañilería', 'Construcción, remodelación y mantenimiento.', 'layers', 1, TRUE),
('Cerrajería', 'Apertura, cambio y reparación de cerraduras.', 'key', 1, TRUE),
('Jardinería', 'Mantenimiento de jardines y áreas verdes.', 'leaf', 1, TRUE),
('Limpieza', 'Limpieza doméstica y comercial.', 'sparkles', 1, TRUE),
('Tecnología', 'Soporte técnico, redes y computadoras.', 'cpu', 1, TRUE)
ON CONFLICT (nombre) DO NOTHING;

-- Claves de prueba: 123456 para todos excepto admin: Admin2026!
INSERT INTO usuarios (nombres, apellidos, nombre, apellido, email, telefono, zona, ciudad, password_hash, rol, estado, is_admin, es_cliente, es_trabajador, email_verificado, verificado, estado_conexion)
VALUES
('heberon', 'Administrador', 'heberon', 'Administrador', 'admin@oficiosya.com', '0990000000', 'Ambato', 'Ambato', '$2a$10$t8zz7Doh8FYhyLvZwh71W.dnsK4hLNDUxAmhKHQkLcLFy1hC3T39a', 'admin', 1, 1, 0, 0, 1, 1, 'activo'),
('Fernando', 'Cliente', 'Fernando', 'Cliente', 'fernando@oficiosya.com', '0991111111', 'Centro', 'Ambato', '$2a$10$UohspkbEAn4CQTAoP0oEgeFeaexOQ2A5eD9qUJB/yy4mKik6Y4J5i', 'cliente', 1, 0, 1, 0, 1, 1, 'activo'),
('Danilo', 'Garcia', 'Danilo', 'Garcia', 'danilogarcia457@gmail.com', '0992222222', 'Ambato', 'Ambato', '$2a$10$UohspkbEAn4CQTAoP0oEgeFeaexOQ2A5eD9qUJB/yy4mKik6Y4J5i', 'cliente_trabajador', 1, 0, 1, 1, 1, 1, 'activo'),
('Ana', 'Gómez', 'Ana', 'Gómez', 'ana.gomez@oficiosya.com', '0993333333', 'Norte', 'Ambato', '$2a$10$UohspkbEAn4CQTAoP0oEgeFeaexOQ2A5eD9qUJB/yy4mKik6Y4J5i', 'trabajador', 1, 0, 0, 1, 1, 1, 'activo'),
('Carlos', 'Pérez', 'Carlos', 'Pérez', 'carlos.perez@oficiosya.com', '0994444444', 'Centro', 'Ambato', '$2a$10$UohspkbEAn4CQTAoP0oEgeFeaexOQ2A5eD9qUJB/yy4mKik6Y4J5i', 'trabajador', 1, 0, 0, 1, 1, 1, 'activo'),
('Luis', 'Mora', 'Luis', 'Mora', 'luis.mora@oficiosya.com', '0995555555', 'Sur', 'Ambato', '$2a$10$UohspkbEAn4CQTAoP0oEgeFeaexOQ2A5eD9qUJB/yy4mKik6Y4J5i', 'trabajador', 1, 0, 0, 1, 1, 1, 'activo')
ON CONFLICT (email) DO NOTHING;

INSERT INTO perfiles_trabajador (usuario_id, categoria_id, titulo, descripcion, experiencia, anos_experiencia, tarifa_referencia, precio_desde, disponibilidad, disponible)
SELECT u.id, c.id, 'Carpintero', 'Realizo trabajos de carpintería, reparación de muebles y mantenimiento general.', '3 años de experiencia.', 3, 10, 10, 'Disponible', 1 FROM usuarios u, categorias c WHERE u.email='danilogarcia457@gmail.com' AND c.nombre='Carpintería'
ON CONFLICT (usuario_id) DO NOTHING;
INSERT INTO perfiles_trabajador (usuario_id, categoria_id, titulo, descripcion, experiencia, anos_experiencia, tarifa_referencia, precio_desde, disponibilidad, disponible)
SELECT u.id, c.id, 'Electricista', 'Técnica en instalaciones eléctricas residenciales.', '5 años de experiencia.', 5, 25, 25, 'Disponible', 1 FROM usuarios u, categorias c WHERE u.email='ana.gomez@oficiosya.com' AND c.nombre='Electricidad'
ON CONFLICT (usuario_id) DO NOTHING;
INSERT INTO perfiles_trabajador (usuario_id, categoria_id, titulo, descripcion, experiencia, anos_experiencia, tarifa_referencia, precio_desde, disponibilidad, disponible)
SELECT u.id, c.id, 'Plomero', 'Plomero con experiencia en fugas, baños, tuberías y mantenimiento.', '4 años de experiencia.', 4, 20, 20, 'Disponible', 1 FROM usuarios u, categorias c WHERE u.email='carlos.perez@oficiosya.com' AND c.nombre='Plomería'
ON CONFLICT (usuario_id) DO NOTHING;
INSERT INTO perfiles_trabajador (usuario_id, categoria_id, titulo, descripcion, experiencia, anos_experiencia, tarifa_referencia, precio_desde, disponibilidad, disponible)
SELECT u.id, c.id, 'Pintor', 'Pintor profesional para interiores y exteriores.', '6 años de experiencia.', 6, 30, 30, 'Disponible', 1 FROM usuarios u, categorias c WHERE u.email='luis.mora@oficiosya.com' AND c.nombre='Pintura'
ON CONFLICT (usuario_id) DO NOTHING;

INSERT INTO solicitudes (cliente_id, trabajador_id, categoria_id, titulo, descripcion, presupuesto, urgencia, zona, ciudad, direccion, fecha_preferida, estado, estado_recorrido)
SELECT cli.id, NULL, cat.id, 'Reparar fuga de agua', 'Necesito reparar una fuga de agua en el baño principal.', 25, 'media', 'Centro', 'Ambato', 'Av. Cevallos y Mera', CURRENT_DATE, 'abierta', 'pendiente'
FROM usuarios cli, categorias cat WHERE cli.email='fernando@oficiosya.com' AND cat.nombre='Plomería'
ON CONFLICT DO NOTHING;
INSERT INTO solicitudes (cliente_id, trabajador_id, categoria_id, titulo, descripcion, presupuesto, urgencia, zona, ciudad, direccion, fecha_preferida, estado, estado_recorrido)
SELECT cli.id, NULL, cat.id, 'Instalar tomacorriente', 'Necesito instalar un tomacorriente nuevo en la sala.', 18, 'baja', 'Norte', 'Ambato', 'Sector Ficoa', CURRENT_DATE, 'abierta', 'pendiente'
FROM usuarios cli, categorias cat WHERE cli.email='fernando@oficiosya.com' AND cat.nombre='Electricidad'
ON CONFLICT DO NOTHING;

COMMIT;
