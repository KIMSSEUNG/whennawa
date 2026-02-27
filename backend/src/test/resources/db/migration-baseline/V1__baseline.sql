CREATE TABLE IF NOT EXISTS users (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  public_id BINARY(16) NOT NULL UNIQUE,
  email VARCHAR(320) NOT NULL UNIQUE,
  role VARCHAR(20) NOT NULL DEFAULT 'USER',
  deleted_at DATETIME,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

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
  target_date DATETIME,
  CONSTRAINT fk_recruitment_step_channel FOREIGN KEY (channel_id) REFERENCES recruitment_channel(channel_id)
);

CREATE INDEX idx_recruitment_step_channel ON recruitment_step (channel_id);
CREATE INDEX idx_recruitment_step_target_date ON recruitment_step (target_date);
CREATE UNIQUE INDEX uk_recruitment_step_channel_name_date ON recruitment_step (channel_id, step_name, target_date);
