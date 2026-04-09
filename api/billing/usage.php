<?php
/**
 * Blood Group Predictor - Usage Tracking & Enforcement
 * 
 * Include this file in any endpoint that needs usage tracking.
 * Requires:  $pdo (PDO connection, already required by the caller)
 */

/**
 * Log a usage event for a tenant.
 *
 * @param PDO    $pdo
 * @param int    $tenantId
 * @param string $type  'calculation' | 'ai_request'
 */
function logUsage(PDO $pdo, int $tenantId, string $type): void
{
    $stmt = $pdo->prepare(
        "INSERT INTO usage_logs (tenant_id, type, count, created_at)
         VALUES (?, ?, 1, NOW())"
    );
    $stmt->execute([$tenantId, $type]);
}

/**
 * Get current month usage count for a tenant+type.
 *
 * @param PDO    $pdo
 * @param int    $tenantId
 * @param string $type
 * @return int
 */
function getMonthlyUsage(PDO $pdo, int $tenantId, string $type): int
{
    $stmt = $pdo->prepare(
        "SELECT COALESCE(SUM(count), 0) FROM usage_logs
         WHERE tenant_id = ?
           AND type       = ?
           AND MONTH(created_at)  = MONTH(CURDATE())
           AND YEAR(created_at)   = YEAR(CURDATE())"
    );
    $stmt->execute([$tenantId, $type]);
    return (int) $stmt->fetchColumn();
}

/**
 * Fetch plan limits for the tenant's active plan.
 *
 * @param PDO $pdo
 * @param int $tenantId
 * @return array|null  ['max_calculations' => int, 'max_ai_requests' => int, 'plan' => string]
 */
function getTenantPlan(PDO $pdo, int $tenantId): ?array
{
    $stmt = $pdo->prepare(
        "SELECT p.name AS plan, p.max_calculations, p.max_ai_requests
           FROM tenants t
           JOIN plans p ON p.name = t.plan
          WHERE t.id = ?
            AND t.billing_status = 'active'
          LIMIT 1"
    );
    $stmt->execute([$tenantId]);
    return $stmt->fetch() ?: null;
}

/**
 * Enforce a usage limit.  Returns true if allowed, or sends a 429 JSON error and exits.
 *
 * @param PDO    $pdo
 * @param int    $tenantId
 * @param string $type   'calculation' | 'ai_request'
 * @return bool
 */
function enforceUsageLimit(PDO $pdo, int $tenantId, string $type): bool
{
    $plan = getTenantPlan($pdo, $tenantId);

    // No active plan = free tier (limit = 15 per month for each type)
    $limit = 15;
    if ($plan) {
        $limit = $type === 'ai_request'
            ? (int) $plan['max_ai_requests']
            : (int) $plan['max_calculations'];
    }

    $used = getMonthlyUsage($pdo, $tenantId, $type);

    if ($used >= $limit) {
        header('Content-Type: application/json');
        http_response_code(429);
        echo json_encode([
            'error' => 'Usage limit exceeded',
            'type' => $type,
            'used' => $used,
            'limit' => $limit,
            'message' => 'You have reached your ' . str_replace('_', ' ', $type) . " limit for this month. Please upgrade your plan.",
        ]);
        exit;
    }

    return true;
}
