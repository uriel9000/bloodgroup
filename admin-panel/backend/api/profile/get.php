<?php
header('Content-Type: application/json');
require_once '../../includes/db.php';
require_once '../../includes/auth.php';

checkAdminAuth(false);

$admin_id = $_SESSION['admin_id'];

try {
    $stmt = $pdo->prepare("SELECT email, role, name, username, phone, bio FROM admins WHERE id = ?");
    $stmt->execute([$admin_id]);
    $admin = $stmt->fetch(PDO::FETCH_ASSOC);

    echo json_encode(['success' => true, 'data' => $admin]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error.']);
}
