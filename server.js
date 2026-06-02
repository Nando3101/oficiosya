require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const compression = require('compression');
const helmet = require('helmet');
const http = require('http');
const { Server } = require('socket.io');

const { pgPool } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

/* =====================================================
   MIDDLEWARES GENERALES
===================================================== */

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: false
  })
);

app.use(compression());

app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

/* =====================================================
   ARCHIVOS ESTÁTICOS
===================================================== */

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

/* =====================================================
   SOCKET.IO
===================================================== */

const io = new Server(server, {
  cors: {
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
  },
  transports: ['polling', 'websocket']
});

app.set('io', io);

io.on('connection', (socket) => {
  console.log('Usuario conectado por Socket.IO:', socket.id);

  socket.on('unirse_usuario', (usuarioId) => {
    if (!usuarioId) return;
    socket.join(`usuario_${usuarioId}`);
  });

  socket.on('unirse_solicitud', (solicitudId) => {
    if (!solicitudId) return;
    socket.join(`solicitud_${solicitudId}`);
  });

  socket.on('ubicacion_trabajador', (data) => {
    if (!data || !data.solicitud_id) return;

    io.to(`solicitud_${data.solicitud_id}`).emit(
      'ubicacion_trabajador_actualizada',
      {
        ...data,
        fecha: new Date()
      }
    );
  });

  socket.on('mensaje_chat', (data) => {
    if (!data || !data.solicitud_id) return;

    io.to(`solicitud_${data.solicitud_id}`).emit('mensaje_recibido', {
      ...data,
      createdat: new Date()
    });

    if (data.receptor_id) {
      io.to(`usuario_${data.receptor_id}`).emit('notificacion', {
        tipo: 'mensaje',
        titulo: 'Nuevo mensaje',
        mensaje: 'Tienes un nuevo mensaje en una solicitud.',
        createdat: new Date()
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('Usuario desconectado:', socket.id);
  });
});

/* =====================================================
   CARGAR RUTAS DE FORMA SEGURA
===================================================== */

function cargarRuta(ruta, archivo) {
  try {
    const route = require(archivo);
    app.use(ruta, route);
    console.log(`Ruta cargada: ${ruta}`);
  } catch (error) {
    console.log(`No se pudo cargar la ruta: ${ruta}`);
    console.log(`Detalle: ${error.message}`);
  }
}

/* =====================================================
   RUTAS API
===================================================== */

cargarRuta('/api/auth', './routes/auth.routes');
cargarRuta('/api/perfil', './routes/perfil.routes');
cargarRuta('/api/solicitudes', './routes/solicitud.routes');
cargarRuta('/api/trabajadores', './routes/trabajador.routes');
cargarRuta('/api/calificaciones', './routes/calificacion.routes');
cargarRuta('/api/chat', './routes/chat.routes');
cargarRuta('/api/notificaciones', './routes/notificacion.routes');
cargarRuta('/api/admin', './routes/admin.routes');
cargarRuta('/api/stats', './routes/stats.routes');
cargarRuta('/api/trabajos', './routes/trabajo.routes');
cargarRuta('/api/estado', './routes/estado.routes');

/* =====================================================
   RUTA DE PRUEBA PRINCIPAL
===================================================== */

app.get('/api', (req, res) => {
  res.json({
    ok: true,
    mensaje: 'API OficiosYA funcionando correctamente.',
    socket: true,
    database: process.env.DATABASE_URL
      ? 'PostgreSQL configurado'
      : 'Falta DATABASE_URL'
  });
});

/* =====================================================
   RUTA DE DIAGNÓSTICO POSTGRESQL
===================================================== */

app.get('/api/debug/db', async (req, res) => {
  try {
    const conexion = await pgPool.query(`
      SELECT 
        current_database() AS database,
        current_user AS usuario
    `);

    const tablas = await pgPool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    let totalCategorias = '0';
    let totalUsuarios = '0';
    let totalProfesionales = '0';

    try {
      const categorias = await pgPool.query(`
        SELECT COUNT(*) AS total
        FROM categorias
      `);

      totalCategorias = categorias.rows[0].total;
    } catch (error) {
      totalCategorias = 'ERROR: ' + error.message;
    }

    try {
      const usuarios = await pgPool.query(`
        SELECT COUNT(*) AS total
        FROM usuarios
      `);

      totalUsuarios = usuarios.rows[0].total;
    } catch (error) {
      totalUsuarios = 'ERROR: ' + error.message;
    }

    try {
      const profesionales = await pgPool.query(`
        SELECT COUNT(*) AS total
        FROM usuarios u
        LEFT JOIN perfiles_trabajador p 
          ON p.usuario_id = u.id
        WHERE u.es_trabajador = 1
           OR u.rol IN ('trabajador', 'cliente_trabajador')
           OR p.id IS NOT NULL
      `);

      totalProfesionales = profesionales.rows[0].total;
    } catch (error) {
      totalProfesionales = 'ERROR: ' + error.message;
    }

    return res.json({
      ok: true,
      mensaje: 'Backend conectado a PostgreSQL',
      conexion: conexion.rows[0],
      tablas: tablas.rows,
      total_categorias: totalCategorias,
      total_usuarios: totalUsuarios,
      total_profesionales: totalProfesionales
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      mensaje: 'Error verificando PostgreSQL',
      error: error.message
    });
  }
});

/* =====================================================
   RUTA PRINCIPAL DEL FRONTEND
===================================================== */

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/* =====================================================
   MANEJO DE RUTAS NO ENCONTRADAS
===================================================== */

app.use((req, res) => {
  if (!req.originalUrl.startsWith('/api')) {
    return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }

  return res.status(404).json({
    ok: false,
    error: 'Ruta no encontrada.',
    ruta: req.originalUrl
  });
});

/* =====================================================
   MANEJO GLOBAL DE ERRORES
===================================================== */

app.use((error, req, res, next) => {
  console.error('Error global:', error);

  return res.status(500).json({
    ok: false,
    mensaje: 'Error interno del servidor.',
    error: error.message
  });
});

/* =====================================================
   INICIAR SERVIDOR
===================================================== */

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor OficiosYA corriendo en puerto ${PORT}`);
});