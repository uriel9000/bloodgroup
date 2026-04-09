<?php
header('Content-Type: application/json');
require_once '../../includes/db.php';
require_once '../../includes/auth.php';
require_once 'GeminiService.php';

checkAdminAuth(true); // Ensure admin is logged in (Super Admin or Admin)

$input = json_decode(file_get_contents('php://input'), true);
$parents = htmlspecialchars($input['parents'] ?? 'Unknown');
$results = json_encode($input['results'] ?? []);

if ($parents === 'Unknown' && empty($input['results'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing calculation data']);
    exit;
}

$prompt = "Explain the possible child blood groups from parents {$parents}. Include probabilities and simple genetic reasoning using ABO and Rh systems. Keep it concise and medically accurate. Here are the calculated probabilities to contextually reference: {$results}.";

try {
    $ai = new GeminiService($pdo);
    $response = $ai->generate('explain', $prompt, $_SESSION['admin_id']);
    echo json_encode(['success' => true, 'response' => $response]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
