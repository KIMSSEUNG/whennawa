/*
  Dummy data for end-to-end feature checks.
  Covers: companies, categories, channels, reports, logs, chat, board, block, interview review.
*/

/* users */
INSERT IGNORE INTO users (public_id, email, nickname, role, created_at, updated_at) VALUES
(UNHEX(REPLACE(UUID(), '-', '')), 'dummy.user1@whennawa.test', 'dummyUser#00001', 'USER', NOW(), NOW()),
(UNHEX(REPLACE(UUID(), '-', '')), 'dummy.user2@whennawa.test', 'dummyUser#00002', 'USER', NOW(), NOW()),
(UNHEX(REPLACE(UUID(), '-', '')), 'dummy.user3@whennawa.test', 'dummyUser#00003', 'USER', NOW(), NOW()),
(UNHEX(REPLACE(UUID(), '-', '')), 'dummy.user4@whennawa.test', 'dummyUser#00004', 'USER', NOW(), NOW()),
(UNHEX(REPLACE(UUID(), '-', '')), 'dummy.mod@whennawa.test', 'dummyMod#00005', 'ADMIN', NOW(), NOW());

/* companies */
INSERT IGNORE INTO company (company_name, is_active) VALUES
('더미전자', TRUE),
('더미소프트', TRUE),
('더미금융', TRUE),
('더미건설', TRUE);

/* ensure company-job-category mapping exists for seeded categories */
INSERT IGNORE INTO company_job_category (company_id, job_category_id, is_active, created_at, updated_at)
SELECT c.company_id, jc.job_category_id, TRUE, NOW(), NOW()
FROM company c
JOIN job_category jc ON jc.is_active = TRUE
WHERE c.company_name IN ('더미전자', '더미소프트', '더미금융', '더미건설');

/* recruitment channels for multiple categories/modes */
INSERT IGNORE INTO recruitment_channel (company_job_category_id, year, is_active)
SELECT cjc.company_job_category_id, 2026, TRUE
FROM company_job_category cjc
JOIN company c ON c.company_id = cjc.company_id
JOIN job_category jc ON jc.job_category_id = cjc.job_category_id
WHERE
  (c.company_name = '더미소프트' AND jc.name = 'IT인터넷')
  OR (c.company_name = '더미전자' AND jc.name = '연구개발설계')
  OR (c.company_name = '더미금융' AND jc.name = '금융')
  OR (c.company_name = '더미건설' AND jc.name = '건설');

/* attach representative steps to channels */
INSERT IGNORE INTO recruitment_step (channel_id, step_master_id)
SELECT rc.channel_id, sm.step_master_id
FROM recruitment_channel rc
JOIN company_job_category cjc ON cjc.company_job_category_id = rc.company_job_category_id
JOIN company c ON c.company_id = cjc.company_id
JOIN recruitment_step_master sm ON sm.step_name IN ('서류 지원', '1차 면접', '최종 발표')
WHERE c.company_name IN ('더미전자', '더미소프트', '더미금융', '더미건설');

/* rolling jobs */
INSERT IGNORE INTO rolling_job (company_id, job_name, normalized_job_name, is_active, created_at, updated_at)
SELECT c.company_id, '백엔드 개발자', '백엔드개발자', TRUE, NOW(), NOW()
FROM company c
WHERE c.company_name = '더미소프트'
UNION ALL
SELECT c.company_id, '리스크 관리', '리스크관리', TRUE, NOW(), NOW()
FROM company c
WHERE c.company_name = '더미금융';

/* regular + intern + rolling style records in recruitment_report */
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
  3,
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
WHERE c.company_name = '더미금융'
UNION ALL
SELECT
  c.company_id,
  jc.job_category_id,
  c.company_name,
  'ROLLING',
  'DATE_REPORTED',
  DATE('2026-02-28'),
  DATE('2026-02-14'),
  '실무진 면접',
  '최종 발표',
  NULL,
  'REJECTED',
  NOW(),
  2,
  'DISCARDED',
  NULL,
  NOW(),
  NOW()
FROM company c
JOIN job_category jc ON jc.name = '건설'
WHERE c.company_name = '더미건설'
UNION ALL
SELECT
  c.company_id,
  jc.job_category_id,
  c.company_name,
  'ROLLING',
  'NO_RESPONSE_REPORTED',
  NULL,
  NULL,
  NULL,
  '서류 발표',
  NULL,
  'MERGED',
  NOW(),
  1,
  'PENDING',
  NULL,
  NOW(),
  NOW()
FROM company c
JOIN job_category jc ON jc.name = '연구개발설계'
WHERE c.company_name = '더미전자';

/* rolling_report with DATE_REPORTED and NO_RESPONSE_REPORTED */
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
  5,
  'PROCESSED',
  NULL,
  NOW(),
  NOW()
