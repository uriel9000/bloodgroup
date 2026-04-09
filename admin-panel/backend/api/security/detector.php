<?php
/**
 * Blood Group Predictor V3 - Rule-Based Detector
 */

function analyzeLoginRules($pdo, $admin_id, $current_ip, $current_country)
{
    // Exclude 'Local Network' from flagging constantly
    if ($current_country === 'Local Network') {
        return [
            'risk' => 'low',
            'flagged' => false,
            'reasons' => [],
            'history' => []
        ];
    }

    // Get last 5 successful logins (excluding current)
    $stmt = $pdo->prepare("SELECT ip, country, created_at FROM admin_logs WHERE admin_id = ? AND status = 'success' ORDER BY created_at DESC LIMIT 5");
    $stmt->execute([$admin_id]);
    $history = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $is_flagged = false;
    $rule_risk = 'low';
    $reasons = [];

    if (count($history) > 0) {
        // Rule 1: New Country
        $known_countries = array_unique(array_column($history, 'country'));
        if (!in_array($current_country, $known_countries) && $current_country !== 'Unknown') {
            $rule_risk = 'high';
            $is_flagged = true;
            $reasons[] = "Login from a new country ($current_country)";
        }

        // Rule 2: Rapid IP Change
        $known_ips = array_unique(array_column($history, 'ip'));
        if (!in_array($current_ip, $known_ips)) {
            if ($rule_risk !== 'high') {
                $rule_risk = 'medium';
                $reasons[] = "Login from an unrecognized IP address ($current_ip)";
                $is_flagged = true;
            }
        }
    }

    return [
        'risk' => $rule_risk,
        'flagged' => $is_flagged,
        'reasons' => $reasons,
        'history' => $history
    ];
}
