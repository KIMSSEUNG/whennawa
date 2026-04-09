ALTER TABLE recruitment_report
    MODIFY COLUMN interview_review_content TEXT NULL;

ALTER TABLE rolling_report
    MODIFY COLUMN interview_review_content TEXT NULL;

ALTER TABLE interview_review
    MODIFY COLUMN content TEXT NOT NULL;
