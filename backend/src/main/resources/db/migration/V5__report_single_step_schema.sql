ALTER TABLE recruitment_report
  ADD COLUMN base_date DATE NULL AFTER rolling_result_type,
  ADD COLUMN step_name VARCHAR(100) NULL AFTER base_date;

UPDATE recruitment_report
SET
  base_date = COALESCE(base_date, prev_reported_date),
  step_name = COALESCE(NULLIF(TRIM(current_step_name), ''), NULLIF(TRIM(prev_step_name), ''))
WHERE base_date IS NULL
   OR step_name IS NULL;

CREATE INDEX idx_recruitment_report_base_date ON recruitment_report (base_date);
CREATE INDEX idx_recruitment_report_step_name ON recruitment_report (step_name);

ALTER TABLE rolling_report
  ADD COLUMN base_date DATE NULL AFTER rolling_result_type,
  ADD COLUMN step_name VARCHAR(100) NULL AFTER base_date;

UPDATE rolling_report
SET
  base_date = COALESCE(base_date, prev_reported_date),
  step_name = COALESCE(NULLIF(TRIM(current_step_name), ''), NULLIF(TRIM(prev_step_name), ''))
WHERE base_date IS NULL
   OR step_name IS NULL;

CREATE INDEX idx_rolling_report_base_date ON rolling_report (base_date);
CREATE INDEX idx_rolling_report_step_name ON rolling_report (step_name);

ALTER TABLE recruitment_step_log
  ADD COLUMN base_date DATE NULL AFTER source_type,
  ADD COLUMN step_name VARCHAR(100) NULL AFTER company_name;

UPDATE recruitment_step_log
SET
  base_date = COALESCE(base_date, prev_reported_date),
  step_name = COALESCE(NULLIF(TRIM(current_step_name), ''), NULLIF(TRIM(prev_step_name), ''))
WHERE base_date IS NULL
   OR step_name IS NULL;

CREATE INDEX idx_recruitment_step_log_base_date ON recruitment_step_log (base_date);
CREATE INDEX idx_recruitment_step_log_step_name_v2 ON recruitment_step_log (step_name);

ALTER TABLE rolling_step_log
  ADD COLUMN base_date DATE NULL AFTER source_type,
  ADD COLUMN step_name VARCHAR(100) NULL AFTER company_name;

UPDATE rolling_step_log
SET
  base_date = COALESCE(base_date, prev_reported_date),
  step_name = COALESCE(NULLIF(TRIM(current_step_name), ''), NULLIF(TRIM(prev_step_name), ''))
WHERE base_date IS NULL
   OR step_name IS NULL;

CREATE INDEX idx_rolling_step_log_base_date ON rolling_step_log (base_date);
CREATE INDEX idx_rolling_step_log_step_name_v2 ON rolling_step_log (step_name);
