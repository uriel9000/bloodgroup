<?php
/**
 * Blood Group Predictor V3 - Calculations API
 */
header('Content-Type: application/json');
require_once '../includes/db.php';
require_once '../includes/auth.php';

checkRole(['super_admin', 'admin']);

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        $page = (int) ($_GET['page'] ?? 1);
        $limit = (int) ($_GET['limit'] ?? 10);
        $offset = ($page - 1) * $limit;
        $search = $_GET['search'] ?? '';

        $sql = "SELECT * FROM calculations WHERE parent1 LIKE ? OR parent2 LIKE ? ORDER BY created_at DESC LIMIT ? OFFSET ?";
        $stmt = $pdo->prepare($sql);
        $searchTerm = "%$search%";
        $stmt->execute([$searchTerm, $searchTerm, $limit, $offset]);
        $records = $stmt->fetchAll();

        $countSql = "SELECT COUNT(*) FROM calculations WHERE parent1 LIKE ? OR parent2 LIKE ?";
        $countStmt = $pdo->prepare($countSql);
        $countStmt->execute([$searchTerm, $searchTerm]);
        $total = $countStmt->fetchColumn();

        echo json_encode([
            'records' => $records,
            'total' => (int) $total,
            'totalPages' => ceil($total / $limit)
        ]);
        break;

    case 'DELETE':
        $id = (int) ($_GET['id'] ?? 0);
        if ($id > 0) {
            $stmt = $pdo->prepare("DELETE FROM calculations WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['success' => true]);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid ID']);
        }
        break;

    default:
        http_response_code(405);
}
