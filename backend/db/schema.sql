-- ORA order backend schema. Idempotent: safe to re-run.
-- Applied by `npm run setup` (scripts/setup.js).

CREATE TABLE IF NOT EXISTS orders (
  id                     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  reference              VARCHAR(32)  NOT NULL,
  status                 ENUM('pending_review','payment_confirmed','in_production','shipped','delivered','cancelled')
                         NOT NULL DEFAULT 'pending_review',
  locale                 ENUM('en','ar') NOT NULL,

  full_name              VARCHAR(120) NOT NULL,
  mobile_number          VARCHAR(20)  NOT NULL,
  address                VARCHAR(500) NOT NULL,
  height_cm              DECIMAL(5,1) NOT NULL,
  weight_kg              DECIMAL(5,1) NOT NULL,

  arm_length             DECIMAL(5,1) NOT NULL,
  shoulder_circumference DECIMAL(5,1) NOT NULL,
  blouse_length          DECIMAL(5,1) NOT NULL,
  trouser_length         DECIMAL(5,1) NOT NULL,
  hip_circumference      DECIMAL(5,1) NOT NULL,
  waist_circumference    DECIMAL(5,1) NOT NULL,
  chest_circumference    DECIMAL(5,1) NOT NULL,
  thigh_circumference    DECIMAL(5,1) NOT NULL,

  shape                  VARCHAR(1000) NOT NULL,
  material               ENUM('rosaline','angelica') NOT NULL,
  color_description      VARCHAR(1000) NULL,
  additional_details     VARCHAR(2000) NULL,

  payment_method         ENUM('vodafone_cash','instapay') NOT NULL,

  admin_notes            VARCHAR(2000) NULL,
  client_ip              VARCHAR(45)  NULL,

  -- New-order email to the shop (see src/services/notifier.js).
  notified_at            DATETIME NULL,
  notify_attempts        TINYINT UNSIGNED NOT NULL DEFAULT 0,
  notify_locked_until    DATETIME NULL,

  created_at             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_orders_reference (reference),
  KEY idx_orders_status_created (status, created_at),
  KEY idx_orders_created (created_at),
  KEY idx_orders_pending_notify (notified_at, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- File ids are random UUIDs so they can't be enumerated; stored_name is
-- generated server-side and never derived from the uploaded filename.
CREATE TABLE IF NOT EXISTS order_files (
  id            CHAR(36)     NOT NULL,
  order_id      BIGINT UNSIGNED NOT NULL,
  kind          ENUM('reference_photo','color_reference','design_reference','payment_screenshot') NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  stored_name   VARCHAR(64)  NOT NULL,
  mime_type     VARCHAR(32)  NOT NULL,
  size_bytes    INT UNSIGNED NOT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_order_files_order (order_id),
  CONSTRAINT fk_order_files_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admins (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  username      VARCHAR(64)  NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at DATETIME NULL,

  PRIMARY KEY (id),
  UNIQUE KEY uq_admins_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Only a SHA-256 hash of each session token is stored, so a database
-- leak doesn't hand out live admin sessions.
CREATE TABLE IF NOT EXISTS admin_sessions (
  token_hash CHAR(64)     NOT NULL,
  admin_id   INT UNSIGNED NOT NULL,
  expires_at DATETIME     NOT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (token_hash),
  KEY idx_admin_sessions_expires (expires_at),
  CONSTRAINT fk_admin_sessions_admin FOREIGN KEY (admin_id) REFERENCES admins (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
