const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const compression = require('compression');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3000;

/* =====================================================
   MIDDLEWARES
===================================================== */

app.use(compression());

app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

/* =====================================================
   ARCHIVOS ESTÁTICOS
===================================================== */

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

/* =====================================================
   RUTA BASE API
===================================================== */

app.get('/api', (req, res) => {
  res.json({
    ok: true,
    mensaje: 'API OficiosYA funcionando correctamente',
    rutas: [
      '/api/auth/debug',
      '/api/auth/login',
      '/api/auth/registro',
      '/api/auth/register',
      '/api/perfil/me',
      '/api/solicitudes',
      '/api/trabajadores'
    ]
  });
});

/* =====================================================
   DEBUG BASE DE DATOS
===================================================== */

app.get('/api/debug/db', async (req, res) => {
  try {
    const { pgPool } = require('./config/db');

    const result = await pgPool.query(`
      SELECT 
        current_database() AS database,
        current_user AS usuario,
        NOW() AS fecha
    `);

    res.json({
      ok: true,
      mensaje: 'Conexión a PostgreSQL correcta',
      data: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      mensaje: 'Error conectando a PostgreSQL',
      error: error.message
    });
  }
});

/* =====================================================
   CARGAR RUTAS SEGURO
===================================================== */

function cargarRuta(rutaBase, archivoRuta) {
  try {
    const ruta = require(archivoRuta);
    app.use(rutaBase, ruta);
    console.log(`✓ Ruta cargada: ${rutaBase}`);
    return true;
  } catch (error) {
    console.error(`✗ ERROR CARGANDO RUTA: ${rutaBase}`);
    console.error(`  Archivo: ${archivoRuta}`);
    console.error(`  Detalle: ${error.message}`);
    console.error(`  Stack: ${error.stack}`);
    return false;
  }
}

/* =====================================================
   RUTAS BACKEND
===================================================== */

const rutasBackend = [
  ['/api/auth', './routes/auth.routes'],
  ['/api/perfil', './routes/perfil.routes'],
  ['/api/solicitudes', './routes/solicitud.routes'],
  ['/api/trabajadores', './routes/trabajador.routes'],
  ['/api/calificaciones', './routes/calificacion.routes'],
  ['/api/chat', './routes/chat.routes'],
  ['/api/notificaciones', './routes/notificacion.routes'],
  ['/api/admin', './routes/admin.routes'],
  ['/api/stats', './routes/stats.routes'],
  ['/api/trabajos', './routes/trabajo.routes'],
  ['/api/estado', './routes/estado.routes']
];

console.log('\n=== INICIANDO CARGA DE RUTAS ===\n');
rutasBackend.forEach(([base, archivo]) => cargarRuta(base, archivo));
console.log('\n=== RUTAS CARGADAS ===\n');

/* =====================================================
   FRONTEND
===================================================== */

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/pages/:page', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pages', req.params.page));
});

/* =====================================================
   RUTA NO ENCONTRADA
===================================================== */

app.use((req, res) => {
  res.status(404).json({
    ok: false,
    mensaje: 'Ruta no encontrada',
    ruta: req.originalUrl
  });
});

/* =====================================================
   SERVIDOR
===================================================== */

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor OficiosYA corriendo en puerto ${PORT}`);
});