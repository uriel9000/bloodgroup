<?php
header('Content-Type: application/json');
require_once '../../includes/db.php';
require_once '../../includes/auth.php';
require_once 'GeminiService.php';

checkAdminAuth(false);

$input = json_decode(file_get_contents('php://input'), true);
$p1 = htmlspecialchars($input['parent1'] ?? 'Unknown');
$p2 = htmlspecialchars($input['parent2'] ?? 'Unknown');

if ($p1 === 'Unknown' || $p2 === 'Unknown') {
    http_response_code(400);
    echo json_encode(['error' => 'Missing parent data']);
    exit;
}

$prompt = "Analyze potential Rh incompatibility risks and genetic inheritance for parents {$p1} and {$p2}. Explain in simple terms and include when medical consultation is advised. Disclaimer: This is for educational purposes only. Do not claim to diagnose.";

try {
    $ai = new GeminiService($pdo);
    $response = $ai->generate('clinical', $prompt, $_SESSION['admin_id']);
    echo json_encode(['success' => true, 'response' => $response]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
