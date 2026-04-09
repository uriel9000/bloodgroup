<?php
header('Content-Type: application/json');
require_once '../../includes/db.php';
require_once '../../includes/auth.php';
require_once 'GeminiService.php';

checkAdminAuth(true);

$input = json_decode(file_get_contents('php://input'), true);
$data = json_encode($input['data'] ?? []);

if (empty($input['data'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing dataset for insights']);
    exit;
}

$prompt = "Analyze this dataset: {$data}. Provide trends, anomalies, and recommendations for improving engagement. Keep the response structured with bullet points.";

try {
    $ai = new GeminiService($pdo);
    $response = $ai->generate('insights', $prompt, $_SESSION['admin_id']);
    echo json_encode(['success' => true, 'response' => $response]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
