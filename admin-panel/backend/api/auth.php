<?php
/**
 * Blood Group Predictor V3 - Authentication API
 */
header('Content-Type: application/json');
require_once '../includes/db.php';
require_once '../includes/auth.php';

$input = json_decode(file_get_contents('php://input'), true);
$action = $_GET['action'] ?? '';

switch ($action) {
    case 'login':
        $email = $input['email'] ?? '';
        $password = $input['password'] ?? '';

        if (empty($email) || empty($password)) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing credentials']);
            exit;
        }

        $stmt = $pdo->prepare("SELECT * FROM admins WHERE email = ?");
        $stmt->execute([$email]);
        $admin = $stmt->fetch();

        if ($admin && password_verify($password, $admin['password'])) {
            $_SESSION['admin_id'] = $admin['id'];
            $_SESSION['admin_email'] = $admin['email'];
            $_SESSION['admin_role'] = $admin['role'];

            // Trigger Async Security Analysis
            $protocol = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http");
            $analyze_url = "$protocol://$_SERVER[HTTP_HOST]" . dirname($_SERVER['PHP_SELF']) . '/security/analyze.php';

            $ch = curl_init($analyze_url);
            curl_setopt($ch, CURLOPT_POST, 1);
            curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
                'admin_id' => $admin['id'],
                'ip' => $_SERVER['REMOTE_ADDR'],
                'user_agent' => $_SERVER['HTTP_USER_AGENT'],
                'device_type' => $input['device_type'] ?? 'Unknown',
                'browser_fingerprint' => $input['browser_fingerprint'] ?? 'Unknown'
            ]));
            curl_setopt($ch, CURLOPT_TIMEOUT, 1); // Fast 1-second timeout (fire and forget)
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_exec($ch);
            curl_close($ch);

            echo json_encode(['success' => true, 'role' => $admin['role']]);
        } else {
            http_response_code(401);
            echo json_encode(['error' => 'Invalid email or password']);
        }
        break;

    case 'logout':
        session_destroy();
        echo json_encode(['success' => true]);
        break;

    default:
        http_response_code(404);
        echo json_encode(['error' => 'Action not found']);
}
