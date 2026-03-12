/*
  V4 bulk dummy data (MySQL compatibility: no CTE/window functions)
*/

SET @base_job_category_id = (
  SELECT jc.job_category_id
  FROM job_category jc
  WHERE jc.is_active = TRUE
  ORDER BY jc.job_category_id ASC
  LIMIT 1
);

/* helper numbers: 1..300 */
DROP TEMPORARY TABLE IF EXISTS tmp_num;
CREATE TEMPORARY TABLE tmp_num (
  n INT PRIMARY KEY
);

INSERT INTO tmp_num (n)
SELECT (o.n + t.n * 10 + h.n * 100) + 1 AS n
FROM (
  SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
  UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9
) o
CROSS JOIN (
  SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
  UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9
) t
CROSS JOIN (
  SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2
) h
WHERE (o.n + t.n * 10 + h.n * 100) < 300;

/* 1) bulk users (100) */
INSERT IGNORE INTO users (public_id, email, nickname, role, created_at, updated_at)
SELECT
  UNHEX(REPLACE(UUID(), '-', '')),
  CONCAT('bulk.user', LPAD(n, 3, '0'), '@whennawa.test'),
  CONCAT('bulkUser#', LPAD(n, 5, '0')),
  'USER',
  NOW(),
  NOW()
FROM tmp_num
WHERE n <= 100;

/* 2) bulk companies */
INSERT IGNORE INTO company (company_name, is_active)
SELECT CONCAT('BulkCompany', LPAD(n, 2, '0')), TRUE
FROM tmp_num
WHERE n <= 20;

/* 3) rank helpers */
DROP TEMPORARY TABLE IF EXISTS tmp_companies;
CREATE TEMPORARY TABLE tmp_companies (
  rn INT AUTO_INCREMENT PRIMARY KEY,
  company_id BIGINT NOT NULL,
  company_name VARCHAR(100) NOT NULL
);
INSERT INTO tmp_companies (company_id, company_name)
SELECT c.company_id, c.company_name
FROM company c
WHERE c.is_active = TRUE
ORDER BY c.company_id;

SET @company_cnt = (SELECT COUNT(*) FROM tmp_companies);

DROP TEMPORARY TABLE IF EXISTS tmp_users;
CREATE TEMPORARY TABLE tmp_users (
  rn INT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL
);
INSERT INTO tmp_users (user_id)
SELECT u.id
FROM users u
WHERE u.email LIKE 'bulk.user%'
ORDER BY u.id;

SET @user_cnt = (SELECT COUNT(*) FROM tmp_users);

/* 4) company-job-category mapping */
INSERT INTO company_job_category (company_id, job_category_id, is_active, created_at, updated_at)
SELECT c.company_id, @base_job_category_id, TRUE, NOW(), NOW()
FROM company c
WHERE c.is_active = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM company_job_category cjc
    WHERE cjc.company_id = c.company_id
      AND cjc.job_category_id = @base_job_category_id
      AND cjc.is_active = TRUE
  );

/* 5) rolling jobs */
INSERT INTO rolling_job (company_id, job_name, normalized_job_name, is_active, created_at, updated_at)
SELECT
  c.company_id,
  CONCAT('RollingJob_', c.company_id),
  LOWER(CONCAT('rollingjob_', c.company_id)),
  TRUE,
  NOW(),
  NOW()
FROM company c
WHERE c.is_active = TRUE
  AND NOT EXISTS (
    SELECT 1
    FROM rolling_job rj
    WHERE rj.company_id = c.company_id
      AND rj.normalized_job_name = LOWER(CONCAT('rollingjob_', c.company_id))
  );

DROP TEMPORARY TABLE IF EXISTS tmp_rolling_jobs;
CREATE TEMPORARY TABLE tmp_rolling_jobs (
  rn INT AUTO_INCREMENT PRIMARY KEY,
  rolling_job_id BIGINT NOT NULL,
  company_id BIGINT NOT NULL,
  company_name VARCHAR(100) NOT NULL,
  job_name VARCHAR(100) NOT NULL
);
INSERT INTO tmp_rolling_jobs (rolling_job_id, company_id, company_name, job_name)
SELECT rj.rolling_job_id, rj.company_id, c.company_name, rj.job_name
FROM rolling_job rj
JOIN company c ON c.company_id = rj.company_id
WHERE c.is_active = TRUE AND rj.is_active = TRUE
ORDER BY rj.rolling_job_id;

SET @rolling_job_cnt = (SELECT COUNT(*) FROM tmp_rolling_jobs);

