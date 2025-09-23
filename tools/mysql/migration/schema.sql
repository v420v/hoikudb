
CREATE TABLE IF NOT EXISTS preschools (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    building_code VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_name (name),
    INDEX idx_building_code (building_code)
);

CREATE TABLE IF NOT EXISTS preschool_locations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    preschool_id BIGINT NOT NULL,
    location GEOMETRY NOT NULL,

    FOREIGN KEY (preschool_id) REFERENCES preschools(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS age_classes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(20) NOT NULL UNIQUE, -- '0歳児', '1歳児', '2歳児', '3歳児', '4歳児', '5歳児'
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_name (name)
);

CREATE TABLE IF NOT EXISTS csv_import_histories (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    file_name VARCHAR(255) NOT NULL,
    kind ENUM('waiting','children','acceptance') NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_file_name (file_name),
    INDEX idx_kind (kind)
);

CREATE TABLE IF NOT EXISTS preschool_monthly_stats (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    csv_import_history_id BIGINT NOT NULL,
    preschool_id BIGINT NOT NULL,
    age_class_id BIGINT NOT NULL,
    target_month DATE NOT NULL,
    kind ENUM('waiting','children','acceptance') NOT NULL,
    value INT DEFAULT 0 NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (csv_import_history_id) REFERENCES csv_import_histories(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (preschool_id) REFERENCES preschools(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (age_class_id) REFERENCES age_classes(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX idx_stats_lookup ON preschool_monthly_stats (target_month, preschool_id, age_class_id, kind, created_at DESC, id DESC);
