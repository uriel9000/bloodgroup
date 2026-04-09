<?php
/**
 * Blood Group Predictor V3 - Auth Middleware
 */
session_start();

function checkAdminAuth($isApi = false)
{
    if (!isset($_SESSION['admin_id'])) {
        if ($isApi) {
            header('Content-Type: application/json');
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized access']);
            exit;
        } else {
            header('Location: /admin-panel/frontend/pages/login.html');
            exit;
        }
    }
}

function checkRole($allowedRoles)
{
    if (!isset($_SESSION['admin_role']) || !in_array($_SESSION['admin_role'], $allowedRoles)) {
        header('Content-Type: application/json');
        http_response_code(403);
        echo json_encode(['error' => 'Forbidden: Insufficient permissions']);
        exit;
    }
}
