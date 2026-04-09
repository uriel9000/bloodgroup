<?php
/**
 * Blood Group Predictor - Plans API
 * GET /api/billing/plans.php
 */
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/../../admin_v2/includes/db.php';

$stmt = $pdo->query("SELECT id, name, price, billing_cycle, max_calculations, max_ai_requests FROM plans ORDER BY price ASC");
$plans = $stmt->fetchAll();

echo json_encode(['plans' => $plans]);
