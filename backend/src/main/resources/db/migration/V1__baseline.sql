CREATE TABLE IF NOT EXISTS users (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  public_id BINARY(16) NOT NULL UNIQUE,
  email VARCHAR(320) NOT NULL UNIQUE,
  role VARCHAR(20) NOT NULL DEFAULT 'USER',
  deleted_at DATETIME,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

CREATE INDEX idx_users_role ON users (role);

CREATE TABLE IF NOT EXISTS user_refresh_tokens (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  token_hash VARCHAR(128) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_user_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_user_refresh_tokens_user_id ON user_refresh_tokens (user_id);

CREATE TABLE IF NOT EXISTS company (
  company_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  company_name VARCHAR(100) NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_company_name ON company (company_name);
CREATE INDEX idx_company_is_active ON company (is_active);

CREATE TABLE IF NOT EXISTS recruitment_unit (
  unit_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  company_id BIGINT NOT NULL,
  unit_name ENUM('GENERAL', 'DESIGN_ART', 'IT', 'TECH_ENGINEERING', 'INTEGRATED') NOT NULL,
  CONSTRAINT fk_unit_company FOREIGN KEY (company_id) REFERENCES company(company_id)
);

CREATE UNIQUE INDEX uk_recruitment_unit_company_name ON recruitment_unit (company_id, unit_name);
CREATE INDEX idx_recruitment_unit_company ON recruitment_unit (company_id);

CREATE TABLE IF NOT EXISTS recruitment_channel (
  channel_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  unit_id BIGINT NOT NULL,
  channel_type ENUM('FIRST_HALF', 'SECOND_HALF', 'ALWAYS') NOT NULL,
  year INT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  CONSTRAINT fk_recruitment_channel_unit FOREIGN KEY (unit_id) REFERENCES recruitment_unit(unit_id)
);

CREATE INDEX idx_recruitment_channel_unit ON recruitment_channel (unit_id);
CREATE INDEX idx_recruitment_channel_type_year ON recruitment_channel (channel_type, year);
CREATE UNIQUE INDEX uk_recruitment_channel_unit_type_year ON recruitment_channel (unit_id, channel_type, year);

CREATE TABLE IF NOT EXISTS recruitment_step (
  step_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  channel_id BIGINT NOT NULL,
  step_name VARCHAR(100) NOT NULL,
  step_order INT NOT NULL,
  prev_step_id INT,
  next_step_id INT,
  CONSTRAINT fk_recruitment_step_channel FOREIGN KEY (channel_id) REFERENCES recruitment_channel(channel_id)
);

CREATE INDEX idx_recruitment_step_channel ON recruitment_step (channel_id);
CREATE UNIQUE INDEX uk_recruitment_step_channel_name ON recruitment_step (channel_id, step_name);
CREATE UNIQUE INDEX uk_recruitment_step_channel_order ON recruitment_step (channel_id, step_order);

CREATE TABLE IF NOT EXISTS step_date_log (
  log_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  step_id BIGINT NOT NULL,
  target_date DATETIME NOT NULL,
  date_type ENUM('OFFICIAL', 'REPORT') NOT NULL DEFAULT 'REPORT',
  report_count INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_log_step FOREIGN KEY (step_id) REFERENCES recruitment_step(step_id)
);

CREATE UNIQUE INDEX uk_step_date_log_step_date_type ON step_date_log (step_id, target_date, date_type);

CREATE TABLE IF NOT EXISTS step_date_report (
  report_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  company_id BIGINT,
  company_name VARCHAR(100) NOT NULL,
  recruitment_mode ENUM('REGULAR', 'ROLLING') NOT NULL DEFAULT 'REGULAR',
  rolling_result_type VARCHAR(32),
  unit_id BIGINT,
  unit_name ENUM('GENERAL', 'DESIGN_ART', 'IT', 'TECH_ENGINEERING', 'INTEGRATED'),
  channel_type ENUM('FIRST_HALF', 'SECOND_HALF', 'ALWAYS'),
  reported_date DATE,
  prev_reported_date DATE,
  step_id BIGINT,
  step_name_raw VARCHAR(100),
  current_step_name VARCHAR(100),
  report_count INT NOT NULL DEFAULT 1,
  status ENUM('PENDING', 'PROCESSED', 'DISCARDED') NOT NULL DEFAULT 'PENDING',
  deleted_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_step_date_report_company FOREIGN KEY (company_id) REFERENCES company(company_id),
  CONSTRAINT fk_step_date_report_unit FOREIGN KEY (unit_id) REFERENCES recruitment_unit(unit_id),
  CONSTRAINT fk_step_date_report_step FOREIGN KEY (step_id) REFERENCES recruitment_step(step_id)
);

CREATE INDEX idx_step_date_report_status ON step_date_report (status);
CREATE INDEX idx_step_date_report_company ON step_date_report (company_id);
CREATE INDEX idx_step_date_report_unit ON step_date_report (unit_id);
CREATE INDEX idx_step_date_report_channel_type ON step_date_report (channel_type);
CREATE INDEX idx_step_date_report_date ON step_date_report (reported_date);
CREATE INDEX idx_step_date_report_mode ON step_date_report (recruitment_mode);
CREATE INDEX idx_step_date_report_rolling_result_type ON step_date_report (rolling_result_type);
CREATE INDEX idx_step_date_report_prev_date ON step_date_report (prev_reported_date);
CREATE INDEX idx_step_date_report_current_step_name ON step_date_report (current_step_name);

CREATE TABLE IF NOT EXISTS rolling_step_log (
  rolling_log_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  company_id BIGINT,
  company_name VARCHAR(100) NOT NULL,
  current_step_name VARCHAR(100) NOT NULL,
  rolling_result_type VARCHAR(32) NOT NULL,
  prev_reported_date DATE,
  reported_date DATE,
  report_count INT NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_rolling_step_log_company FOREIGN KEY (company_id) REFERENCES company(company_id)
);

CREATE INDEX idx_rolling_step_log_company_name ON rolling_step_log (company_name);
CREATE INDEX idx_rolling_step_log_step_name ON rolling_step_log (current_step_name);
CREATE INDEX idx_rolling_step_log_result_type ON rolling_step_log (rolling_result_type);
CREATE INDEX idx_rolling_step_log_prev_date ON rolling_step_log (prev_reported_date);
CREATE INDEX idx_rolling_step_log_reported_date ON rolling_step_log (reported_date);

DROP VIEW IF EXISTS vw_step_date_log_readable;

CREATE VIEW vw_step_date_log_readable AS
SELECT
  l.log_id,
  c.company_id,
  c.company_name,
  ru.unit_id,
  ru.unit_name,
  rc.channel_id,
  rc.channel_type,
  rc.year AS channel_year,
  rc.is_active AS channel_is_active,
  s.step_id,
  s.step_name,
  s.step_order,
  l.target_date,
  l.date_type,
  l.report_count,
  l.created_at,
  l.updated_at
FROM step_date_log l
JOIN recruitment_step s ON s.step_id = l.step_id
JOIN recruitment_channel rc ON rc.channel_id = s.channel_id
JOIN recruitment_unit ru ON ru.unit_id = rc.unit_id
JOIN company c ON c.company_id = ru.company_id;

CREATE TABLE IF NOT EXISTS chat_room_member (
  member_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  company_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  nickname VARCHAR(64) NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_chat_room_member_company FOREIGN KEY (company_id) REFERENCES company(company_id),
  CONSTRAINT fk_chat_room_member_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE UNIQUE INDEX uk_chat_room_member_company_user ON chat_room_member (company_id, user_id);
CREATE UNIQUE INDEX uk_chat_room_member_company_nickname ON chat_room_member (company_id, nickname);
CREATE INDEX idx_chat_room_member_company ON chat_room_member (company_id);
CREATE INDEX idx_chat_room_member_user ON chat_room_member (user_id);

CREATE TABLE IF NOT EXISTS chat_message (
  message_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  company_id BIGINT NOT NULL,
  member_id BIGINT NOT NULL,
  sender_nickname VARCHAR(64) NOT NULL,
  message VARCHAR(300) NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_chat_message_company FOREIGN KEY (company_id) REFERENCES company(company_id),
  CONSTRAINT fk_chat_message_member FOREIGN KEY (member_id) REFERENCES chat_room_member(member_id)
);

CREATE INDEX idx_chat_message_company_created_at ON chat_message (company_id, created_at);
CREATE INDEX idx_chat_message_created_at ON chat_message (created_at);

INSERT IGNORE INTO users (
  public_id,
  email,
  role,
  created_at,
  updated_at
) VALUES (
  UNHEX(REPLACE(UUID(), '-', '')),
  'whennawa@gmail.com',
  'ADMIN',
  NOW(),
  NOW()
);

INSERT IGNORE INTO users (
  public_id,
  email,
  role,
  created_at,
  updated_at
) VALUES (
  UNHEX(REPLACE(UUID(), '-', '')),
  'tmdghdhkdw@gmail.com',
  'USER',
  NOW(),
  NOW()
);