/* 6) recruitment_report bulk (100: REGULAR/INTERN) */
INSERT INTO recruitment_report (
  company_id, job_category_id, company_name, recruitment_mode, rolling_result_type,
  reported_date, prev_reported_date, prev_step_name, current_step_name,
  other_job_name, job_review_status, job_reviewed_at, report_count, status, deleted_at, created_at, updated_at
)
SELECT
  tc.company_id,
  @base_job_category_id,
  tc.company_name,
  CASE WHEN MOD(tn.n, 2) = 0 THEN 'INTERN' ELSE 'REGULAR' END,
  NULL,
  DATE_ADD('2025-01-01', INTERVAL tn.n DAY),
  DATE_ADD('2025-01-01', INTERVAL (tn.n - 7) DAY),
  CONCAT('STEP_', MOD(tn.n, 5) + 1),
  CONCAT('STEP_', MOD(tn.n, 5) + 1, '_RESULT'),
  NULL,
  CASE MOD(tn.n, 3)
    WHEN 0 THEN 'APPROVED'
    WHEN 1 THEN 'PENDING'
    ELSE 'REJECTED'
  END,
  CASE WHEN MOD(tn.n, 3) = 1 THEN NULL ELSE NOW() END,
  MOD(tn.n, 5) + 1,
  CASE MOD(tn.n, 4)
    WHEN 0 THEN 'PENDING'
    WHEN 1 THEN 'PROCESSED'
    WHEN 2 THEN 'DISCARDED'
    ELSE 'PENDING'
  END,
  NULL,
  NOW(),
  NOW()
FROM tmp_num tn
JOIN tmp_companies tc ON tc.rn = MOD(tn.n - 1, @company_cnt) + 1
WHERE tn.n <= 100;

/* 7) rolling_report bulk (100) */
INSERT INTO rolling_report (
  company_id, rolling_job_id, job_category_id, company_name, rolling_result_type,
  reported_date, prev_reported_date, prev_step_name, current_step_name,
  other_job_name, job_review_status, job_reviewed_at, report_count, status, deleted_at, created_at, updated_at
)
SELECT
  trj.company_id,
  trj.rolling_job_id,
  @base_job_category_id,
  trj.company_name,
  CASE WHEN MOD(tn.n, 3) = 0 THEN 'NO_RESPONSE_REPORTED' ELSE 'DATE_REPORTED' END,
  CASE WHEN MOD(tn.n, 3) = 0 THEN NULL ELSE DATE_ADD('2025-06-01', INTERVAL tn.n DAY) END,
  CASE WHEN MOD(tn.n, 3) = 0 THEN NULL ELSE DATE_ADD('2025-06-01', INTERVAL (tn.n - 5) DAY) END,
  CASE WHEN MOD(tn.n, 3) = 0 THEN NULL ELSE CONCAT('R_STEP_', MOD(tn.n, 4) + 1) END,
  CONCAT('R_STEP_', MOD(tn.n, 4) + 1, '_RESULT'),
  trj.job_name,
  CASE MOD(tn.n, 3)
    WHEN 0 THEN 'PENDING'
    WHEN 1 THEN 'APPROVED'
    ELSE 'REJECTED'
  END,
  CASE WHEN MOD(tn.n, 3) = 0 THEN NULL ELSE NOW() END,
  MOD(tn.n, 4) + 1,
  CASE MOD(tn.n, 4)
    WHEN 0 THEN 'PENDING'
    WHEN 1 THEN 'PROCESSED'
    WHEN 2 THEN 'DISCARDED'
    ELSE 'PENDING'
  END,
  NULL,
  NOW(),
  NOW()
FROM tmp_num tn
JOIN tmp_rolling_jobs trj ON trj.rn = MOD(tn.n - 1, @rolling_job_cnt) + 1
WHERE tn.n <= 100;

/* 8) interview reviews regular/intern (50) */
INSERT INTO interview_review (
  company_id, user_id, report_id, rolling_report_id, recruitment_mode,
  step_name, difficulty, content, like_count, is_active, created_at, updated_at
)
SELECT
  rr.company_id,
  tu.user_id,
  rr.report_id,
  NULL,
  rr.recruitment_mode,
  COALESCE(NULLIF(rr.prev_step_name, ''), rr.current_step_name, 'INTERVIEW'),
  CASE MOD(rr.report_id, 3)
    WHEN 0 THEN 'EASY'
    WHEN 1 THEN 'MEDIUM'
    ELSE 'HARD'
  END,
  CONCAT('Bulk interview review for report #', rr.report_id),
  MOD(rr.report_id, 7),
  TRUE,
  NOW(),
  NOW()
