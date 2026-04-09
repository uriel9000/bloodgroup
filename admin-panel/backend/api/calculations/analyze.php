<?php
header('Content-Type: application/json');
require_once '../../includes/db.php';
require_once '../../includes/auth.php';
require_once 'GeneticEngine.php';

checkAdminAuth(false);

$input = json_decode(file_get_contents('php://input'), true);
$p1 = strtoupper($input['parent1'] ?? '');
$p2 = strtoupper($input['parent2'] ?? '');

if (!$p1 || !$p2) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing parent blood groups']);
    exit;
}

try {
    $engine = new GeneticEngine();
    $analysis = $engine->analyze($p1, $p2);

    $stmt = $pdo->prepare("INSERT INTO genetic_analysis (parent_1, parent_2, result) VALUES (?, ?, ?)");
    $stmt->execute([$p1, $p2, json_encode($analysis)]);

    echo json_encode(['success' => true, 'data' => $analysis]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
