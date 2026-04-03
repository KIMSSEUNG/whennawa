ALTER TABLE rolling_report
  MODIFY COLUMN current_step_name VARCHAR(100) NULL;

ALTER TABLE recruitment_step_log
  MODIFY COLUMN current_step_name VARCHAR(100) NULL;

ALTER TABLE rolling_step_log
  MODIFY COLUMN current_step_name VARCHAR(100) NULL;
