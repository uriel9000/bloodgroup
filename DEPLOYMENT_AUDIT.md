# Deployment Audit

## Recommended Split

- GitHub repository: keep the full source tree, documentation, SQL schemas, and frontend/backend code.
- Vercel deployment: deploy only the static frontend assets from this repo.
- Backend hosting: deploy `api/` and `admin-panel/backend/` to a PHP-capable host with MySQL.

Vercel is prepared here as a static host for:

- `index.html`
- `app.html`
- `css/`
- `js/`
- `assets/`
- `manifest.json`
- `sw.js`
- `favicon.ico`
- `admin-panel/frontend/`

## Keep In GitHub

- Frontend files under `css/`, `js/`, `assets/`, and `admin-panel/frontend/`
- Backend source under `api/` and `admin-panel/backend/`
- Database schemas: `schema.sql`, `schema_billing.sql`
- Deployment and project docs

## Do Not Commit

- `.agents/`
- `.vercel/`
- `admin-panel/backend/.env`
- Any real secret-bearing `.env` files
- OS junk like `.DS_Store` and `Thumbs.db`

## Excluded From Vercel

The new `.vercelignore` keeps these out of the static deployment:

- `api/`
- `admin-panel/backend/`
- `*.sql`
- `*.ps1`
- `*.md`
- `.htaccess`
- `check_settings.php`
- `clear_cache.php`
- `setup_db.php`
- `test_*.php`
- `tmp_*.php`

## Files That Look Temporary Or Local-Only

These are useful during development or setup, but should not be part of the Vercel deployment:

- `check_settings.php`
- `clear_cache.php`
- `setup_db.php`
- `test_500.php`
- `test_ai.php`
- `test_models.php`
- `tmp_admins_setup.php`
- `tmp_billing_setup.php`
- `tmp_heatmap_setup.php`
- `tmp_seed_tenant.php`
- `replace_colors.ps1`
- `sync_theme.ps1`
- `admin-panel/frontend/assets/js/billing.js` (legacy prototype, excluded from Vercel in favor of `billing.runtime.js`)

## Backend Deployment Notes

- `api/calculate.php` and the admin APIs require PHP plus MySQL.
- `admin-panel/backend/.env` is the effective backend env file path used by the code.
- The static frontend now supports runtime API base overrides via `js/runtime-config.js`.
