<?php
/**
 * Blood Group Predictor V3 - AI Security Anomaly Detection
 */
require_once __DIR__ . '/../../includes/db.php';

function analyzeWithAI($pdo, $admin_id, $current_log_id, $rule_analysis, $current_geo)
{
    // 1. Get Gemini Key
    $stmt = $pdo->prepare("SELECT setting_value FROM settings WHERE setting_key = 'gemini_api_key'");
    $stmt->execute();
    $api_key = $stmt->fetchColumn();

    if (empty($api_key)) {
        return; // Fail gracefully, rules will still apply
    }

    // 2. Prepare Context
    $context = json_encode([
        'recent_logins' => $rule_analysis['history'],
        'current_login' => [
            'ip' => $current_geo['ip'],
            'country' => $current_geo['country'],
            'city' => $current_geo['city'],
            'time' => date('Y-m-d H:i:s')
        ]
    ]);

    $prompt = "Analyze the following login activity and determine if the latest login is suspicious. Consider location changes, frequency, and IP addresses. Return a JSON response with exactly two keys: 'risk' (must be 'low', 'medium', or 'high') and 'reason' (a concise explanation). Dataset: " . $context;

    // 3. Call Gemini API
    $url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" . $api_key;
    $payload = [
        'contents' => [['parts' => [['text' => $prompt]]]],
        'generationConfig' => ['temperature' => 0.2]
    ];

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    $is_dev = (getenv('APP_ENV') === 'development');
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, !$is_dev);

    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($http_code == 200) {
        $result_data = json_decode($response, true);
        $ai_text = $result_data['candidates'][0]['content']['parts'][0]['text'] ?? '';

        // Clean JSON formatting
        if (preg_match('/```(?:json)?(.*?)```/s', $ai_text, $matches)) {
            $ai_text = $matches[1];
        }
        $ai_json = json_decode(trim($ai_text), true);

        if ($ai_json && isset($ai_json['risk'])) {
            $risk = strtolower($ai_json['risk']);
            $flagged = ($risk === 'medium' || $risk === 'high') ? 1 : 0;

            // Only overwrite if AI determined it's high/medium OR rule-based missed it
            $stmt = $pdo->prepare("UPDATE admin_logs SET risk_level = ?, flagged = GREATEST(flagged, ?) WHERE id = ?");
            $stmt->execute([$risk, $flagged, $current_log_id]);
        }
    }
}
