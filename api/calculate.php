<?php
/**
 * Blood Group Predictor - Genetic Analysis Engine
 * Handles Mendelian inheritance, Rh incompatibility, and AI-driven insights.
 */

header('Content-Type: application/json');

// --- Configuration ---
require_once __DIR__ . '/../admin-panel/backend/includes/config.php';

$host = getenv('DB_HOST') ?: getenv('PLANETSCALE_DB_HOST') ?: getenv('MYSQLHOST') ?: 'localhost';
$db = getenv('DB_NAME') ?: getenv('PLANETSCALE_DB') ?: getenv('MYSQLDATABASE') ?: 'blood_predictor';
$user = getenv('DB_USER') ?: getenv('PLANETSCALE_DB_USERNAME') ?: getenv('MYSQLUSER') ?: 'root';
$pass = getenv('DB_PASS') ?: getenv('PLANETSCALE_DB_PASSWORD') ?: getenv('MYSQLPASSWORD') ?: '';
$port = getenv('DB_PORT') ?: getenv('MYSQLPORT') ?: '3306';
$sslCa = getenv('DB_SSL_CA') ?: getenv('PLANETSCALE_SSL_CERT_PATH') ?: '';
$sslVerifyServerCert = getenv('DB_SSL_VERIFY_SERVER_CERT');
$appEnv = getenv('APP_ENV') ?: 'production';
$isDevelopment = strtolower($appEnv) === 'development';

$ABO_MAP = [
    'A'  => ['AA', 'AO'],
    'B'  => ['BB', 'BO'],
    'AB' => ['AB'],
    'O'  => ['OO']
];

$RH_MAP = [
    '+' => ['++', '+-'],
    '-' => ['--']
];

// --- Database Connection ---
try {
    $pdoOptions = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ];

    if ($sslCa && defined('PDO::MYSQL_ATTR_SSL_CA')) {
        $pdoOptions[PDO::MYSQL_ATTR_SSL_CA] = $sslCa;
    }

    if ($sslVerifyServerCert !== false && $sslVerifyServerCert !== '' && defined('PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT')) {
        $pdoOptions[PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT] = filter_var($sslVerifyServerCert, FILTER_VALIDATE_BOOLEAN);
    }

    $pdo = new PDO("mysql:host=$host;port=$port;dbname=$db;charset=utf8mb4", $user, $pass, $pdoOptions);
} catch (\Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database connection failed']);
    exit;
}

// --- Fetch Settings ---
$stmt_set = $pdo->query("SELECT setting_key, setting_value FROM settings");
$settings = [];
foreach ($stmt_set->fetchAll(PDO::FETCH_ASSOC) as $row) {
    $settings[$row['setting_key']] = $row['setting_value'];
}

if (isset($settings['maintenance_mode']) && $settings['maintenance_mode'] === 'on') {
    http_response_code(503);
    echo json_encode(['error' => 'System under maintenance']);
    exit;
}

// --- Input Handling ---
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['error' => 'POST only']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
if (!$input || !isset($input['parent1']) || !isset($input['parent2'])) {
    echo json_encode(['error' => 'Invalid input']);
    exit;
}

$p1_raw = $input['parent1'];
$p2_raw = $input['parent2'];

if (!preg_match('/^(A|B|AB|O)[\+\-]$/', $p1_raw) || !preg_match('/^(A|B|AB|O)[\+\-]$/', $p2_raw)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid blood group format']);
    exit;
}

function parsePhenotype($raw) {
    $rh = substr($raw, -1);
    $abo = substr($raw, 0, -1);
    return [$abo, $rh];
}

list($p1_abo, $rh1) = parsePhenotype($p1_raw);
list($p2_abo, $rh2) = parsePhenotype($p2_raw);

// --- Genetics Engine ---

/**
 * Generates Punnett Square matrix for two genotypes.
 */
function generatePunnett($g1, $g2) {
    $a1 = str_split($g1);
    $a2 = str_split($g2);
    $matrix = [];
    foreach ($a1 as $allele1) {
        $row = [];
        foreach ($a2 as $allele2) {
            $alleles = [$allele1, $allele2];
            sort($alleles);
            $genotype = implode('', $alleles);
            // Canonical order for AB
            if ($genotype === 'BA') $genotype = 'AB';
            $row[] = $genotype;
        }
        $matrix[] = $row;
    }
    return $matrix;
}

/**
 * Maps genotype to phenotype.
 */
function getPhenotype($aboG, $rhG) {
    if (strpos($aboG, 'A') !== false && strpos($aboG, 'B') !== false) $abo = 'AB';
    elseif (strpos($aboG, 'A') !== false) $abo = 'A';
    elseif (strpos($aboG, 'B') !== false) $abo = 'B';
    else $abo = 'O';

    $rh = (strpos($rhG, '+') !== false) ? '+' : '-';
    return $abo . $rh;
}

// 1. Calculate All Genotype Probabilities
$genotypeProbabilities = [];
$phenotypeProbabilities = [];
$totalCount = 0;

$g1_abo_list = $ABO_MAP[$p1_abo];
$g1_rh_list  = $RH_MAP[$rh1];
$g2_abo_list = $ABO_MAP[$p2_abo];
$g2_rh_list  = $RH_MAP[$rh2];

