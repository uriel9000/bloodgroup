<?php
/**
 * Blood Group Predictor - Cancel Subscription
 * POST /api/billing/cancel-subscription.php
 */
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
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

if (!$tenantId) {
    http_response_code(400);
    echo json_encode(['error' => 'tenant_id required']);
    exit;
}

$stmt = $pdo->prepare("SELECT stripe_subscription_id FROM tenants WHERE id = ? LIMIT 1");
$stmt->execute([$tenantId]);
$tenant = $stmt->fetch();

if (!$tenant || !$tenant['stripe_subscription_id']) {
    http_response_code(404);
    echo json_encode(['error' => 'No active subscription found']);
    exit;
}

try {
    $stripe = new StripeClient(STRIPE_SECRET_KEY);
    $stripe->cancelSubscription($tenant['stripe_subscription_id']);

    $pdo->prepare("UPDATE tenants SET billing_status = 'canceled' WHERE id = ?")
        ->execute([$tenantId]);

    echo json_encode(['success' => true]);
} catch (RuntimeException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
