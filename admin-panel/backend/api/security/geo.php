<?php
/**
 * Blood Group Predictor V3 - Geo-Location Tracking Middleware
 */

function fetchGeoData($ip, $pdo)
{
    // 1. Local/Reserved Checks
    if ($ip == '::1' || $ip == '127.0.0.1' || strpos($ip, '192.168.') === 0 || strpos($ip, '10.') === 0) {
        return ['country' => 'Local Network', 'city' => 'Localhost', 'isp' => 'Local Environment'];
    }

    // 2. Cache Check
    try {
        $stmt = $pdo->prepare("SELECT * FROM geo_cache WHERE ip = ?");
        $stmt->execute([$ip]);
        $cached = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($cached) {
            // Update timestamp
            $pdo->prepare("UPDATE geo_cache SET updated_at = CURRENT_TIMESTAMP WHERE ip = ?")->execute([$ip]);
            return [
                'country' => $cached['country'] ?? 'Unknown',
                'city' => $cached['city'] ?? 'Unknown',
                'isp' => $cached['isp'] ?? 'Unknown'
            ];
        }
    } catch (\Exception $e) {
        // Silent fail on cache read
    }

    // 3. API Lookup (ipapi.co)
    $url = "https://ipapi.co/{$ip}/json/";
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($ch, CURLOPT_USERAGENT, 'BloodGroupPredictorAdmin/1.0');

    // Bypass SSL in development
    $is_dev = (getenv('APP_ENV') === 'development');
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, !$is_dev);

    $response = curl_exec($ch);
    curl_close($ch);

    $geo = json_decode($response, true);

    $country = $geo['country_name'] ?? 'Unknown';
    $city = $geo['city'] ?? 'Unknown';
    $isp = $geo['org'] ?? 'Unknown';

    // 4. Save to Cache
    try {
        $stmt = $pdo->prepare("
            INSERT INTO geo_cache (ip, country, city, isp) 
            VALUES (?, ?, ?, ?) 
            ON DUPLICATE KEY UPDATE country=VALUES(country), city=VALUES(city), isp=VALUES(isp)
        ");
        $stmt->execute([$ip, $country, $city, $isp]);
    } catch (\Exception $e) {
        // Silent fail on cache write
    }

    return [
        'country' => $country,
        'city' => $city,
        'isp' => $isp
    ];
}
