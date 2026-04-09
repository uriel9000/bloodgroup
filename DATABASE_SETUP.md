# Database Setup

## Recommended Choice

For this repo, use an external MySQL-compatible database and keep Vercel for the static/frontend deployment.

Recommended order:

1. PlanetScale
2. TiDB Cloud

## Why PlanetScale Fits This App

- The backend already uses PDO MySQL.
- The schema uses normal MySQL-style features such as `AUTO_INCREMENT`, `ENUM`, and `JSON`.
- I do not see foreign keys, triggers, or stored procedures in the current schema, which keeps it compatible with PlanetScale's MySQL-style model.

That last point is an inference from:

- `schema.sql`
- `schema_billing.sql`

## Env Vars Supported By The Code

The backend now supports both generic DB vars and PlanetScale-style vars:

```env
DB_HOST=
DB_PORT=3306
DB_NAME=
DB_USER=
DB_PASS=
DB_SSL_CA=
DB_SSL_VERIFY_SERVER_CERT=true
```

Or PlanetScale-style:

```env
PLANETSCALE_DB_HOST=
PLANETSCALE_DB=
PLANETSCALE_DB_USERNAME=
PLANETSCALE_DB_PASSWORD=
PLANETSCALE_SSL_CERT_PATH=
```

## Suggested Values

### PlanetScale

Use:

```env
DB_HOST=<your host>                  # or PLANETSCALE_DB_HOST
DB_PORT=3306
DB_NAME=<your database name>         # or PLANETSCALE_DB
DB_USER=<your username>              # or PLANETSCALE_DB_USERNAME
DB_PASS=<your password>              # or PLANETSCALE_DB_PASSWORD
DB_SSL_CA=<path to CA cert>          # or PLANETSCALE_SSL_CERT_PATH
DB_SSL_VERIFY_SERVER_CERT=true
```

### TiDB Cloud

Use the generic vars:

```env
DB_HOST=<your host>
DB_PORT=<your port>                  # often 4000 depending on cluster type
DB_NAME=<your database name>
DB_USER=<your username>
DB_PASS=<your password>
DB_SSL_CA=<path to CA cert if required>
DB_SSL_VERIFY_SERVER_CERT=true
```

## Import Notes

Before importing into a managed database, adjust for these two lines in `schema.sql`:

- `CREATE DATABASE IF NOT EXISTS blood_predictor;`
- `USE blood_predictor;`

Managed providers usually want you to connect to an existing database first, then run only the table/index/seed statements.
