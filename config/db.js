const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('ERROR: Falta DATABASE_URL.');
  console.error('Configura DATABASE_URL en Railway → servicio oficiosya → Variables.');
  process.exit(1);
}

const usarSSL =
  process.env.NODE_ENV === 'production' &&
  !connectionString.includes('railway.internal');

const pgPool = new Pool({
  connectionString,
  ssl: usarSSL ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

pgPool.on('connect', () => {
  console.log('Conectado correctamente a PostgreSQL');
});

pgPool.on('error', (error) => {
  console.error('Error inesperado en PostgreSQL:', error.message);
});

const sql = {
  Int: 'int',
  BigInt: 'bigint',
  Bit: 'bit',
  Float: 'float',
  Decimal: () => 'decimal',
  Numeric: () => 'numeric',
  VarChar: () => 'varchar',
  NVarChar: () => 'varchar',
  Text: 'text',
  Date: 'date',
  DateTime: 'timestamp',
  MAX: 'max'
};

function normalizeParams(query, paramsByName) {
  const values = [];
  const positions = new Map();

  const text = query.replace(/@([A-Za-z_][A-Za-z0-9_]*)/g, (_, name) => {
    if (!positions.has(name)) {
      positions.set(name, values.length + 1);

      values.push(
        Object.prototype.hasOwnProperty.call(paramsByName, name)
          ? paramsByName[name]
          : null
      );
    }

    return `$${positions.get(name)}`;
  });

  return { text, values };
}

function convertTop(query) {
  const match = query.match(/^\s*SELECT\s+TOP\s+(\d+)\s+/i);

  if (!match) return query;

  const limit = match[1];

  let converted = query.replace(/^\s*SELECT\s+TOP\s+\d+\s+/i, 'SELECT ');

  if (!/\bLIMIT\b/i.test(converted)) {
    converted = converted.trim().replace(/;\s*$/, '') + ` LIMIT ${limit}`;
  }

  return converted;
}

function convertOutputClause(query) {
  let q = query;
  let returning = null;

  q = q.replace(/OUTPUT\s+INSERTED\.\*/gi, () => {
    returning = '*';
    return '';
  });

  q = q.replace(
    /OUTPUT\s+((?:INSERTED|DELETED)\.[\w]+(?:\s*,\s*(?:INSERTED|DELETED)\.[\w]+)*)/gi,
    (_, cols) => {
      returning = cols
        .replace(/(?:INSERTED|DELETED)\./gi, '')
        .replace(/\s+/g, ' ')
        .trim();

      return '';
    }
  );

  if (returning && !/\bRETURNING\b/i.test(q)) {
    q = q.trim().replace(/;\s*$/, '') + ` RETURNING ${returning}`;
  }

  return q;
}

function convertSqlServerToPostgres(query) {
  let q = query;

  q = q.replace(/\r\n/g, '\n');
  q = convertOutputClause(q);
  q = convertTop(q);

  q = q.replace(/\bGETDATE\s*\(\s*\)/gi, 'NOW()');
  q = q.replace(/\bGETUTCDATE\s*\(\s*\)/gi, 'NOW()');
  q = q.replace(/\bISNULL\s*\(/gi, 'COALESCE(');
  q = q.replace(/\bLEN\s*\(/gi, 'LENGTH(');

  q = q.replace(/\bBIT\b/gi, 'INTEGER');
  q = q.replace(/\bDATETIME\b/gi, 'TIMESTAMP');

  q = q.replace(/\bNVARCHAR\s*\(\s*MAX\s*\)/gi, 'TEXT');
  q = q.replace(/\bVARCHAR\s*\(\s*MAX\s*\)/gi, 'TEXT');
  q = q.replace(/\bNVARCHAR\s*\(\s*\d+\s*\)/gi, 'VARCHAR');
  q = q.replace(/\bNCHAR\s*\(\s*\d+\s*\)/gi, 'CHAR');

  q = q.replace(/\[([^\]]+)\]/g, '$1');

  q = q.replace(
    /CAST\s*\(([^()]+?)\s+AS\s+FLOAT\s*\)/gi,
    'CAST($1 AS DOUBLE PRECISION)'
  );

  return q;
}

class RequestCompat {
  constructor() {
    this.params = {};
  }

  input(name, typeOrValue, maybeValue) {
    this.params[name] = arguments.length >= 3 ? maybeValue : typeOrValue;
    return this;
  }

  async query(queryText) {
    const converted = convertSqlServerToPostgres(queryText);
    const { text, values } = normalizeParams(converted, this.params);

    try {
      const result = await pgPool.query(text, values);

      return {
        recordset: result.rows,
        rows: result.rows,
        rowCount: result.rowCount
      };
    } catch (error) {
      console.error('\nError SQL PostgreSQL');
      console.error('Consulta original:', queryText);
      console.error('Consulta convertida:', text);
      console.error('Valores:', values);
      console.error('Detalle:', error.message);
      throw error;
    }
  }
}

const compatPool = {
  request() {
    return new RequestCompat();
  },

  async query(text, values = []) {
    const converted = convertSqlServerToPostgres(text);

    try {
      const result = await pgPool.query(converted, values);

      return {
        recordset: result.rows,
        rows: result.rows,
        rowCount: result.rowCount
      };
    } catch (error) {
      console.error('\nError SQL PostgreSQL');
      console.error('Consulta original:', text);
      console.error('Consulta convertida:', converted);
      console.error('Valores:', values);
      console.error('Detalle:', error.message);
      throw error;
    }
  },

  raw: pgPool
};

const poolPromise = pgPool
  .connect()
  .then((client) => {
    client.release();
    console.log('Pool PostgreSQL listo');
    return compatPool;
  })
  .catch((error) => {
    console.error('Error al conectar con PostgreSQL:', error.message);
    throw error;
  });

async function probarConexion() {
  try {
    const result = await pgPool.query(`
      SELECT 
        current_database() AS database,
        current_user AS usuario,
        NOW() AS fecha
    `);

    console.log('Conexión PostgreSQL verificada:', result.rows[0]);

    return {
      ok: true,
      data: result.rows[0]
    };
  } catch (error) {
    console.error('Error al probar conexión PostgreSQL:', error.message);

    return {
      ok: false,
      error: error.message
    };
  }
}

module.exports = {
  sql,
  poolPromise,
  pgPool,
  probarConexion,
  convertSqlServerToPostgres
};