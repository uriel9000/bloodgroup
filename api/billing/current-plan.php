<?php
/**
 * Blood Group Predictor - Current Plan & Usage API
 * GET /api/billing/current-plan.php?tenant_id=X
 */
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/../../admin_v2/includes/db.php';
require_once __DIR__ . '/usage.php';

$tenantId = (int) ($_GET['tenant_id'] ?? 0);
if (!$tenantId) {
    http_response_code(400);
    echo json_encode(['error' => 'tenant_id required']);
    exit;
}

// Fetch tenant + plan info
$stmt = $pdo->prepare(
    "SELECT t.id, t.name, t.plan, t.billing_status,
            p.price, p.billing_cycle, p.max_calculations, p.max_ai_requests
       FROM tenants t
  LEFT JOIN plans p ON p.name = t.plan
      WHERE t.id = ? LIMIT 1"
);
$stmt->execute([$tenantId]);
$data = $stmt->fetch();

if (!$data) {
    http_response_code(404);
    echo json_encode(['error' => 'Tenant not found']);
    exit;
}

// Usage stats for this month
$usedCalcs = getMonthlyUsage($pdo, $tenantId, 'calculation');
$usedAI = getMonthlyUsage($pdo, $tenantId, 'ai_request');

$maxCalcs = $data['max_calculations'] ?? 15;  // free tier
$maxAI = $data['max_ai_requests'] ?? 15;

echo json_encode([
    'tenant' => ['id' => $data['id'], 'name' => $data['name']],
    'plan' => $data['plan'] ?? 'Free',
    'billing_status' => $data['billing_status'] ?? 'inactive',
    'price' => $data['price'],
    'billing_cycle' => $data['billing_cycle'],
    'usage' => [
        'calculations' => ['used' => $usedCalcs, 'limit' => $maxCalcs],
        'ai_requests' => ['used' => $usedAI, 'limit' => $maxAI],
    ],
]);
