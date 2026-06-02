# OficiosYA listo para Railway + PostgreSQL

Este ZIP está preparado para subir el proyecto completo a Railway usando **Node.js + Express + Socket.IO + PostgreSQL**.

## Qué incluye

- Frontend dentro de `/public`.
- Backend y frontend funcionando en el mismo dominio.
- Configuración `public/js/config.js` usando `window.location.origin`.
- Conexión a PostgreSQL con `pg`.
- Capa de compatibilidad para muchas consultas antiguas escritas con estilo SQL Server.
- Script de inicialización de base de datos: `scripts/schema_postgres.sql`.
- Inicialización automática si configuras `AUTO_INIT_DB=true`.

## Pasos rápidos en Railway

1. Sube esta carpeta a GitHub.
2. En Railway: `New Project` > `Deploy from GitHub repo`.
3. Agrega un servicio PostgreSQL dentro del mismo proyecto.
4. En tu servicio Node.js, agrega estas variables:

```env
NODE_ENV=production
JWT_SECRET=CAMBIA_ESTA_CLAVE_SEGURA_OFICIOSYA_2026
JWT_EXPIRES=7d
AUTO_INIT_DB=true
```

5. Vincula la variable `DATABASE_URL` del PostgreSQL al servicio Node.js. Railway normalmente la crea automáticamente si conectas variables del servicio Postgres.
6. Genera dominio público en `Settings > Networking > Generate Domain`.
7. Abre la URL pública.

## Usuarios de prueba

Administrador:

```txt
admin@oficiosya.com
Admin2026!
```

Cliente:

```txt
fernando@oficiosya.com
123456
```

Trabajadores:

```txt
danilogarcia457@gmail.com / 123456
ana.gomez@oficiosya.com / 123456
carlos.perez@oficiosya.com / 123456
luis.mora@oficiosya.com / 123456
```

## Importante

El proyecto original estaba hecho para SQL Server. Esta versión usa PostgreSQL y trae una capa de compatibilidad para reducir cambios. Si Railway muestra un error SQL específico en los logs, copia ese error para ajustar la consulta puntual.
