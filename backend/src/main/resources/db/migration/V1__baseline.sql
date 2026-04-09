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

CREATE TABLE IF NOT EXISTS company_name_request (
  request_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  company_id BIGINT NULL,
  original_company_name VARCHAR(100) NOT NULL,
  normalized_company_name VARCHAR(100) NOT NULL,
  pending_normalized_name VARCHAR(100)
    GENERATED ALWAYS AS (CASE WHEN status = 'PENDING' THEN normalized_company_name ELSE NULL END) STORED,
  request_count INT NOT NULL DEFAULT 1,
  status ENUM('PENDING', 'PROCESSED', 'DISCARDED') NOT NULL DEFAULT 'PENDING',
  created_by_user_id BIGINT NULL,
  processed_at DATETIME NULL,
  review_note VARCHAR(200) NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_company_name_request_company FOREIGN KEY (company_id) REFERENCES company(company_id)
);

CREATE INDEX idx_company_name_request_status ON company_name_request (status);
CREATE INDEX idx_company_name_request_normalized_name ON company_name_request (normalized_company_name);
CREATE INDEX idx_company_name_request_created_at ON company_name_request (created_at);
CREATE UNIQUE INDEX uk_company_name_request_pending_name ON company_name_request (pending_normalized_name);

CREATE TABLE IF NOT EXISTS job_category (
  job_category_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

CREATE INDEX idx_job_category_active_id ON job_category (is_active, job_category_id);

CREATE TABLE IF NOT EXISTS company_job_category (
  company_job_category_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  company_id BIGINT NOT NULL,
  job_category_id BIGINT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_company_job_category_company FOREIGN KEY (company_id) REFERENCES company(company_id),
  CONSTRAINT fk_company_job_category_job_category FOREIGN KEY (job_category_id) REFERENCES job_category(job_category_id),
  CONSTRAINT uk_company_job_category_company_job UNIQUE (company_id, job_category_id)
);

CREATE INDEX idx_company_job_category_company ON company_job_category (company_id);
CREATE INDEX idx_company_job_category_job_category ON company_job_category (job_category_id);

INSERT INTO company_job_category (company_id, job_category_id, is_active, created_at, updated_at)
SELECT c.company_id, jc.job_category_id, TRUE, NOW(), NOW()
FROM company c
CROSS JOIN job_category jc
WHERE NOT EXISTS (
  SELECT 1
  FROM company_job_category cjc
  WHERE cjc.company_id = c.company_id
    AND cjc.job_category_id = jc.job_category_id
);

CREATE TABLE IF NOT EXISTS recruitment_channel (
  channel_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  company_job_category_id BIGINT NOT NULL,
  year INT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  CONSTRAINT fk_recruitment_channel_company_job_category FOREIGN KEY (company_job_category_id) REFERENCES company_job_category(company_job_category_id)
);

CREATE INDEX idx_recruitment_channel_company_job_category ON recruitment_channel (company_job_category_id);
CREATE UNIQUE INDEX uk_recruitment_channel_company_job_year ON recruitment_channel (company_job_category_id, year);

CREATE TABLE IF NOT EXISTS recruitment_step_master (
  step_master_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  step_name VARCHAR(100) NOT NULL UNIQUE,
  step_kind ENUM('PREV', 'CURRENT', 'BOTH') NOT NULL DEFAULT 'BOTH',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

CREATE INDEX idx_recruitment_step_master_active_id ON recruitment_step_master (is_active, step_master_id);

CREATE TABLE IF NOT EXISTS recruitment_step (
  step_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  channel_id BIGINT NOT NULL,
  step_master_id BIGINT NOT NULL,
  CONSTRAINT fk_recruitment_step_channel FOREIGN KEY (channel_id) REFERENCES recruitment_channel(channel_id)
  ,CONSTRAINT fk_recruitment_step_master FOREIGN KEY (step_master_id) REFERENCES recruitment_step_master(step_master_id)
);

CREATE INDEX idx_recruitment_step_channel ON recruitment_step (channel_id);
CREATE INDEX idx_recruitment_step_master ON recruitment_step (step_master_id);
CREATE UNIQUE INDEX uk_recruitment_step_channel_master ON recruitment_step (channel_id, step_master_id);

CREATE TABLE IF NOT EXISTS recruitment_step_pair (
  pair_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  company_job_category_id BIGINT NOT NULL,
  prev_step_master_id BIGINT NOT NULL,
  current_step_master_id BIGINT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_recruitment_step_pair_company_job_category FOREIGN KEY (company_job_category_id) REFERENCES company_job_category(company_job_category_id),
  CONSTRAINT fk_recruitment_step_pair_prev_master FOREIGN KEY (prev_step_master_id) REFERENCES recruitment_step_master(step_master_id),
  CONSTRAINT fk_recruitment_step_pair_current_master FOREIGN KEY (current_step_master_id) REFERENCES recruitment_step_master(step_master_id),
  CONSTRAINT uk_recruitment_step_pair UNIQUE (company_job_category_id, prev_step_master_id, current_step_master_id)
);

CREATE INDEX idx_recruitment_step_pair_company_job_category ON recruitment_step_pair (company_job_category_id);

CREATE TABLE IF NOT EXISTS rolling_step_master (
  rolling_step_master_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  step_name VARCHAR(100) NOT NULL UNIQUE,
  step_kind ENUM('PREV', 'CURRENT', 'BOTH') NOT NULL DEFAULT 'BOTH',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

CREATE INDEX idx_rolling_step_master_active_id ON rolling_step_master (is_active, rolling_step_master_id);

CREATE TABLE IF NOT EXISTS rolling_step_pair (
  rolling_pair_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  company_job_category_id BIGINT NOT NULL,
  prev_rolling_step_master_id BIGINT NOT NULL,
  current_rolling_step_master_id BIGINT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_rolling_step_pair_company_job_category FOREIGN KEY (company_job_category_id) REFERENCES company_job_category(company_job_category_id),
  CONSTRAINT fk_rolling_step_pair_prev_master FOREIGN KEY (prev_rolling_step_master_id) REFERENCES rolling_step_master(rolling_step_master_id),
  CONSTRAINT fk_rolling_step_pair_current_master FOREIGN KEY (current_rolling_step_master_id) REFERENCES rolling_step_master(rolling_step_master_id),
  CONSTRAINT uk_rolling_step_pair UNIQUE (company_job_category_id, prev_rolling_step_master_id, current_rolling_step_master_id)
);

CREATE INDEX idx_rolling_step_pair_company_job_category ON rolling_step_pair (company_job_category_id);

CREATE TABLE IF NOT EXISTS rolling_job (
  rolling_job_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  company_id BIGINT NOT NULL,
  job_name VARCHAR(100) NOT NULL,
  normalized_job_name VARCHAR(100) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_rolling_job_company FOREIGN KEY (company_id) REFERENCES company(company_id),
  CONSTRAINT uk_rolling_job_company_normalized UNIQUE (company_id, normalized_job_name)
);

CREATE INDEX idx_rolling_job_company ON rolling_job (company_id);
CREATE INDEX idx_rolling_job_active_id ON rolling_job (is_active, rolling_job_id);

INSERT INTO rolling_step_master (step_name, step_kind, is_active, created_at, updated_at)
SELECT rsm.step_name, rsm.step_kind, rsm.is_active, NOW(), NOW()
FROM recruitment_step_master rsm
ON DUPLICATE KEY UPDATE
  step_kind = CASE
    WHEN rolling_step_master.step_kind = VALUES(step_kind) THEN rolling_step_master.step_kind
    WHEN rolling_step_master.step_kind = 'BOTH' OR VALUES(step_kind) = 'BOTH' THEN 'BOTH'
    ELSE 'BOTH'
  END,
  is_active = VALUES(is_active),
  updated_at = NOW();

INSERT INTO rolling_step_pair (
  company_job_category_id,
  prev_rolling_step_master_id,
  current_rolling_step_master_id,
  is_active,
  created_at,
  updated_at
)
SELECT
  rp.company_job_category_id,
  prev_rm.rolling_step_master_id,
  curr_rm.rolling_step_master_id,
  rp.is_active,
  NOW(),
  NOW()
FROM recruitment_step_pair rp
JOIN recruitment_step_master prev_sm ON prev_sm.step_master_id = rp.prev_step_master_id
JOIN recruitment_step_master curr_sm ON curr_sm.step_master_id = rp.current_step_master_id
JOIN rolling_step_master prev_rm ON prev_rm.step_name = prev_sm.step_name
JOIN rolling_step_master curr_rm ON curr_rm.step_name = curr_sm.step_name
ON DUPLICATE KEY UPDATE
  is_active = VALUES(is_active),
  updated_at = NOW();

CREATE TABLE IF NOT EXISTS recruitment_report (
  report_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  company_id BIGINT,
  job_category_id BIGINT NOT NULL,
  company_name VARCHAR(100) NOT NULL,
  recruitment_mode ENUM('REGULAR', 'ROLLING', 'INTERN') NOT NULL DEFAULT 'REGULAR',
  rolling_result_type VARCHAR(32),
  reported_date DATE,
  prev_reported_date DATE,
  prev_step_name VARCHAR(100),
  current_step_name VARCHAR(100),
  other_job_name VARCHAR(20),
  interview_review_content TEXT NULL,
  interview_difficulty VARCHAR(16) NULL,
  job_review_status VARCHAR(16) NOT NULL DEFAULT 'PENDING',
  job_reviewed_at DATETIME NULL,
  report_count INT NOT NULL DEFAULT 1,
  status ENUM('PENDING', 'PROCESSED', 'DISCARDED') NOT NULL DEFAULT 'PENDING',
  deleted_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_recruitment_report_company FOREIGN KEY (company_id) REFERENCES company(company_id),
  CONSTRAINT fk_recruitment_report_job_category FOREIGN KEY (job_category_id) REFERENCES job_category(job_category_id)
);

CREATE INDEX idx_recruitment_report_status ON recruitment_report (status);
CREATE INDEX idx_recruitment_report_company ON recruitment_report (company_id);
CREATE INDEX idx_recruitment_report_job_category ON recruitment_report (job_category_id);
CREATE INDEX idx_recruitment_report_date ON recruitment_report (reported_date);
CREATE INDEX idx_recruitment_report_mode ON recruitment_report (recruitment_mode);
CREATE INDEX idx_recruitment_report_rolling_result_type ON recruitment_report (rolling_result_type);
CREATE INDEX idx_recruitment_report_prev_date ON recruitment_report (prev_reported_date);
CREATE INDEX idx_recruitment_report_prev_step_name ON recruitment_report (prev_step_name);
CREATE INDEX idx_recruitment_report_current_step_name ON recruitment_report (current_step_name);
CREATE INDEX idx_recruitment_report_job_review_status ON recruitment_report (job_review_status);
CREATE INDEX idx_recruitment_report_company_other_job_name ON recruitment_report (company_id, other_job_name);

CREATE TABLE IF NOT EXISTS rolling_report (
  rolling_report_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  company_id BIGINT,
  rolling_job_id BIGINT NOT NULL,
  job_category_id BIGINT,
  company_name VARCHAR(100) NOT NULL,
  rolling_result_type VARCHAR(32) NOT NULL,
  reported_date DATE,
  prev_reported_date DATE,
  prev_step_name VARCHAR(100),
  current_step_name VARCHAR(100) NOT NULL,
  other_job_name VARCHAR(20),
  interview_review_content TEXT NULL,
  interview_difficulty VARCHAR(16) NULL,
  job_review_status VARCHAR(16) NOT NULL DEFAULT 'PENDING',
  job_reviewed_at DATETIME NULL,
  report_count INT NOT NULL DEFAULT 1,
  status ENUM('PENDING', 'PROCESSED', 'DISCARDED') NOT NULL DEFAULT 'PENDING',
  deleted_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_rolling_report_company FOREIGN KEY (company_id) REFERENCES company(company_id),
  CONSTRAINT fk_rolling_report_rolling_job FOREIGN KEY (rolling_job_id) REFERENCES rolling_job(rolling_job_id),
  CONSTRAINT fk_rolling_report_job_category FOREIGN KEY (job_category_id) REFERENCES job_category(job_category_id)
);

CREATE INDEX idx_rolling_report_status ON rolling_report (status);
CREATE INDEX idx_rolling_report_company ON rolling_report (company_id);
CREATE INDEX idx_rolling_report_rolling_job ON rolling_report (rolling_job_id);
CREATE INDEX idx_rolling_report_job_category ON rolling_report (job_category_id);
CREATE INDEX idx_rolling_report_date ON rolling_report (reported_date);
CREATE INDEX idx_rolling_report_rolling_result_type ON rolling_report (rolling_result_type);
CREATE INDEX idx_rolling_report_prev_date ON rolling_report (prev_reported_date);
CREATE INDEX idx_rolling_report_prev_step_name ON rolling_report (prev_step_name);
CREATE INDEX idx_rolling_report_current_step_name ON rolling_report (current_step_name);
CREATE INDEX idx_rolling_report_job_review_status ON rolling_report (job_review_status);
CREATE INDEX idx_rolling_report_company_other_job_name ON rolling_report (company_id, other_job_name);

CREATE TABLE IF NOT EXISTS recruitment_step_log (
  recruitment_log_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  company_id BIGINT,
  company_name VARCHAR(100) NOT NULL,
  current_step_name VARCHAR(100) NOT NULL,
  prev_step_name VARCHAR(100),
  result_type VARCHAR(32) NOT NULL,
  recruitment_mode VARCHAR(16) NOT NULL,
  source_type ENUM('OFFICIAL', 'REPORT') NOT NULL DEFAULT 'REPORT',
  prev_reported_date DATE,
  reported_date DATE,
  report_count INT NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_recruitment_step_log_company FOREIGN KEY (company_id) REFERENCES company(company_id)
);

CREATE INDEX idx_recruitment_step_log_company_name ON recruitment_step_log (company_name);
CREATE INDEX idx_recruitment_step_log_step_name ON recruitment_step_log (current_step_name);
CREATE INDEX idx_recruitment_step_log_prev_step_name ON recruitment_step_log (prev_step_name);
CREATE INDEX idx_recruitment_step_log_result_type ON recruitment_step_log (result_type);
CREATE INDEX idx_recruitment_step_log_mode ON recruitment_step_log (recruitment_mode);
CREATE INDEX idx_recruitment_step_log_source_type ON recruitment_step_log (source_type);
CREATE INDEX idx_recruitment_step_log_prev_date ON recruitment_step_log (prev_reported_date);
CREATE INDEX idx_recruitment_step_log_reported_date ON recruitment_step_log (reported_date);

CREATE TABLE IF NOT EXISTS rolling_step_log (
  rolling_log_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  company_id BIGINT,
  rolling_job_id BIGINT,
  company_name VARCHAR(100) NOT NULL,
  current_step_name VARCHAR(100) NOT NULL,
  prev_step_name VARCHAR(100),
  rolling_result_type VARCHAR(32) NOT NULL,
  recruitment_mode VARCHAR(16),
  source_type ENUM('OFFICIAL', 'REPORT') NOT NULL DEFAULT 'REPORT',
  prev_reported_date DATE,
  reported_date DATE,
  report_count INT NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_rolling_step_log_company FOREIGN KEY (company_id) REFERENCES company(company_id),
  CONSTRAINT fk_rolling_step_log_rolling_job FOREIGN KEY (rolling_job_id) REFERENCES rolling_job(rolling_job_id)
);

CREATE INDEX idx_rolling_step_log_company_name ON rolling_step_log (company_name);
CREATE INDEX idx_rolling_step_log_rolling_job ON rolling_step_log (rolling_job_id);
CREATE INDEX idx_rolling_step_log_step_name ON rolling_step_log (current_step_name);
CREATE INDEX idx_rolling_step_log_prev_step_name ON rolling_step_log (prev_step_name);
CREATE INDEX idx_rolling_step_log_result_type ON rolling_step_log (rolling_result_type);
CREATE INDEX idx_rolling_step_log_mode ON rolling_step_log (recruitment_mode);
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
  is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
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
  is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
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

CREATE TABLE IF NOT EXISTS career_board_post (
  post_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  title VARCHAR(120) NOT NULL,
  content VARCHAR(3000) NOT NULL,
  is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_career_board_post_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_career_board_post_created_at ON career_board_post (created_at);
CREATE INDEX idx_career_board_post_user ON career_board_post (user_id);

CREATE TABLE IF NOT EXISTS career_board_comment (
  comment_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  post_id BIGINT NOT NULL,
  parent_comment_id BIGINT NULL,
  user_id BIGINT NOT NULL,
  content VARCHAR(3000) NOT NULL,
  is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
  like_count INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_career_board_comment_post FOREIGN KEY (post_id) REFERENCES career_board_post(post_id),
  CONSTRAINT fk_career_board_comment_parent FOREIGN KEY (parent_comment_id) REFERENCES career_board_comment(comment_id),
  CONSTRAINT fk_career_board_comment_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_career_board_comment_post_created_at ON career_board_comment (post_id, created_at);
CREATE INDEX idx_career_board_comment_parent ON career_board_comment (parent_comment_id);
CREATE INDEX idx_career_board_comment_user ON career_board_comment (user_id);

CREATE TABLE IF NOT EXISTS career_board_comment_like (
  like_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  comment_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_career_board_comment_like_comment FOREIGN KEY (comment_id) REFERENCES career_board_comment(comment_id),
  CONSTRAINT fk_career_board_comment_like_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT uk_career_board_comment_like_comment_user UNIQUE (comment_id, user_id)
);

CREATE INDEX idx_career_board_comment_like_comment ON career_board_comment_like (comment_id);
CREATE INDEX idx_career_board_comment_like_user ON career_board_comment_like (user_id);

CREATE TABLE IF NOT EXISTS company_notification_subscription (
  subscription_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  company_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_company_notification_subscription_company FOREIGN KEY (company_id) REFERENCES company(company_id),
  CONSTRAINT fk_company_notification_subscription_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT uk_company_notification_subscription_user_company UNIQUE (user_id, company_id)
);

CREATE INDEX idx_company_notification_subscription_user ON company_notification_subscription (user_id);
CREATE INDEX idx_company_notification_subscription_company ON company_notification_subscription (company_id);

CREATE TABLE IF NOT EXISTS company_notification (
  notification_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  company_id BIGINT NOT NULL,
  event_date DATE NOT NULL,
  first_reporter_nickname VARCHAR(64) NOT NULL,
  reporter_message VARCHAR(200) NULL,
  reporter_count INT NOT NULL DEFAULT 1,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_company_notification_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_company_notification_company FOREIGN KEY (company_id) REFERENCES company(company_id),
  CONSTRAINT uk_company_notification_user_company_event_date UNIQUE (user_id, company_id, event_date)
);

CREATE INDEX idx_company_notification_user_updated ON company_notification (user_id, updated_at);
CREATE INDEX idx_company_notification_company_event ON company_notification (company_id, event_date);

CREATE TABLE IF NOT EXISTS user_block (
  block_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  blocker_user_id BIGINT NOT NULL,
  blocked_user_id BIGINT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_user_block_blocker FOREIGN KEY (blocker_user_id) REFERENCES users(id),
  CONSTRAINT fk_user_block_blocked FOREIGN KEY (blocked_user_id) REFERENCES users(id),
  CONSTRAINT uk_user_block_pair UNIQUE (blocker_user_id, blocked_user_id)
);

CREATE INDEX idx_user_block_blocker_active ON user_block (blocker_user_id, is_active);
CREATE INDEX idx_user_block_blocked_active ON user_block (blocked_user_id, is_active);

CREATE TABLE IF NOT EXISTS interview_review (
  review_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  company_id BIGINT NOT NULL,
  user_id BIGINT NULL,
  report_id BIGINT NULL,
  rolling_report_id BIGINT NULL,
  recruitment_mode ENUM('REGULAR', 'ROLLING', 'INTERN') NOT NULL,
  step_name VARCHAR(100) NOT NULL,
  difficulty VARCHAR(16) NOT NULL DEFAULT 'MEDIUM',
  content TEXT NOT NULL,
  like_count INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_interview_review_company FOREIGN KEY (company_id) REFERENCES company(company_id),
  CONSTRAINT fk_interview_review_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_interview_review_report FOREIGN KEY (report_id) REFERENCES recruitment_report(report_id),
  CONSTRAINT fk_interview_review_rolling_report FOREIGN KEY (rolling_report_id) REFERENCES rolling_report(rolling_report_id)
);

CREATE INDEX idx_interview_review_company_active_created ON interview_review (company_id, is_active, created_at);
CREATE INDEX idx_interview_review_company_active_like ON interview_review (company_id, is_active, like_count);

CREATE TABLE IF NOT EXISTS interview_review_like (
  like_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  review_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_interview_review_like_review FOREIGN KEY (review_id) REFERENCES interview_review(review_id),
  CONSTRAINT fk_interview_review_like_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT uk_interview_review_like_review_user UNIQUE (review_id, user_id)
);

CREATE INDEX idx_interview_review_like_user ON interview_review_like (user_id);
