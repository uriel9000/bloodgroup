<?php
/**
 * Blood Group Predictor V3 - Gemini Flash AI API
 */
header('Content-Type: application/json');
require_once '../../includes/db.php';
require_once '../../includes/auth.php';

// Ensure admin is logged in (Super Admin or Analyst)
checkAdminAuth(true);
checkRole(['super_admin', 'admin']);

// Get input data
$input = json_decode(file_get_contents('php://input'), true);
$type = $input['type'] ?? '';
$data = $input['data'] ?? [];
$force_refresh = $input['refresh'] ?? false;

if (empty($type)) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing request type']);
    exit;
}

// 1. Get Gemini API Key from Settings
$stmt = $pdo->prepare("SELECT setting_value FROM settings WHERE setting_key = 'gemini_api_key'");
$stmt->execute();
$api_key = $stmt->fetchColumn();

if (empty($api_key)) {
    http_response_code(400);
    echo json_encode(['error' => 'Gemini API Key is not configured. please set it in Settings.']);
    exit;
}

// 2. Prepare Prompt based on type
$prompt = "";
switch ($type) {
    case 'trends':
        $stats = json_encode($data['stats']['trends'] ?? []);
        $prompt = "As a senior data analyst, review this last 7-30 days prediction volume trend data: {$stats}. Provide 3 key actionable insights in bullet points regarding user engagement and system usage spikes. Keep it professional.";
        break;

    case 'genetics':
        $combo = json_encode($data['stats']['top_combinations'] ?? []);
        $dist = json_encode($data['stats']['distribution'] ?? []);
        $prompt = "As an expert geneticist, analyze this data showing the most frequently queried parent blood group combinations ({$combo}) and overall queried blood group distribution ({$dist}). What does this suggest about the demographic or specific concerns of our user base? Provide a concise summary and 3 bullet points.";
        break;

    case 'security':
        $sec = json_encode($data['security'] ?? []);
        $prompt = "As a cybersecurity expert, review the following recent authentication logs and flags: {$sec}. Identify any geographic anomalies, brute force attempts, or potential risks. Provide 3 specific security recommendations in bullet points.";
        break;

    case 'full':
        $stats = json_encode($data['stats'] ?? []);
        $sec = json_encode($data['security']['suspicious_count'] ?? 0);
        $prompt = "As an executive AI assistant, provide a comprehensive platform health report. Here are the usage stats: {$stats}. We also had {$sec} suspicious logins recently. Write a 3-paragraph executive summary covering Growth, Genetic Query Patterns, and Security Posture.";
        break;

    case 'explanation':
        $parent1 = htmlspecialchars($data['parent1'] ?? 'Unknown');
        $parent2 = htmlspecialchars($data['parent2'] ?? 'Unknown');
        $results = json_encode($data['results'] ?? []);
        $prompt = "Explain in simple genetic terms how two parents with blood groups {$parent1} and {$parent2} can have children with these probabilities: {$results}. Use ABO and Rh factor reasoning.";
        break;

    default:
        http_response_code(400);
        echo json_encode(['error' => 'Invalid prompt type']);
        exit;
}

// 3. Check Cache
$prompt_hash = hash('sha256', $type . $prompt);

if (!$force_refresh) {
    $stmt = $pdo->prepare("SELECT response_text FROM ai_cache WHERE prompt_hash = ?");
    $stmt->execute([$prompt_hash]);
    $cached_response = $stmt->fetchColumn();

    if ($cached_response) {
        echo json_encode(['result' => $cached_response, 'cached' => true]);
        exit;
    }
}

// 4. Call Gemini Flash API
$url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=" . $api_key;

$payload = [
    'contents' => [
        [
            'parts' => [
                ['text' => $prompt]
            ]
        ]
    ],
    'generationConfig' => [
        'temperature' => 0.7,
        'maxOutputTokens' => 2048
    ]
];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($http_code !== 200) {
    $error_data = json_decode($response, true);
    http_response_code($http_code);
    echo json_encode([
        'error' => 'Gemini API Error',
        'details' => $error_data['error']['message'] ?? 'Unknown error'
    ]);
    exit;
}

$result_data = json_decode($response, true);
$ai_text = $result_data['candidates'][0]['content']['parts'][0]['text'] ?? 'No response from AI.';

// 5. Save to Cache
$stmt = $pdo->prepare("INSERT INTO ai_cache (prompt_hash, response_text) VALUES (?, ?) ON DUPLICATE KEY UPDATE response_text = ?, created_at = CURRENT_TIMESTAMP");
$stmt->execute([$prompt_hash, $ai_text, $ai_text]);

echo json_encode(['result' => $ai_text, 'cached' => false]);
