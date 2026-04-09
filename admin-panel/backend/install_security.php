<?php
/**
 * Blood Group Predictor V3 - Security Intelligence Migrations
 * Safely creates or alters tables for AI Security & Geo-Tracking.
 */

header('Content-Type: text/plain');
require_once 'includes/config.php';

echo "Starting Security Intelligence Migrations...\n";

try {
    // 1. Database Connection
    $host = getenv('DB_HOST') ?: 'localhost';
    $db = getenv('DB_NAME') ?: 'blood_predictor';
    $user = getenv('DB_USER') ?: 'root';
    $pass = getenv('DB_PASS') ?: '';

    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8mb4", $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);

    // 2. Create `admin_logs` if it doesn't exist
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `admin_logs` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `admin_id` INT NOT NULL,
            `ip` VARCHAR(45) NOT NULL,
            `user_agent` TEXT,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");
    echo "[OK] `admin_logs` table verified/created.\n";

    // 3. Extend `admin_logs` safely via SHOW COLUMNS
    $stmt = $pdo->query("SHOW COLUMNS FROM `admin_logs`");
    $columns = $stmt->fetchAll(PDO::FETCH_COLUMN);

    $alterQueries = [];
    if (!in_array('country', $columns))
        $alterQueries[] = "ADD COLUMN `country` VARCHAR(100) NULL";
    if (!in_array('city', $columns))
        $alterQueries[] = "ADD COLUMN `city` VARCHAR(100) NULL";
    if (!in_array('isp', $columns))
        $alterQueries[] = "ADD COLUMN `isp` VARCHAR(150) NULL";
    if (!in_array('risk_level', $columns))
        $alterQueries[] = "ADD COLUMN `risk_level` VARCHAR(10) DEFAULT 'low'";
    if (!in_array('flagged', $columns))
        $alterQueries[] = "ADD COLUMN `flagged` BOOLEAN DEFAULT FALSE";
    if (!in_array('status', $columns))
        $alterQueries[] = "ADD COLUMN `status` ENUM('success', 'failed') DEFAULT 'success'";

    if (!empty($alterQueries)) {
        $alterSql = "ALTER TABLE `admin_logs` " . implode(", ", $alterQueries);
        $pdo->exec($alterSql);
        echo "[OK] `admin_logs` table extended with Geo and AI columns.\n";
    } else {
        echo "[INFO] `admin_logs` already up-to-date.\n";
    }

    // 4. Create `geo_cache` table
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `geo_cache` (
            `ip` VARCHAR(45) PRIMARY KEY,
            `country` VARCHAR(100),
            `city` VARCHAR(100),
            `isp` VARCHAR(150),
            `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");
    echo "[OK] `geo_cache` table verified/created.\n";

    echo "\nAll migrations completed successfully!\n";

} catch (\PDOException $e) {
    echo "\n[ERROR] Migration failed: " . $e->getMessage() . "\n";
}
