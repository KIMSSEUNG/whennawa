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
  company_name VARCHAR(100) NOT NULL UNIQUE
);

CREATE INDEX idx_company_name ON company (company_name);

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
  unit_id BIGINT,
  unit_name ENUM('GENERAL', 'DESIGN_ART', 'IT', 'TECH_ENGINEERING', 'INTEGRATED'),
  channel_type ENUM('FIRST_HALF', 'SECOND_HALF', 'ALWAYS') NOT NULL,
  reported_date DATE NOT NULL,
  step_id BIGINT,
  step_name_raw VARCHAR(100),
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
