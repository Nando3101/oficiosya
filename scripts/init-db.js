require('dotenv').config();

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { pgPool } = require('../config/db');

async function crearTablas() {
  const schemaPath = path.join(__dirname, 'schema_postgres.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  console.log('Inicializando estructura PostgreSQL...');
  await pgPool.query(schema);
  console.log('Tablas verificadas correctamente.');
}

async function insertarDatosIniciales() {
  console.log('Insertando datos iniciales...');

  const adminHash = await bcrypt.hash('Admin2026!', 10);
  const userHash = await bcrypt.hash('123456', 10);

  await pgPool.query(`
    INSERT INTO categorias (nombre, descripcion, estado)
    VALUES
      ('Albañilería', 'Servicios de construcción, reparación y mantenimiento.', 1),
      ('Carpintería', 'Fabricación y reparación de muebles y estructuras de madera.', 1),
      ('Cerrajería', 'Apertura, cambio y reparación de cerraduras.', 1),
      ('Electricidad', 'Instalaciones y reparaciones eléctricas.', 1),
      ('Jardinería', 'Mantenimiento de jardines y áreas verdes.', 1),
      ('Pintura', 'Pintura de interiores y exteriores.', 1),
      ('Plomería', 'Reparación de fugas, tuberías y sanitarios.', 1),
      ('Limpieza', 'Limpieza doméstica, oficinas y locales.', 1),
      ('Tecnología', 'Soporte técnico, redes y computadoras.', 1)
    ON CONFLICT (nombre) DO NOTHING;
  `);

  await pgPool.query(
    `
    INSERT INTO usuarios (
      nombres, apellidos, email, telefono, zona, ciudad, password_hash,
      rol, estado, is_admin, es_cliente, es_trabajador,
      email_verificado, verificado, estado_conexion
    )
    VALUES
      ('heberon', 'Administrador', 'admin@oficiosya.com', '0990000000', 'Ambato', 'Ambato', $1,
       'admin', 1, 1, 0, 0, 1, 1, 'activo'),

      ('Fernando', 'Cliente', 'fernando@oficiosya.com', '0991111111', 'Centro', 'Ambato', $2,
       'cliente', 1, 0, 1, 0, 1, 1, 'activo'),

      ('Danilo', 'Garcia', 'danilogarcia457@gmail.com', '0992222222', 'Ambato', 'Ambato', $2,
       'cliente_trabajador', 1, 0, 1, 1, 1, 1, 'activo'),

      ('Ana', 'Gómez', 'ana.gomez@oficiosya.com', '0993333333', 'Norte', 'Ambato', $2,
       'trabajador', 1, 0, 0, 1, 1, 1, 'activo'),

      ('Carlos', 'Pérez', 'carlos.perez@oficiosya.com', '0994444444', 'Centro', 'Ambato', $2,
       'trabajador', 1, 0, 0, 1, 1, 1, 'activo'),

      ('Luis', 'Mora', 'luis.mora@oficiosya.com', '0995555555', 'Sur', 'Ambato', $2,
       'trabajador', 1, 0, 0, 1, 1, 1, 'activo')
    ON CONFLICT (email) DO NOTHING;
    `,
    [adminHash, userHash]
  );

  await pgPool.query(`
    INSERT INTO perfiles_trabajador (
      usuario_id, categoria_id, titulo, descripcion, experiencia,
      ubicacion, tarifa_referencia, tarifa_referencial, precio_desde,
      disponibilidad, disponible
    )
    SELECT u.id, c.id,
           'Carpintero',
           'Realizo trabajos de carpintería, reparación de muebles y mantenimiento general.',
           '3 años de experiencia en carpintería.',
           'Ambato',
           10.00,
           10.00,
           10.00,
           'Disponible',
           1
    FROM usuarios u, categorias c
    WHERE u.email = 'danilogarcia457@gmail.com'
      AND c.nombre = 'Carpintería'
    ON CONFLICT (usuario_id) DO NOTHING;

    INSERT INTO perfiles_trabajador (
      usuario_id, categoria_id, titulo, descripcion, experiencia,
      ubicacion, tarifa_referencia, tarifa_referencial, precio_desde,
      disponibilidad, disponible
    )
    SELECT u.id, c.id,
           'Electricista',
           'Técnica en instalaciones eléctricas residenciales.',
           '5 años de experiencia en instalaciones y reparaciones eléctricas.',
           'Norte',
           25.00,
           25.00,
           25.00,
           'Disponible',
           1
    FROM usuarios u, categorias c
    WHERE u.email = 'ana.gomez@oficiosya.com'
      AND c.nombre = 'Electricidad'
    ON CONFLICT (usuario_id) DO NOTHING;

    INSERT INTO perfiles_trabajador (
      usuario_id, categoria_id, titulo, descripcion, experiencia,
      ubicacion, tarifa_referencia, tarifa_referencial, precio_desde,
      disponibilidad, disponible
    )
    SELECT u.id, c.id,
           'Plomero',
           'Plomero con experiencia en fugas, baños, tuberías y mantenimiento.',
           '4 años de experiencia en plomería.',
           'Centro',
           20.00,
           20.00,
           20.00,
           'Disponible',
           1
    FROM usuarios u, categorias c
    WHERE u.email = 'carlos.perez@oficiosya.com'
      AND c.nombre = 'Plomería'
    ON CONFLICT (usuario_id) DO NOTHING;

    INSERT INTO perfiles_trabajador (
      usuario_id, categoria_id, titulo, descripcion, experiencia,
      ubicacion, tarifa_referencia, tarifa_referencial, precio_desde,
      disponibilidad, disponible
    )
    SELECT u.id, c.id,
           'Pintor',
           'Pintor profesional para interiores y exteriores.',
           '6 años de experiencia en pintura y acabados.',
           'Sur',
           30.00,
           30.00,
           30.00,
           'Disponible',
           1
    FROM usuarios u, categorias c
    WHERE u.email = 'luis.mora@oficiosya.com'
      AND c.nombre = 'Pintura'
    ON CONFLICT (usuario_id) DO NOTHING;
  `);

  await pgPool.query(`
    INSERT INTO solicitudes (
      cliente_id, categoria_id, titulo, descripcion, presupuesto,
      urgencia, zona, ciudad, direccion, estado, estado_recorrido
    )
    SELECT u.id, c.id,
           'Reparar fuga de agua',
           'Necesito reparar una fuga de agua en el baño principal.',
           25.00,
           'media',
           'Centro',
           'Ambato',
           'Av. Cevallos y Mera',
           'abierta',
           'pendiente'
    FROM usuarios u, categorias c
    WHERE u.email = 'fernando@oficiosya.com'
      AND c.nombre = 'Plomería'
      AND NOT EXISTS (
        SELECT 1 FROM solicitudes WHERE titulo = 'Reparar fuga de agua'
      );

    INSERT INTO solicitudes (
      cliente_id, categoria_id, titulo, descripcion, presupuesto,
      urgencia, zona, ciudad, direccion, estado, estado_recorrido
    )
    SELECT u.id, c.id,
           'Instalar tomacorriente',
           'Necesito instalar un tomacorriente nuevo en la sala.',
           18.00,
           'baja',
           'Norte',
           'Ambato',
           'Sector Ficoa',
           'abierta',
           'pendiente'
    FROM usuarios u, categorias c
    WHERE u.email = 'fernando@oficiosya.com'
      AND c.nombre = 'Electricidad'
      AND NOT EXISTS (
        SELECT 1 FROM solicitudes WHERE titulo = 'Instalar tomacorriente'
      );
  `);

  console.log('Datos iniciales insertados correctamente.');
}

async function initDb() {
  try {
    await crearTablas();
    await insertarDatosIniciales();
    console.log('Base de datos inicializada correctamente.');
  } catch (error) {
    console.error('Error inicializando base de datos:', error.message);
    throw error;
  }
}

if (require.main === module) {
  initDb()
    .then(async () => {
      await pgPool.end();
      process.exit(0);
    })
    .catch(async () => {
      await pgPool.end();
      process.exit(1);
    });
}

module.exports = initDb;