foreach ($g1_abo_list as $g1a) {
    foreach ($g1_rh_list as $g1r) {
        foreach ($g2_abo_list as $g2a) {
            foreach ($g2_rh_list as $g2r) {
                $abo_matrix = generatePunnett($g1a, $g2a);
                $rh_matrix  = generatePunnett($g1r, $g2r);

                foreach ($abo_matrix as $abo_row) {
                    foreach ($abo_row as $ao) {
                        foreach ($rh_matrix as $rh_row) {
                            foreach ($rh_row as $ro) {
                                $genotype = $ao . ' ' . $ro;
                                $phenotype = getPhenotype($ao, $ro);

                                $genotypeProbabilities[$genotype] = ($genotypeProbabilities[$genotype] ?? 0) + 1;
                                $phenotypeProbabilities[$phenotype] = ($phenotypeProbabilities[$phenotype] ?? 0) + 1;
                                $totalCount++;
                            }
                        }
                    }
                }
            }
        }
    }
}

// Convert to percentages
$finalPhenotypes = [];
foreach ($phenotypeProbabilities as $p => $c) {
    $finalPhenotypes[] = ['group' => $p, 'probability' => round(($c / $totalCount) * 100, 2)];
}
usort($finalPhenotypes, fn($a, $b) => $b['probability'] <=> $a['probability']);

$finalGenotypes = [];
foreach ($genotypeProbabilities as $g => $c) {
    $finalGenotypes[] = ['genotype' => $g, 'probability' => round(($c / $totalCount) * 100, 2)];
}
usort($finalGenotypes, fn($a, $b) => $b['probability'] <=> $a['probability']);

// 2. Detect Rh Incompatibility Risk
// High Risk: Mother is Rh-, Father is Rh+
$rh_risk = [
    'level'   => 'Green',
    'status'  => 'Safe',
    'message' => 'No Rh incompatibility risks detected for this combination.'
];

if ($rh1 === '-' && $rh2 === '+') {
    $rh_risk = [
        'level'   => 'Red',
        'status'  => 'Potential Risk',
        'message' => 'Rh-negative mother and Rh-positive father may require medical attention during pregnancy (potential Rh incompatibility).'
    ];
} elseif ($rh1 === '-' && $rh2 === '-') {
    $rh_risk = [
        'level'   => 'Green',
        'status'  => 'N/A',
        'message' => 'Both parents are Rh-negative. Offspring will be Rh-negative.'
    ];
}

// 3. AI Insights (Gemini)
$ai_insights = null;
if (isset($settings['gemini_api_key']) && !empty($settings['gemini_api_key'])) {
    $prompt_hash = hash('sha256', $p1_raw . '|' . $p2_raw);
    
    $stmt_cache = $pdo->prepare("SELECT response_text FROM ai_cache WHERE prompt_hash = ?");
    $stmt_cache->execute([$prompt_hash]);
    $cached = $stmt_cache->fetch(PDO::FETCH_ASSOC);
    
    if ($cached) {
        $ai_insights = $cached['response_text'];
    } else {
        $apiKey = $settings['gemini_api_key'];
        $prompt = "Expert Bioinformatics Genetic Analysis:\n";
        $prompt .= "Parents: {$p1_raw} and {$p2_raw}.\n";
        $prompt .= "Offspring Probabilities: " . json_encode($finalPhenotypes) . ".\n";
        $prompt .= "Rh Risk: {$rh_risk['message']}.\n";
        $prompt .= "Provide a clear, scientific, yet educational explanation of this inheritance. Mention ABO dominance (A/B are codominant over O) and Rh inheritance. Conclude with a medical disclaimer: 'This is educational and not a medical diagnosis.'";

        $url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" . $apiKey;
        
        $data = [
            'contents' => [
                ['parts' => [['text' => $prompt]]]
            ]
        ];

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, !$isDevelopment);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, $isDevelopment ? 0 : 2);
        
        $apiResponse = curl_exec($ch);
        $curlError = curl_error($ch);
        curl_close($ch);

        if (!$curlError) {
            $resp = json_decode($apiResponse, true);
            if (isset($resp['candidates'][0]['content']['parts'][0]['text'])) {
                $ai_insights = $resp['candidates'][0]['content']['parts'][0]['text'];
                
                try {
                    $stmt_in = $pdo->prepare("INSERT INTO ai_cache (prompt_hash, response_text) VALUES (?, ?)");
                    $stmt_in->execute([$prompt_hash, $ai_insights]);
                } catch (\Exception $e) { /* ignore collision */ }
            } else {
                // Log full response for debugging
                error_log("Gemini API Error Response: " . $apiResponse);
            }
        } else {
            error_log("CURL Error: " . $curlError);
        }
    }
} else {
    error_log("Gemini API Key missing or empty in settings");
}

// --- Construct Response ---
$analysis = [
    'phenotypes'   => $finalPhenotypes,
    'genotypes'    => $finalGenotypes,
    'rh_risk'      => $rh_risk,
    'ai_insights'  => $ai_insights,
    'disclaimer'   => "This system provides educational genetic insights and does not replace professional medical advice."
];

// Log to genetic_analysis table
try {
    $stmt = $pdo->prepare("INSERT INTO genetic_analysis (parent_1, parent_2, result) VALUES (?, ?, ?)");
    $stmt->execute([$p1_raw, $p2_raw, json_encode($analysis)]);
} catch (\Exception $e) {
    // Log to audit if needed
}

echo json_encode([
    'success' => true,
    'input'   => $input,
    'results' => $finalPhenotypes, // Backward compatibility
    'genetic_analysis' => $analysis,
    'timestamp' => time()
]);
