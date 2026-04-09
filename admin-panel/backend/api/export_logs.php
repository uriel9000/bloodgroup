<?php
/**
 * Blood Group Predictor V3 - Export Logs API
 */
require_once '../includes/db.php';
require_once '../includes/auth.php';

// Allow session based download
checkAdminAuth();
checkRole(['super_admin', 'admin']);

$search = $_GET['search'] ?? '';
$searchTerm = "%$search%";

$sql = "SELECT created_at, parent1, parent2, result_json, user_ip FROM calculations WHERE parent1 LIKE ? OR parent2 LIKE ? ORDER BY created_at DESC";
$stmt = $pdo->prepare($sql);
$stmt->execute([$searchTerm, $searchTerm]);
$records = $stmt->fetchAll(PDO::FETCH_ASSOC);

$filename = "prediction_logs_" . date('Ymd_His') . ".csv";

header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename="' . $filename . '"');

$output = fopen('php://output', 'w');

// CSV Headers
fputcsv($output, ['Timestamp', 'Parent 1', 'Parent 2', 'Top Outcome', 'User IP']);

foreach ($records as $row) {
    $topGroup = 'N/A';
    try {
        $resObj = json_decode($row['result_json'], true);
        if ($resObj) {
            $topGroup = array_key_first($resObj);
        }
    } catch (Exception $e) {}

    fputcsv($output, [
        $row['created_at'],
        $row['parent1'],
        $row['parent2'],
        $topGroup,
        $row['user_ip']
    ]);
}

fclose($output);
exit;
