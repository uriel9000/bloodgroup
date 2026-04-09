<?php
/**
 * Blood Group Predictor V3 - Settings API
 */
header('Content-Type: application/json');
require_once '../includes/db.php';
require_once '../includes/auth.php';

checkAdminAuth(true);
checkRole(['super_admin']);

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        $stmt = $pdo->query("SELECT setting_key, setting_value FROM settings");
        $settings = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
        echo json_encode($settings);
        break;

    case 'POST':
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid input']);
            exit;
        }

        $pdo->beginTransaction();
        try {
            foreach ($input as $key => $value) {
                $stmt = $pdo->prepare("INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?");
                $stmt->execute([$key, $value, $value]);
            }
            $pdo->commit();
            echo json_encode(['success' => true]);
        } catch (Exception $e) {
            $pdo->rollBack();
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
        break;

    default:
        http_response_code(405);
}
