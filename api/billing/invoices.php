<?php
/**
 * Blood Group Predictor - Invoices API
 * GET /api/billing/invoices.php?tenant_id=X
 */
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/../../admin_v2/includes/db.php';

$tenantId = (int) ($_GET['tenant_id'] ?? 0);
if (!$tenantId) {
    http_response_code(400);
    echo json_encode(['error' => 'tenant_id required']);
    exit;
}

$page = max(1, (int) ($_GET['page'] ?? 1));
$limit = 10;
$offset = ($page - 1) * $limit;

$stmt = $pdo->prepare(
    "SELECT id, stripe_invoice_id, amount, status, invoice_url, created_at
       FROM invoices
      WHERE tenant_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?"
);
$stmt->execute([$tenantId, $limit, $offset]);
$invoices = $stmt->fetchAll();

$countStmt = $pdo->prepare("SELECT COUNT(*) FROM invoices WHERE tenant_id = ?");
$countStmt->execute([$tenantId]);
$total = (int) $countStmt->fetchColumn();

echo json_encode([
    'invoices' => $invoices,
    'total' => $total,
    'page' => $page,
    'total_pages' => (int) ceil($total / $limit),
]);
