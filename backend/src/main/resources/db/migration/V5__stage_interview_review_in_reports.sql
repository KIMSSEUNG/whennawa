ALTER TABLE recruitment_report
  ADD COLUMN interview_review_content VARCHAR(2000) NULL,
  ADD COLUMN interview_difficulty VARCHAR(16) NULL;

ALTER TABLE rolling_report
  ADD COLUMN interview_review_content VARCHAR(2000) NULL,
  ADD COLUMN interview_difficulty VARCHAR(16) NULL;
