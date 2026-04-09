<?php
/**
 * Blood Group Predictor V3 - Statistics API
 */
header('Content-Type: application/json');
require_once '../includes/db.php';
require_once '../includes/auth.php';

checkAdminAuth(true);
checkRole(['super_admin', 'admin']);

// 1. Total Calculations
$total = $pdo->query("SELECT COUNT(*) FROM calculations")->fetchColumn();

// 2. Today's Calculations
$today = $pdo->query("SELECT COUNT(*) FROM calculations WHERE DATE(created_at) = CURDATE()")->fetchColumn();

// 3. Trends (Last 7 Days)
$trends = $pdo->query("
    SELECT DATE(created_at) as date, COUNT(*) as count 
    FROM calculations 
    WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
    GROUP BY DATE(created_at)
    ORDER BY date ASC
")->fetchAll();

// 4. Top Combinations
$combinations = $pdo->query("
    SELECT CONCAT(parent1, ' x ', parent2) as combo, COUNT(*) as count
    FROM calculations
    GROUP BY parent1, parent2
    ORDER BY count DESC
    LIMIT 5
")->fetchAll();

// 5. Blood Group Distribution (Based on queried parents)
$distributionSQL = "
    SELECT bg, SUM(cnt) as count FROM (
        SELECT parent1 as bg, COUNT(*) as cnt FROM calculations GROUP BY parent1
        UNION ALL
        SELECT parent2 as bg, COUNT(*) as cnt FROM calculations GROUP BY parent2
    ) as combo_bgs
    GROUP BY bg
    ORDER BY count DESC
    LIMIT 6
";
$distribution = $pdo->query($distributionSQL)->fetchAll();

echo json_encode([
    'total_calculations' => $total,
    'today_count' => $today,
    'trends' => [
        'labels' => array_column($trends, 'date'),
        'values' => array_map('intval', array_column($trends, 'count'))
    ],
    'top_combinations' => [
        'labels' => array_column($combinations, 'combo'),
        'values' => array_map('intval', array_column($combinations, 'count'))
    ],
    'distribution' => [
        'labels' => array_column($distribution, 'bg'),
        'values' => array_map('intval', array_column($distribution, 'count'))
    ]
]);
