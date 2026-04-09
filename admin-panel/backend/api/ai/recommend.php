<?php
header('Content-Type: application/json');
require_once '../../includes/db.php';
require_once '../../includes/auth.php';
require_once 'GeminiService.php';

checkAdminAuth(true);

// Fetch system state for recommendation context
$stmt = $pdo->query("SELECT COUNT(*) FROM calculations WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)");
$today_calcs = $stmt->fetchColumn();

// Look for failed logins
$stmt = $pdo->query("SELECT COUNT(*) FROM admin_logs WHERE status = 'failed' AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)");
$failed_logins = $stmt->fetchColumn();

$context = "System State Summary - Today's User Calculations: {$today_calcs}. Failed Admin Logins: {$failed_logins}.";

$prompt = "Based on this system state: '{$context}', suggest what actions the site administrator should take regarding sending user reminders, checking server load, or monitoring security risks. Provide 2 to 3 concise intelligent alerts/recommendations.";

try {
    $ai = new GeminiService($pdo);
    $response = $ai->generate('recommend', $prompt, $_SESSION['admin_id']);
    echo json_encode(['success' => true, 'response' => $response]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