FROM recruitment_report rr
JOIN tmp_users tu ON tu.rn = MOD(rr.report_id - 1, @user_cnt) + 1
WHERE rr.recruitment_mode IN ('REGULAR', 'INTERN')
ORDER BY rr.report_id DESC
LIMIT 50;

/* 9) interview reviews rolling (50) */
INSERT INTO interview_review (
  company_id, user_id, report_id, rolling_report_id, recruitment_mode,
  step_name, difficulty, content, like_count, is_active, created_at, updated_at
)
SELECT
  rr.company_id,
  tu.user_id,
  NULL,
  rr.rolling_report_id,
  'ROLLING',
  COALESCE(NULLIF(rr.prev_step_name, ''), rr.current_step_name, 'INTERVIEW'),
  CASE MOD(rr.rolling_report_id, 3)
    WHEN 0 THEN 'EASY'
    WHEN 1 THEN 'MEDIUM'
    ELSE 'HARD'
  END,
  CONCAT('Bulk rolling interview review #', rr.rolling_report_id),
  MOD(rr.rolling_report_id, 9),
  TRUE,
  NOW(),
  NOW()
FROM rolling_report rr
JOIN tmp_users tu ON tu.rn = MOD(rr.rolling_report_id - 1, @user_cnt) + 1
ORDER BY rr.rolling_report_id DESC
LIMIT 50;

/* 10) chat room members: first 8 users per company */
INSERT IGNORE INTO chat_room_member (company_id, user_id, nickname, created_at, updated_at)
SELECT
  tc.company_id,
  tu.user_id,
  CONCAT('chat_', LPAD(tu.user_id, 6, '0')),
  NOW(),
  NOW()
FROM tmp_companies tc
JOIN tmp_users tu ON tu.rn <= 8;

DROP TEMPORARY TABLE IF EXISTS tmp_chat_members;
CREATE TEMPORARY TABLE tmp_chat_members (
  rn INT AUTO_INCREMENT PRIMARY KEY,
  member_id BIGINT NOT NULL,
  company_id BIGINT NOT NULL,
  nickname VARCHAR(64) NOT NULL
);
INSERT INTO tmp_chat_members (member_id, company_id, nickname)
SELECT member_id, company_id, nickname
FROM chat_room_member
ORDER BY member_id;
SET @chat_member_cnt = (SELECT COUNT(*) FROM tmp_chat_members);

/* 11) chat messages (100) */
INSERT INTO chat_message (company_id, member_id, sender_nickname, message, created_at, updated_at)
SELECT
  tcm.company_id,
  tcm.member_id,
  tcm.nickname,
  CONCAT('Bulk chat message #', tn.n),
  DATE_ADD(NOW(), INTERVAL -tn.n MINUTE),
  DATE_ADD(NOW(), INTERVAL -tn.n MINUTE)
FROM tmp_num tn
JOIN tmp_chat_members tcm ON tcm.rn = MOD(tn.n - 1, @chat_member_cnt) + 1
WHERE tn.n <= 100;

/* 12) board posts company board (100 per company) */
INSERT INTO board_post (company_id, user_id, title, content, is_anonymous, created_at, updated_at)
SELECT
  tc.company_id,
  tu.user_id,
  CONCAT(tc.company_name, ' bulk post #', tn.n),
  CONCAT('Company board bulk content #', tn.n, ' for ', tc.company_name, ' board testing.'),
  CASE WHEN MOD(tn.n, 2) = 0 THEN TRUE ELSE FALSE END,
  DATE_ADD(NOW(), INTERVAL -((tc.rn - 1) * 100 + tn.n) HOUR),
  DATE_ADD(NOW(), INTERVAL -((tc.rn - 1) * 100 + tn.n) HOUR)
FROM tmp_companies tc
JOIN tmp_num tn ON tn.n <= 100
JOIN tmp_users tu ON tu.rn = MOD(((tc.rn - 1) * 100 + tn.n) - 1, @user_cnt) + 1
WHERE tn.n <= 100;

/* 12-1) career board posts (100) */
INSERT INTO career_board_post (user_id, title, content, is_anonymous, created_at, updated_at)
SELECT
  tu.user_id,
  CONCAT('Career bulk post #', tn.n),
  CONCAT('Career board bulk content #', tn.n),
  CASE WHEN MOD(tn.n, 2) = 0 THEN TRUE ELSE FALSE END,
  DATE_ADD(NOW(), INTERVAL -tn.n HOUR),
  DATE_ADD(NOW(), INTERVAL -tn.n HOUR)
FROM tmp_num tn
JOIN tmp_users tu ON tu.rn = MOD(tn.n - 1, @user_cnt) + 1
WHERE tn.n <= 100;

