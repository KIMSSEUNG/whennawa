/*
  Dummy data for test baseline schema.
  Keeps compatibility with reduced baseline tables.
*/

INSERT IGNORE INTO users (public_id, email, role, created_at, updated_at) VALUES
(UNHEX(REPLACE(UUID(), '-', '')), 'dummy.user1@whennawa.test', 'USER', NOW(), NOW()),
(UNHEX(REPLACE(UUID(), '-', '')), 'dummy.user2@whennawa.test', 'USER', NOW(), NOW()),
(UNHEX(REPLACE(UUID(), '-', '')), 'dummy.mod@whennawa.test', 'ADMIN', NOW(), NOW());

INSERT IGNORE INTO company (company_name) VALUES
('더미전자'),
('더미소프트'),
('더미금융');

INSERT IGNORE INTO company_job_category (company_id, job_category_id, is_active, created_at, updated_at)
SELECT c.company_id, jc.job_category_id, TRUE, NOW(), NOW()
FROM company c
JOIN job_category jc ON jc.is_active = TRUE
WHERE c.company_name IN ('더미전자', '더미소프트', '더미금융');

INSERT IGNORE INTO recruitment_channel (company_job_category_id, year, is_active)
SELECT cjc.company_job_category_id, 2026, TRUE
FROM company_job_category cjc
JOIN company c ON c.company_id = cjc.company_id
JOIN job_category jc ON jc.job_category_id = cjc.job_category_id
WHERE (c.company_name = '더미소프트' AND jc.name = 'IT인터넷')
   OR (c.company_name = '더미금융' AND jc.name = '금융');

INSERT INTO recruitment_report (
  company_id, job_category_id, company_name, recruitment_mode, rolling_result_type,
  reported_date, prev_reported_date, prev_step_name, current_step_name,
  other_job_name, job_review_status, job_reviewed_at, report_count, status, deleted_at, created_at, updated_at
)
SELECT
  c.company_id,
  jc.job_category_id,
  c.company_name,
  'REGULAR',
  NULL,
  DATE('2026-01-20'),
  DATE('2026-01-10'),
  '서류 지원',
  '서류 발표',
  NULL,
  'APPROVED',
  NOW(),
  2,
  'PROCESSED',
  NULL,
  NOW(),
  NOW()
FROM company c
JOIN job_category jc ON jc.name = 'IT인터넷'
WHERE c.company_name = '더미소프트'
UNION ALL
SELECT
  c.company_id,
  jc.job_category_id,
  c.company_name,
  'INTERN',
  NULL,
  DATE('2026-02-07'),
  DATE('2026-01-30'),
  '1차 면접',
  '최종 발표',
  NULL,
  'PENDING',
  NULL,
  1,
  'PENDING',
  NULL,
  NOW(),
  NOW()
FROM company c
JOIN job_category jc ON jc.name = '금융'
WHERE c.company_name = '더미금융';

INSERT IGNORE INTO rolling_job (company_id, job_name, normalized_job_name, is_active, created_at, updated_at)
SELECT c.company_id, '백엔드 개발자', '백엔드개발자', TRUE, NOW(), NOW()
FROM company c
WHERE c.company_name = '더미소프트';

INSERT INTO rolling_report (
  company_id, rolling_job_id, job_category_id, company_name, rolling_result_type,
  reported_date, prev_reported_date, prev_step_name, current_step_name,
  other_job_name, job_review_status, job_reviewed_at, report_count, status, deleted_at, created_at, updated_at
)
SELECT
  c.company_id,
  rj.rolling_job_id,
  jc.job_category_id,
  c.company_name,
  'DATE_REPORTED',
  DATE('2026-03-01'),
  DATE('2026-02-20'),
  '코딩 테스트',
  '1차 면접 발표',
  rj.job_name,
  'APPROVED',
  NOW(),
  3,
  'PROCESSED',
  NULL,
  NOW(),
  NOW()
FROM company c
JOIN rolling_job rj ON rj.company_id = c.company_id AND rj.normalized_job_name = '백엔드개발자'
JOIN job_category jc ON jc.name = 'IT인터넷'
WHERE c.company_name = '더미소프트';

INSERT INTO recruitment_step_log (
  company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode,
  source_type, prev_reported_date, reported_date, report_count, created_at, updated_at
)
SELECT c.company_id, c.company_name, '서류 발표', '서류 지원', 'DATE_REPORTED', 'REGULAR',
       'OFFICIAL', DATE('2026-01-10'), DATE('2026-01-20'), 2, NOW(), NOW()
FROM company c
WHERE c.company_name = '더미소프트';

INSERT INTO rolling_step_log (
  company_id, rolling_job_id, company_name, current_step_name, prev_step_name,
  rolling_result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at
)
SELECT c.company_id, rj.rolling_job_id, c.company_name, '1차 면접 발표', '코딩 테스트',
       'DATE_REPORTED', 'ROLLING', 'REPORT', DATE('2026-02-20'), DATE('2026-03-01'), 3, NOW(), NOW()
FROM company c
JOIN rolling_job rj ON rj.company_id = c.company_id AND rj.normalized_job_name = '백엔드개발자'
WHERE c.company_name = '더미소프트';

INSERT INTO user_block (blocker_user_id, blocked_user_id, is_active, created_at, updated_at)
SELECT ub.id, ud.id, TRUE, NOW(), NOW()
FROM users ub
JOIN users ud ON ud.email = 'dummy.user2@whennawa.test'
WHERE ub.email = 'dummy.user1@whennawa.test'
ON DUPLICATE KEY UPDATE is_active = VALUES(is_active), updated_at = NOW();

INSERT INTO interview_review (
  company_id, user_id, report_id, rolling_report_id, recruitment_mode,
  step_name, difficulty, content, like_count, is_active, created_at, updated_at
)
SELECT
  rr.company_id,
  u.id,
  rr.report_id,
  NULL,
  rr.recruitment_mode,
  rr.current_step_name,
  'MEDIUM',
  '테스트 baseline 더미 후기',
  1,
  TRUE,
  NOW(),
  NOW()
FROM recruitment_report rr
JOIN users u ON u.email = 'dummy.user1@whennawa.test'
WHERE rr.company_name = '더미소프트' AND rr.recruitment_mode = 'REGULAR';

INSERT IGNORE INTO interview_review_like (review_id, user_id, created_at, updated_at)
SELECT ir.review_id, u.id, NOW(), NOW()
FROM interview_review ir
JOIN users u ON u.email = 'dummy.user2@whennawa.test'
WHERE ir.content = '테스트 baseline 더미 후기';