FROM company c
JOIN rolling_job rj ON rj.company_id = c.company_id AND rj.normalized_job_name = '백엔드개발자'
JOIN job_category jc ON jc.name = 'IT인터넷'
WHERE c.company_name = '더미소프트'
UNION ALL
SELECT
  c.company_id,
  rj.rolling_job_id,
  jc.job_category_id,
  c.company_name,
  'NO_RESPONSE_REPORTED',
  NULL,
  NULL,
  NULL,
  '서류 발표',
  rj.job_name,
  'PENDING',
  NULL,
  2,
  'PENDING',
  NULL,
  NOW(),
  NOW()
FROM company c
JOIN rolling_job rj ON rj.company_id = c.company_id AND rj.normalized_job_name = '리스크관리'
JOIN job_category jc ON jc.name = '금융'
WHERE c.company_name = '더미금융';

/* logs for mode/result/source combinations */
INSERT INTO recruitment_step_log (
  company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode,
  source_type, prev_reported_date, reported_date, report_count, created_at, updated_at
)
SELECT c.company_id, c.company_name, '서류 발표', '서류 지원', 'DATE_REPORTED', 'REGULAR',
       'OFFICIAL', DATE('2026-01-10'), DATE('2026-01-20'), 3, NOW(), NOW()
FROM company c WHERE c.company_name = '더미소프트'
UNION ALL
SELECT c.company_id, c.company_name, '최종 발표', '1차 면접', 'DATE_REPORTED', 'INTERN',
       'REPORT', DATE('2026-01-30'), DATE('2026-02-07'), 1, NOW(), NOW()
FROM company c WHERE c.company_name = '더미금융'
UNION ALL
SELECT c.company_id, c.company_name, '서류 발표', NULL, 'NO_RESPONSE_REPORTED', 'ROLLING',
       'REPORT', NULL, NULL, 1, NOW(), NOW()
FROM company c WHERE c.company_name = '더미전자';

INSERT INTO rolling_step_log (
  company_id, rolling_job_id, company_name, current_step_name, prev_step_name,
  rolling_result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at
)
SELECT c.company_id, rj.rolling_job_id, c.company_name, '1차 면접 발표', '코딩 테스트',
       'DATE_REPORTED', 'ROLLING', 'OFFICIAL', DATE('2026-02-20'), DATE('2026-03-01'), 5, NOW(), NOW()
FROM company c
JOIN rolling_job rj ON rj.company_id = c.company_id AND rj.normalized_job_name = '백엔드개발자'
WHERE c.company_name = '더미소프트'
UNION ALL
SELECT c.company_id, rj.rolling_job_id, c.company_name, '서류 발표', NULL,
       'NO_RESPONSE_REPORTED', 'ROLLING', 'REPORT', NULL, NULL, 2, NOW(), NOW()
FROM company c
JOIN rolling_job rj ON rj.company_id = c.company_id AND rj.normalized_job_name = '리스크관리'
WHERE c.company_name = '더미금융';

/* chat members/messages */
INSERT IGNORE INTO chat_room_member (company_id, user_id, nickname, created_at, updated_at)
SELECT c.company_id, u.id, '더미참여자A', NOW(), NOW()
FROM company c JOIN users u ON u.email = 'dummy.user1@whennawa.test'
WHERE c.company_name = '더미소프트'
UNION ALL
SELECT c.company_id, u.id, '더미참여자B', NOW(), NOW()
FROM company c JOIN users u ON u.email = 'dummy.user2@whennawa.test'
WHERE c.company_name = '더미소프트';

INSERT INTO chat_message (company_id, member_id, sender_nickname, message, created_at, updated_at)
SELECT c.company_id, m.member_id, m.nickname, '더미 채팅 메시지 A', NOW(), NOW()
FROM company c
JOIN chat_room_member m ON m.company_id = c.company_id
JOIN users u ON u.id = m.user_id
WHERE c.company_name = '더미소프트' AND u.email = 'dummy.user1@whennawa.test'
UNION ALL
SELECT c.company_id, m.member_id, m.nickname, '더미 채팅 메시지 B', NOW(), NOW()
FROM company c
JOIN chat_room_member m ON m.company_id = c.company_id
JOIN users u ON u.id = m.user_id
WHERE c.company_name = '더미소프트' AND u.email = 'dummy.user2@whennawa.test';

/* board posts/comments/likes */
INSERT INTO board_post (company_id, user_id, title, content, is_anonymous, created_at, updated_at)
SELECT c.company_id, u.id, '더미 게시글 A', '정상 케이스용 더미 게시글입니다.', FALSE, NOW(), NOW()
FROM company c JOIN users u ON u.email = 'dummy.user1@whennawa.test'
WHERE c.company_name = '더미소프트'
UNION ALL
SELECT c.company_id, u.id, '더미 게시글 B(익명)', '익명 게시글 케이스 확인.', TRUE, NOW(), NOW()
FROM company c JOIN users u ON u.email = 'dummy.user2@whennawa.test'
WHERE c.company_name = '더미소프트';

