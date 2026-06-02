const { Pool } = require('pg');
require('dotenv').config();

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.PG_URL;

const poolConfig = connectionString
  ? {
      connectionString,
      ssl:
        process.env.NODE_ENV === 'production'
          ? { rejectUnauthorized: false }
          : false
    }
  : {
      host: process.env.PGHOST || process.env.DB_HOST || 'localhost',
      port: Number(process.env.PGPORT || process.env.DB_PORT || 5432),
      database: process.env.PGDATABASE || process.env.DB_DATABASE || 'oficiosya',
      user: process.env.PGUSER || process.env.DB_USER || 'postgres',
      password: process.env.PGPASSWORD || process.env.DB_PASSWORD || 'postgres',
      ssl:
        process.env.NODE_ENV === 'production' &&
        process.env.DB_SSL !== 'false'
          ? { rejectUnauthorized: false }
          : false
    };

const pgPool = new Pool(poolConfig);

/*
  Capa de compatibilidad para que tus controladores antiguos
  que usaban estilo SQL Server funcionen con PostgreSQL.
*/

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
  DateTime: 'timestamp'
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

function appendReturning(query, returning) {
  let q = query.trim().replace(/;\s*$/, '');

  if (/\bRETURNING\b/i.test(q)) {
    return q;
  }

  return `${q} RETURNING ${returning}`;
}

function convertOutputClause(query) {
  let q = query;
  let returning = null;

  q = q.replace(/OUTPUT\s+INSERTED\.\*/gi, () => {
    returning = '*';
    return '';
  });

  q = q.replace(/OUTPUT\s+DELETED\.\*/gi, () => {
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

  if (returning) {
    q = appendReturning(q, returning);
  }

  return q;
}

function convertTop(query) {
  const top = query.match(/^\s*SELECT\s+TOP\s+(\d+)\s+/i);

  if (!top) {
    return query;
  }

  const n = top[1];

  let q = query.replace(/^\s*SELECT\s+TOP\s+\d+\s+/i, 'SELECT ');

  if (!/\bLIMIT\s+\d+\b/i.test(q)) {
    q = q.trim().replace(/;\s*$/, '') + ` LIMIT ${n}`;
  }

  return q;
}

function convertSqlServerToPostgres(query) {
  let q = query;

  q = q.replace(/\r\n/g, '\n');

  q = convertOutputClause(q);
  q = convertTop(q);

  q = q.replace(/\bGETDATE\s*\(\s*\)/gi, 'NOW()');
  q = q.replace(/\bISNULL\s*\(/gi, 'COALESCE(');
  q = q.replace(/\bLEN\s*\(/gi, 'LENGTH(');

  q = q.replace(
    /CAST\s*\(([^()]+?)\s+AS\s+FLOAT\s*\)/gi,
    'CAST($1 AS DOUBLE PRECISION)'
  );

  q = q.replace(/\bBIT\b/gi, 'INTEGER');
  q = q.replace(/\bNVARCHAR\s*\(\s*MAX\s*\)/gi, 'TEXT');
  q = q.replace(/\bVARCHAR\s*\(\s*MAX\s*\)/gi, 'TEXT');
  q = q.replace(/\[([^\]]+)\]/g, '$1');

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
    const result = await pgPool.query(converted, values);

    return {
      recordset: result.rows,
      rows: result.rows,
      rowCount: result.rowCount
    };
  },

  raw: pgPool
};

const poolPromise = pgPool
  .connect()
  .then((client) => {
    client.release();
    console.log('Conectado correctamente a PostgreSQL');
    return compatPool;
  })
  .catch((error) => {
    console.error('Error al conectar con PostgreSQL:', error.message);
    throw error;
  });

module.exports = {
  sql,
  poolPromise,
  pgPool,
  convertSqlServerToPostgres
};