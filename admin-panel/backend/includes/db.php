<?php
/**
 * Blood Group Predictor V3 - Database Configuration
 */
require_once 'config.php';

$host = getenv('DB_HOST') ?: getenv('PLANETSCALE_DB_HOST') ?: 'localhost';
$db = getenv('DB_NAME') ?: getenv('PLANETSCALE_DB') ?: 'blood_predictor';
$user = getenv('DB_USER') ?: getenv('PLANETSCALE_DB_USERNAME') ?: 'root';
$pass = getenv('DB_PASS') ?: getenv('PLANETSCALE_DB_PASSWORD') ?: '';
$port = getenv('DB_PORT') ?: '3306';
$sslCa = getenv('DB_SSL_CA') ?: getenv('PLANETSCALE_SSL_CERT_PATH') ?: '';
$sslVerifyServerCert = getenv('DB_SSL_VERIFY_SERVER_CERT');
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;port=$port;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
];

if ($sslCa && defined('PDO::MYSQL_ATTR_SSL_CA')) {
    $options[PDO::MYSQL_ATTR_SSL_CA] = $sslCa;
}

if ($sslVerifyServerCert !== false && $sslVerifyServerCert !== '' && defined('PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT')) {
    $options[PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT] = filter_var($sslVerifyServerCert, FILTER_VALIDATE_BOOLEAN);
}

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Database connection failed']);
    exit;
}