INSERT INTO board_comment (post_id, parent_comment_id, user_id, content, is_anonymous, like_count, created_at, updated_at)
SELECT bp.post_id, NULL, u.id, '부모 댓글 더미', FALSE, 1, NOW(), NOW()
FROM board_post bp
JOIN users u ON u.email = 'dummy.user3@whennawa.test'
WHERE bp.title = '더미 게시글 A'
UNION ALL
SELECT bp.post_id, bc.comment_id, u.id, '대댓글 더미', TRUE, 0, NOW(), NOW()
FROM board_post bp
JOIN board_comment bc ON bc.post_id = bp.post_id AND bc.content = '부모 댓글 더미'
JOIN users u ON u.email = 'dummy.user4@whennawa.test'
WHERE bp.title = '더미 게시글 A';

INSERT IGNORE INTO board_comment_like (comment_id, user_id, created_at, updated_at)
SELECT bc.comment_id, u.id, NOW(), NOW()
FROM board_comment bc
JOIN users u ON u.email = 'dummy.user1@whennawa.test'
WHERE bc.content = '부모 댓글 더미';

/* notification subscription + notification */
INSERT IGNORE INTO company_notification_subscription (company_id, user_id, created_at, updated_at)
SELECT c.company_id, u.id, NOW(), NOW()
FROM company c
JOIN users u ON u.email = 'dummy.user1@whennawa.test'
WHERE c.company_name = '더미소프트';

INSERT IGNORE INTO company_notification (
  user_id, company_id, event_date, first_reporter_nickname, reporter_message,
  reporter_count, is_read, created_at, updated_at
)
SELECT u.id, c.company_id, DATE('2026-03-02'), 'dummyUser#00002', '더미 알림 테스트',
       2, FALSE, NOW(), NOW()
FROM users u
JOIN company c ON c.company_name = '더미소프트'
WHERE u.email = 'dummy.user1@whennawa.test';

/* user block: active + inactive */
INSERT INTO user_block (blocker_user_id, blocked_user_id, is_active, created_at, updated_at)
SELECT ub.id, ud.id, TRUE, NOW(), NOW()
FROM users ub
JOIN users ud ON ud.email = 'dummy.user2@whennawa.test'
WHERE ub.email = 'dummy.user1@whennawa.test'
ON DUPLICATE KEY UPDATE is_active = VALUES(is_active), updated_at = NOW();

INSERT INTO user_block (blocker_user_id, blocked_user_id, is_active, created_at, updated_at)
SELECT ub.id, ud.id, FALSE, NOW(), NOW()
FROM users ub
JOIN users ud ON ud.email = 'dummy.user4@whennawa.test'
WHERE ub.email = 'dummy.user3@whennawa.test'
ON DUPLICATE KEY UPDATE is_active = VALUES(is_active), updated_at = NOW();

/* interview review: all difficulties + modes */
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
  'EASY',
  '면접 난이도 쉬움 더미 후기',
  2,
  TRUE,
  NOW(),
  NOW()
FROM recruitment_report rr
JOIN users u ON u.email = 'dummy.user1@whennawa.test'
WHERE rr.company_name = '더미소프트' AND rr.recruitment_mode = 'REGULAR'
UNION ALL
SELECT
  rr.company_id,
  u.id,
  rr.report_id,
  NULL,
  rr.recruitment_mode,
  rr.current_step_name,
  'MEDIUM',
  '면접 난이도 보통 더미 후기',
  1,
  TRUE,
  NOW(),
  NOW()
FROM recruitment_report rr
JOIN users u ON u.email = 'dummy.user2@whennawa.test'
WHERE rr.company_name = '더미금융' AND rr.recruitment_mode = 'INTERN'
UNION ALL
SELECT
  ror.company_id,
  u.id,
  NULL,
  ror.rolling_report_id,
  'ROLLING',
  ror.current_step_name,
  'HARD',
  '면접 난이도 어려움 더미 후기',
  3,
  TRUE,
  NOW(),
  NOW()
FROM rolling_report ror
JOIN users u ON u.email = 'dummy.user3@whennawa.test'
WHERE ror.company_name = '더미소프트' AND ror.rolling_result_type = 'DATE_REPORTED';

INSERT IGNORE INTO interview_review_like (review_id, user_id, created_at, updated_at)
SELECT ir.review_id, u.id, NOW(), NOW()
FROM interview_review ir
JOIN users u ON u.email = 'dummy.user4@whennawa.test'
WHERE ir.content IN ('면접 난이도 쉬움 더미 후기', '면접 난이도 어려움 더미 후기');
