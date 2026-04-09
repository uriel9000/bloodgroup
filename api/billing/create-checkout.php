<?php
/**
 * Blood Group Predictor - Stripe Checkout Session Creator
 * POST /api/billing/create-checkout.php
 *
 * Body: { tenant_id, plan_id, success_url?, cancel_url? }
 */
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/../../admin_v2/includes/db.php';
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/stripe_client.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$body = json_decode(file_get_contents('php://input'), true);
$tenantId = (int) ($body['tenant_id'] ?? 0);
$planId = (int) ($body['plan_id'] ?? 0);

if (!$tenantId || !$planId) {
    http_response_code(400);
    echo json_encode(['error' => 'tenant_id and plan_id are required']);
    exit;
}

// Fetch plan from DB
$planStmt = $pdo->prepare("SELECT * FROM plans WHERE id = ? LIMIT 1");
$planStmt->execute([$planId]);
$plan = $planStmt->fetch();
if (!$plan) {
    http_response_code(404);
    echo json_encode(['error' => 'Plan not found']);
    exit;
}

if (empty($plan['stripe_price_id']) || str_starts_with($plan['stripe_price_id'], 'price_XXX')) {
    http_response_code(400);
    echo json_encode(['error' => 'Plan has no Stripe Price ID configured yet. Update plans.stripe_price_id with real IDs.']);
    exit;
}

// Fetch tenant
$tenantStmt = $pdo->prepare("SELECT * FROM tenants WHERE id = ? LIMIT 1");
$tenantStmt->execute([$tenantId]);
$tenant = $tenantStmt->fetch();
if (!$tenant) {
    http_response_code(404);
    echo json_encode(['error' => 'Tenant not found']);
    exit;
}

$stripe = new StripeClient(STRIPE_SECRET_KEY);

// Create Customer if doesn't exist
$customerId = $tenant['stripe_customer_id'];
if (!$customerId) {
    $customer = $stripe->createCustomer($tenant['email'] ?? '', $tenant['name'], (string) $tenantId);
    $customerId = $customer['id'];
    $pdo->prepare("UPDATE tenants SET stripe_customer_id = ? WHERE id = ?")->execute([$customerId, $tenantId]);
}

$successUrl = $body['success_url'] ?? APP_BASE_URL . '/admin-panel/billing.html?session_id={CHECKOUT_SESSION_ID}&status=success';
$cancelUrl = $body['cancel_url'] ?? APP_BASE_URL . '/admin-panel/billing.html?status=cancelled';

// Create Checkout Session
$session = $stripe->createCheckoutSession([
    'mode' => 'subscription',
    'customer' => $customerId,
    'success_url' => $successUrl,
    'cancel_url' => $cancelUrl,
    'metadata' => ['tenant_id' => $tenantId],
    'line_items' => [
        ['price' => $plan['stripe_price_id'], 'quantity' => 1]
    ],
]);

echo json_encode(['checkout_url' => $session['url']]);
