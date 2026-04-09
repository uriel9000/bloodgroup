-- Blood Group Predictor - Billing Schema
-- Run this ONCE against: blood_predictor DB
-- Or use tmp_billing_setup.php via browser for automated setup.

-- Tenants Table
CREATE TABLE IF NOT EXISTS tenants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Extend tenants with Stripe fields (run as ALTER if table already exists)
ALTER TABLE tenants
    ADD COLUMN stripe_customer_id     VARCHAR(255),
    ADD COLUMN stripe_subscription_id VARCHAR(255),
    ADD COLUMN plan                   VARCHAR(50),
    ADD COLUMN billing_status         VARCHAR(50);

-- Plans Table
CREATE TABLE IF NOT EXISTS plans (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(100),
    price           DECIMAL(10,2),
    billing_cycle   ENUM('monthly','yearly'),
    max_calculations INT,
    max_ai_requests  INT,
    stripe_price_id  VARCHAR(255),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed default plans (update stripe_price_id with real Stripe Price IDs)
INSERT INTO plans (name, price, billing_cycle, max_calculations, max_ai_requests, stripe_price_id) VALUES
    ('Basic Monthly',      9.99,  'monthly', 100,   50,   'price_REPLACE_BASIC'),
    ('Pro Monthly',        29.99, 'monthly', 1000,  500,  'price_REPLACE_PRO'),
    ('Enterprise Monthly', 99.99, 'monthly', 10000, 5000, 'price_REPLACE_ENTERPRISE');

-- Usage Logs Table
CREATE TABLE IF NOT EXISTS usage_logs (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id  INT,
    type       VARCHAR(50),   -- 'calculation' | 'ai_request'
    count      INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_usage_tenant ON usage_logs(tenant_id);

-- Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id         INT,
    stripe_invoice_id VARCHAR(255),
    amount            DECIMAL(10,2),
    status            VARCHAR(50),
    invoice_url       TEXT,
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
