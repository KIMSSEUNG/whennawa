CREATE TABLE IF NOT EXISTS users (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  public_id BINARY(16) NOT NULL UNIQUE,
  email VARCHAR(320) NOT NULL UNIQUE,
  nickname VARCHAR(64) NOT NULL UNIQUE,
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

CREATE TABLE IF NOT EXISTS recruitment_channel (
  channel_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  company_id BIGINT NOT NULL,
  year INT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  CONSTRAINT fk_recruitment_channel_company FOREIGN KEY (company_id) REFERENCES company(company_id)
);

CREATE INDEX idx_recruitment_channel_company ON recruitment_channel (company_id);
CREATE UNIQUE INDEX uk_recruitment_channel_company_year ON recruitment_channel (company_id, year);

CREATE TABLE IF NOT EXISTS recruitment_step (
  step_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  channel_id BIGINT NOT NULL,
  step_name VARCHAR(100) NOT NULL,
  CONSTRAINT fk_recruitment_step_channel FOREIGN KEY (channel_id) REFERENCES recruitment_channel(channel_id)
);

CREATE INDEX idx_recruitment_step_channel ON recruitment_step (channel_id);
CREATE UNIQUE INDEX uk_recruitment_step_channel_name ON recruitment_step (channel_id, step_name);

CREATE TABLE IF NOT EXISTS step_date_report (
  report_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  company_id BIGINT,
  company_name VARCHAR(100) NOT NULL,
  recruitment_mode ENUM('REGULAR', 'ROLLING') NOT NULL DEFAULT 'REGULAR',
  rolling_result_type VARCHAR(32),
  reported_date DATE,
  prev_reported_date DATE,
  prev_step_name VARCHAR(100),
  current_step_name VARCHAR(100),
  report_count INT NOT NULL DEFAULT 1,
  status ENUM('PENDING', 'PROCESSED', 'DISCARDED') NOT NULL DEFAULT 'PENDING',
  deleted_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_step_date_report_company FOREIGN KEY (company_id) REFERENCES company(company_id)
);

CREATE INDEX idx_step_date_report_status ON step_date_report (status);
CREATE INDEX idx_step_date_report_company ON step_date_report (company_id);
CREATE INDEX idx_step_date_report_date ON step_date_report (reported_date);
CREATE INDEX idx_step_date_report_mode ON step_date_report (recruitment_mode);
CREATE INDEX idx_step_date_report_rolling_result_type ON step_date_report (rolling_result_type);
CREATE INDEX idx_step_date_report_prev_date ON step_date_report (prev_reported_date);
CREATE INDEX idx_step_date_report_prev_step_name ON step_date_report (prev_step_name);
CREATE INDEX idx_step_date_report_current_step_name ON step_date_report (current_step_name);

CREATE TABLE IF NOT EXISTS rolling_step_log (
  rolling_log_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  company_id BIGINT,
  company_name VARCHAR(100) NOT NULL,
  current_step_name VARCHAR(100) NOT NULL,
  rolling_result_type VARCHAR(32) NOT NULL,
  source_type ENUM('OFFICIAL', 'REPORT') NOT NULL DEFAULT 'REPORT',
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
CREATE INDEX idx_rolling_step_log_source_type ON rolling_step_log (source_type);
CREATE INDEX idx_rolling_step_log_prev_date ON rolling_step_log (prev_reported_date);
CREATE INDEX idx_rolling_step_log_reported_date ON rolling_step_log (reported_date);

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

CREATE TABLE IF NOT EXISTS board_post (
  post_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  company_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  title VARCHAR(120) NOT NULL,
  content VARCHAR(3000) NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_board_post_company FOREIGN KEY (company_id) REFERENCES company(company_id),
  CONSTRAINT fk_board_post_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_board_post_company_created_at ON board_post (company_id, created_at);
CREATE INDEX idx_board_post_user ON board_post (user_id);

CREATE TABLE IF NOT EXISTS board_comment (
  comment_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  post_id BIGINT NOT NULL,
  parent_comment_id BIGINT NULL,
  user_id BIGINT NOT NULL,
  content VARCHAR(3000) NOT NULL,
  like_count INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_board_comment_post FOREIGN KEY (post_id) REFERENCES board_post(post_id),
  CONSTRAINT fk_board_comment_parent FOREIGN KEY (parent_comment_id) REFERENCES board_comment(comment_id),
  CONSTRAINT fk_board_comment_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_board_comment_post_created_at ON board_comment (post_id, created_at);
CREATE INDEX idx_board_comment_parent ON board_comment (parent_comment_id);
CREATE INDEX idx_board_comment_user ON board_comment (user_id);

CREATE TABLE IF NOT EXISTS board_comment_like (
  like_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  comment_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_board_comment_like_comment FOREIGN KEY (comment_id) REFERENCES board_comment(comment_id),
  CONSTRAINT fk_board_comment_like_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT uk_board_comment_like_comment_user UNIQUE (comment_id, user_id)
);

CREATE INDEX idx_board_comment_like_comment ON board_comment_like (comment_id);
CREATE INDEX idx_board_comment_like_user ON board_comment_like (user_id);

INSERT IGNORE INTO users (
  public_id,
  email,
  nickname,
  role,
  created_at,
  updated_at
) VALUES (
  UNHEX(REPLACE(UUID(), '-', '')),
  'whennawa@gmail.com',
  'admin#00001',
  'ADMIN',
  NOW(),
  NOW()
);

/*
INSERT IGNORE INTO users (
  public_id,
  email,
  nickname,
  role,
  created_at,
  updated_at
) VALUES (
  UNHEX(REPLACE(UUID(), '-', '')),
  'tmdghdhkdw@gmail.com',
  'member#00001',
  'USER',
  NOW(),
  NOW()
);
*/
