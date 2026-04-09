<?php
/**
 * Blood Group Predictor V3 - Core Gemini AI Service
 */
class GeminiService {
    private $pdo;
    private $apiKey;
    
    public function __construct($pdo) {
        $this->pdo = $pdo;
        
        $stmt = $this->pdo->prepare("SELECT setting_value FROM settings WHERE setting_key = 'gemini_api_key'");
        $stmt->execute();
        $this->apiKey = $stmt->fetchColumn();
    }
    
    public function generate($type, $prompt, $admin_id = null) {
        if (empty($this->apiKey)) {
            throw new Exception("Gemini API Key is not configured in settings.");
        }
        
        // Check cache first (for matching prompts)
        $prompt_hash = hash('sha256', $type . $prompt);
        $stmt = $this->pdo->prepare("SELECT response_text FROM ai_cache WHERE prompt_hash = ?");
        $stmt->execute([$prompt_hash]);
        $cached = $stmt->fetchColumn();
        
        if ($cached) {
            $this->logRequest($type, $prompt, $cached, $admin_id);
            return $cached;
        }
        
        // Call Gemini
        $url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=" . $this->apiKey;
        $payload = [
            'contents' => [['parts' => [['text' => $prompt]]]],
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
        
        // Force bypass SSL verification to prevent C-URL blockages on local WAMP instances
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
        
        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($http_code !== 200) {
            $error_data = json_decode($response, true);
            throw new Exception("Gemini API Error: " . ($error_data['error']['message'] ?? 'Unknown error'));
        }
        
        $result_data = json_decode($response, true);
        $ai_text = $result_data['candidates'][0]['content']['parts'][0]['text'] ?? 'No response from AI.';
        
        // Cache and log
        $this->pdo->prepare("INSERT INTO ai_cache (prompt_hash, response_text) VALUES (?, ?) ON DUPLICATE KEY UPDATE response_text = ?")->execute([$prompt_hash, $ai_text, $ai_text]);
        $this->logRequest($type, $prompt, $ai_text, $admin_id);
        
        return $ai_text;
    }
    
    private function logRequest($type, $prompt, $response, $admin_id) {
        $stmt = $this->pdo->prepare("INSERT INTO ai_logs (type, prompt, response, admin_id) VALUES (?, ?, ?, ?)");
        $stmt->execute([$type, $prompt, $response, $admin_id]);
    }
}
