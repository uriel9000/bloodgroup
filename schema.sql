-- Blood Group Predictor - Full System Schema

CREATE DATABASE IF NOT EXISTS blood_predictor;
USE blood_predictor;

-- Admins Table
CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(100) NOT NULL,
    role ENUM('super_admin', 'admin') DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ... (Calculations, Blood Info)

-- System Settings Table
CREATE TABLE IF NOT EXISTS settings (
    setting_key VARCHAR(50) PRIMARY KEY,
    setting_value VARCHAR(255),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- AI Response Cache Table
CREATE TABLE IF NOT EXISTS ai_cache (
    id INT AUTO_INCREMENT PRIMARY KEY,
    prompt_hash VARCHAR(64) NOT NULL UNIQUE,
    response_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Clinical Genetic Analysis Track
CREATE TABLE IF NOT EXISTS genetic_analysis (
    id INT AUTO_INCREMENT PRIMARY KEY,
    parent_1 VARCHAR(10) NOT NULL,
    parent_2 VARCHAR(10) NOT NULL,
    result JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI Execution Logs
CREATE TABLE IF NOT EXISTS ai_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    prompt TEXT NOT NULL,
    response TEXT NOT NULL,
    admin_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed Data (Default Users - Password: password123)
-- Hash: $2y$12$6IGX01s6.4sUvyJDmNudVuwMqYFCRUsy5iLLln19o9J4fHToYYx6a
INSERT INTO admins (email, password, role) VALUES ('superadmin@example.com', '$2y$12$6IGX01s6.4sUvyJDmNudVuwMqYFCRUsy5iLLln19o9J4fHToYYx6a', 'super_admin');
INSERT INTO admins (email, password, role) VALUES ('admin@example.com', '$2y$12$6IGX01s6.4sUvyJDmNudVuwMqYFCRUsy5iLLln19o9J4fHToYYx6a', 'admin');

-- ... (Seed Blood Info, Seed Settings)

-- Security Heatmap Logs Table
CREATE TABLE IF NOT EXISTS admin_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admin_id INT NOT NULL,
    ip VARCHAR(45) NOT NULL,
    user_agent TEXT,
    country VARCHAR(100) NULL,
    city VARCHAR(100) NULL,
    isp VARCHAR(150) NULL,
    device_type VARCHAR(50) NULL,
    browser_fingerprint VARCHAR(255) NULL,
    risk_level VARCHAR(10) DEFAULT 'low',
    flagged BOOLEAN DEFAULT FALSE,
    status ENUM('success', 'failed') DEFAULT 'success',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Geo-Location Cache Table
CREATE TABLE IF NOT EXISTS geo_cache (
    ip VARCHAR(45) PRIMARY KEY,
    country VARCHAR(100),
    city VARCHAR(100),
    isp VARCHAR(150),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX idx_logs_country ON admin_logs(country);
CREATE INDEX idx_logs_risk ON admin_logs(risk_level);
CREATE INDEX idx_logs_admin ON admin_logs(admin_id);
