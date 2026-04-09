<?php
/**
 * Blood Group Predictor V3 - Knowledge Base API
 */
header('Content-Type: application/json');
require_once '../includes/db.php';
require_once '../includes/auth.php';

checkAdminAuth(true);

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        $records = $pdo->query("SELECT * FROM blood_info ORDER BY id ASC")->fetchAll();
        echo json_encode($records);
        break;

    case 'POST':
        $input = json_decode(file_get_contents('php://input'), true);
        $id = $input['id'];
        $pros = $input['pros'];
        $cons = $input['cons'];
        $note = $input['note'];

        $stmt = $pdo->prepare("UPDATE blood_info SET pros = ?, cons = ?, note = ? WHERE id = ?");
        $stmt->execute([$pros, $cons, $note, $id]);
        echo json_encode(['success' => true]);
        break;

    default:
        http_response_code(405);
}
