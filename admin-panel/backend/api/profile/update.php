<?php
header('Content-Type: application/json');
require_once '../../includes/db.php';
require_once '../../includes/auth.php';

checkAdminAuth(false);

$input = json_decode(file_get_contents('php://input'), true);
$admin_id = $_SESSION['admin_id'];

// Validate required basics
if (empty($input['email'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Email is required.']);
    exit;
}

try {
    // Check if email is taken by someone else
    $stmt = $pdo->prepare("SELECT id FROM admins WHERE email = ? AND id != ?");
    $stmt->execute([$input['email'], $admin_id]);
    if ($stmt->fetch()) {
        throw new Exception("Email is already in use by another administrator.");
    }

    $sql = "UPDATE admins SET email = ?, name = ?, username = ?, phone = ?, bio = ? WHERE id = ?";
    $params = [
        $input['email'],
        $input['name'] ?? null,
        $input['username'] ?? null,
        $input['phone'] ?? null,
        $input['bio'] ?? null,
        $admin_id
    ];

    // If new password is provided, update it
    if (!empty($input['password'])) {
        $sql = "UPDATE admins SET email = ?, name = ?, username = ?, phone = ?, bio = ?, password = ? WHERE id = ?";
        $hash = password_hash($input['password'], PASSWORD_DEFAULT);
        $params = [
            $input['email'],
            $input['name'] ?? null,
            $input['username'] ?? null,
            $input['phone'] ?? null,
            $input['bio'] ?? null,
            $hash,
            $admin_id
        ];
    }

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    echo json_encode(['success' => true]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
