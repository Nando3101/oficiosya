require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { pgPool } = require('../config/db');

async function initDb() {
  try {
    const schemaPath = path.join(__dirname, 'schema_postgres.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    console.log('Inicializando base de datos PostgreSQL...');
    await pgPool.query(schema);
    console.log('Base de datos inicializada correctamente.');

    process.exit(0);
  } catch (error) {
    console.error('Error inicializando base de datos:', error.message);
    process.exit(1);
  }
}

initDb();