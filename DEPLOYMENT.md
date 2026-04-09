# Blood Group Predictor — Stripe Billing Deployment Guide

## ⚙️ Pre-requisites

| Requirement           | Notes                                                             |
| --------------------- | ----------------------------------------------------------------- |
| PHP 8.0+              | cURL extension enabled                                            |
| MySQL 5.7+            | `blood_predictor` database                                        |
| Stripe Account        | [dashboard.stripe.com](https://dashboard.stripe.com)              |
| Public HTTPS endpoint | Required for webhooks (e.g., Railway, Render, VPS with Nginx/SSL) |

---

## 1. Configure Environment Variables

Copy the example env file and fill in your keys:

```bash
cp admin-panel/backend/.env.example admin-panel/backend/.env
```

Edit `api/billing/config.php` **or** set server environment variables:

```env
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx
APP_BASE_URL=https://your-domain.com/bloodgroup
```

> **NEVER commit real keys to git.** Use `.gitignore` to exclude `api/billing/config.php` or `.env`.

---

## 2. Run Database Migrations

Visit the setup page once in a browser (then **delete it**):

```
http://localhost/bloodgroup/tmp_billing_setup.php
```

Expected output:

```
Table 'tenants' created.
Added stripe_customer_id to tenants.
...
Table 'invoices' created.
```

After successful run, **delete the file** for security:

```bash
rm tmp_billing_setup.php
```

---

## 3. Create Stripe Products & Prices

1. Go to **Stripe Dashboard → Products → Add Product**
2. Create 3 products: Basic, Pro, Enterprise
3. Set recurring prices (monthly)
4. Copy each **Price ID** (starts with `price_`)
5. Update the DB:

```sql
UPDATE plans SET stripe_price_id = 'price_ABC123' WHERE name = 'Basic Monthly';
UPDATE plans SET stripe_price_id = 'price_DEF456' WHERE name = 'Pro Monthly';
UPDATE plans SET stripe_price_id = 'price_GHI789' WHERE name = 'Enterprise Monthly';
```

---

## 4. Set Up Stripe Webhook

### Local Development (Stripe CLI)

```bash
# Install Stripe CLI first: https://stripe.com/docs/stripe-cli
stripe login
stripe listen --forward-to http://localhost/bloodgroup/api/billing/webhook.php
# Copy the webhook signing secret shown → paste into config.php
```

### Production (Stripe Dashboard)

1. Go to **Stripe Dashboard → Webhooks → Add Endpoint**
2. Endpoint URL: `https://your-domain.com/bloodgroup/api/billing/webhook.php`
3. Select events to listen to:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy **Signing Secret** → update `STRIPE_WEBHOOK_SECRET` in `config.php`

---

## 5. Test the Billing Flow (Test Mode)

Use Stripe **test keys** (`sk_test_...`) and these test card numbers:

| Scenario                | Card Number           |
| ----------------------- | --------------------- |
| Payment succeeds        | `4242 4242 4242 4242` |
| Payment fails           | `4000 0000 0000 0002` |
| Requires authentication | `4000 0025 0000 3155` |

Use any future expiry date, any 3-digit CVC.

---

## 6. Deploying Backend (Railway / Render)

### Railway

1. Push your code to GitHub
2. Create a new Railway project → Deploy from GitHub
3. Set environment variables in Railway dashboard
4. Railway provides a public HTTPS URL — use for webhook endpoint

### Self-hosted VPS (Nginx + PHP-FPM)

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;
    root /var/www/bloodgroup;
    index index.html index.php;

    location /api/ {
        try_files $uri $uri/ /api/index.php?$query_string;
    }
    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    }
}
```

---

## 7. Frontend (Vercel)

The billing UI is static HTML — deploy `admin-panel/frontend/` to Vercel:

1. `vercel init` in project root
2. Set **Output Directory** to `admin-panel/frontend`
3. Update `API_BASE` in `billing.js` to point to your production PHP backend URL:

```js
// js/runtime-config.js
window.BLOODGROUP_CONFIG = {
  appApiBase: "https://your-backend.railway.app/api",
  adminApiBase: "https://your-backend.railway.app/admin-panel/backend/api",
  billingApiBase: "https://your-backend.railway.app/api/billing"
};
```

---

## 8. Security Checklist

- [ ] `STRIPE_SECRET_KEY` is **never** in public JS code
- [ ] Webhook endpoint verifies Stripe signature (already implemented)
- [ ] `tmp_billing_setup.php` is deleted after running
- [ ] DB credentials are in env vars, not hardcoded
- [ ] Only Owner/Admin roles can access billing pages (add auth check to API endpoints)

---

## 9. Adding Usage Tracking to Existing Endpoints

### In `api/calculate.php`

```php
require_once __DIR__ . '/../api/billing/usage.php';
// At the start of your calculation logic:
enforceUsageLimit($pdo, $tenantId, 'calculation');
// After successful calculation:
logUsage($pdo, $tenantId, 'calculation');
```

### In AI generation endpoint

```php
require_once __DIR__ . '/../../api/billing/usage.php';
enforceUsageLimit($pdo, $tenantId, 'ai_request');
// After successful AI call:
logUsage($pdo, $tenantId, 'ai_request');
```

---

## 📁 New File Summary

```
api/billing/
├── config.php              ← Stripe keys (env-based)
├── stripe_client.php       ← cURL Stripe HTTP client (no Composer needed)
├── usage.php               ← logUsage() + enforceUsageLimit()
├── create-checkout.php     ← POST: initiates Stripe Checkout
├── cancel-subscription.php ← POST: cancels Stripe subscription
├── current-plan.php        ← GET: returns plan + usage stats
├── invoices.php            ← GET: paginated invoice list
├── plans.php               ← GET: all available plans
└── webhook.php             ← POST: handles Stripe webhook events

admin-panel/frontend/
├── pages/billing.html      ← Billing dashboard UI
└── assets/js/billing.js    ← Billing dashboard JS logic
```
