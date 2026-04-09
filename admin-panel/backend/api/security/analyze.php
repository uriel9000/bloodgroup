<?php
/**
 * Blood Group Predictor V3 - Security Analysis Entrypoint
 * This script is called asynchronously immediately after login.
 */

// If requested directly via POST
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['admin_id']) && isset($_POST['ip'])) {
    require_once __DIR__ . '/../../includes/db.php';
    require_once 'geo.php';
    require_once 'detector.php';
    require_once 'ai-security.php';

    $admin_id = intval($_POST['admin_id']);
    $ip = $_POST['ip'];
    $user_agent = $_POST['user_agent'] ?? 'Unknown';
    $device_type = $_POST['device_type'] ?? 'Unknown';
    $browser_fingerprint = $_POST['browser_fingerprint'] ?? 'Unknown';

    // 1. Fetch Geo Location
    $geo = fetchGeoData($ip, $pdo);
    $geo['ip'] = $ip;

    // 2. Rule-Based Detection
    $rules = analyzeLoginRules($pdo, $admin_id, $ip, $geo['country']);

    // 3. Save Basic Log
    $stmt = $pdo->prepare("
        INSERT INTO admin_logs (admin_id, ip, user_agent, device_type, browser_fingerprint, country, city, isp, risk_level, flagged)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([
        $admin_id,
        $ip,
        $user_agent,
        $device_type,
        $browser_fingerprint,
        $geo['country'],
        $geo['city'],
        $geo['isp'],
        $rules['risk'],
        $rules['flagged'] ? 1 : 0
    ]);

    $log_id = $pdo->lastInsertId();

    // 4. Trigger Deep AI Analysis
    analyzeWithAI($pdo, $admin_id, $log_id, $rules, $geo);

    echo json_encode(['success' => true]);
    exit;
}
