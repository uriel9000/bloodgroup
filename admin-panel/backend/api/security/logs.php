<?php
/**
 * Blood Group Predictor V3 - Security Logs API
 */
header('Content-Type: application/json');
require_once __DIR__ . '/../../includes/db.php';
require_once __DIR__ . '/../../includes/auth.php';

checkAdminAuth(true);
checkRole(['super_admin', 'admin']);

try {
    // 1. Get recent logins
    $stmt = $pdo->query("
        SELECT id, ip, country, city, isp, risk_level, flagged, created_at 
        FROM admin_logs 
        ORDER BY created_at DESC 
        LIMIT 10
    ");
    $recent_logs = $stmt->fetchAll();

    // 2. Count suspicious logins (Flagged or High Risk in last 7 days)
    $stmt = $pdo->query("
        SELECT COUNT(*) 
        FROM admin_logs 
        WHERE flagged = 1 AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    ");
    $suspicious_count = $stmt->fetchColumn();

    // 3. Get recent flagged events (last 5)
    $stmt = $pdo->query("
        SELECT id, ip, country, created_at, risk_level 
        FROM admin_logs 
        WHERE flagged = 1 
        ORDER BY created_at DESC 
        LIMIT 5
    ");
    $flagged_events = $stmt->fetchAll();

    echo json_encode([
        'success' => true,
        'recent_logs' => $recent_logs,
        'suspicious_count' => $suspicious_count,
        'flagged_events' => $flagged_events
    ]);

} catch (\Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to fetch security logs']);
}