DROP TEMPORARY TABLE IF EXISTS tmp_posts_company;
CREATE TEMPORARY TABLE tmp_posts_company (
  rn INT AUTO_INCREMENT PRIMARY KEY,
  post_id BIGINT NOT NULL
);
INSERT INTO tmp_posts_company (post_id)
SELECT bp.post_id
FROM board_post bp
WHERE bp.title LIKE '% bulk post #%'
ORDER BY bp.post_id DESC;
SET @post_company_cnt = (SELECT COUNT(*) FROM tmp_posts_company);

DROP TEMPORARY TABLE IF EXISTS tmp_career_posts;
CREATE TEMPORARY TABLE tmp_career_posts (
  rn INT AUTO_INCREMENT PRIMARY KEY,
  post_id BIGINT NOT NULL
);
INSERT INTO tmp_career_posts (post_id)
SELECT cbp.post_id
FROM career_board_post cbp
ORDER BY cbp.post_id DESC
LIMIT 100;
SET @post_career_cnt = (SELECT COUNT(*) FROM tmp_career_posts);

/* 13) board comments company board (100 per company) */
INSERT INTO board_comment (post_id, parent_comment_id, user_id, content, is_anonymous, like_count, created_at, updated_at)
SELECT
  tpc.post_id,
  NULL,
  tu.user_id,
  CONCAT('Company bulk comment #', tpc.rn),
  CASE WHEN MOD(tn.n, 3) = 0 THEN TRUE ELSE FALSE END,
  MOD(tn.n, 5),
  DATE_ADD(NOW(), INTERVAL -tpc.rn MINUTE),
  DATE_ADD(NOW(), INTERVAL -tpc.rn MINUTE)
FROM tmp_posts_company tpc
JOIN tmp_num tn ON tn.n = MOD(tpc.rn - 1, 100) + 1
JOIN tmp_users tu ON tu.rn = MOD(tpc.rn - 1, @user_cnt) + 1;

/* 13-1) career board comments (100) */
INSERT INTO career_board_comment (post_id, parent_comment_id, user_id, content, is_anonymous, like_count, created_at, updated_at)
SELECT
  tpc.post_id,
  NULL,
  tu.user_id,
  CONCAT('Career bulk comment #', tn.n),
  CASE WHEN MOD(tn.n, 3) = 0 THEN TRUE ELSE FALSE END,
  MOD(tn.n, 5),
  DATE_ADD(NOW(), INTERVAL -tn.n MINUTE),
  DATE_ADD(NOW(), INTERVAL -tn.n MINUTE)
FROM tmp_num tn
JOIN tmp_career_posts tpc ON @post_career_cnt > 0 AND tpc.rn = MOD(tn.n - 1, @post_career_cnt) + 1
JOIN tmp_users tu ON tu.rn = MOD(tn.n - 1, @user_cnt) + 1
WHERE tn.n <= 100;

/* 14) board comment likes company board (1 per bulk comment) */
INSERT IGNORE INTO board_comment_like (comment_id, user_id, created_at, updated_at)
SELECT
  bc.comment_id,
  tu.user_id,
  NOW(),
  NOW()
FROM (
  SELECT bc.comment_id
  FROM board_comment bc
  WHERE bc.content LIKE 'Company bulk comment #%'
  ORDER BY bc.comment_id DESC
) bc
JOIN tmp_users tu ON tu.rn = MOD(bc.comment_id - 1, @user_cnt) + 1;

/* 14-1) career board comment likes (100) */
INSERT IGNORE INTO career_board_comment_like (comment_id, user_id, created_at, updated_at)
SELECT
  bc.comment_id,
  tu.user_id,
  NOW(),
  NOW()
FROM (
  SELECT cbc.comment_id
  FROM career_board_comment cbc
  ORDER BY cbc.comment_id DESC
  LIMIT 100
) bc
JOIN tmp_users tu ON tu.rn = MOD(bc.comment_id - 1, @user_cnt) + 1;

/* cleanup temp tables */
DROP TEMPORARY TABLE IF EXISTS tmp_posts_company;
DROP TEMPORARY TABLE IF EXISTS tmp_career_posts;
DROP TEMPORARY TABLE IF EXISTS tmp_chat_members;
DROP TEMPORARY TABLE IF EXISTS tmp_rolling_jobs;
DROP TEMPORARY TABLE IF EXISTS tmp_companies;
DROP TEMPORARY TABLE IF EXISTS tmp_users;
DROP TEMPORARY TABLE IF EXISTS tmp_num;

