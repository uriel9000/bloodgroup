<?php
/**
 * Blood Group Predictor - Billing Configuration
 * Set your Stripe keys here OR via environment variables.
 */

define('STRIPE_SECRET_KEY', getenv('STRIPE_SECRET_KEY') ?: 'sk_test_REPLACE_ME');
define('STRIPE_WEBHOOK_SECRET', getenv('STRIPE_WEBHOOK_SECRET') ?: 'whsec_REPLACE_ME');
define('APP_BASE_URL', getenv('APP_BASE_URL') ?: 'http://localhost/bloodgroup');
